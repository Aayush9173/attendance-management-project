import hashlib
import secrets
from asyncio.windows_events import NULL
from datetime import datetime,timezone,timedelta
import os
from http import cookies
from typing import Annotated
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, APIRouter, Cookie, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from sqlalchemy import func
from sqlalchemy.orm import Session
from starlette import status
from app.schemas import TokenRequestModel
from app.dependencies import get_db
from app.dependencies import crypt_context
from app.dependencies import clear_refresh_cookie
from app.model import User, UserSession

router = APIRouter(
    tags=["auth"],
    prefix="/auth",
)

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("Configuration Error!")

ALGORITHM = os.getenv("ALGORITHM")

db_dependency = Annotated[Session,Depends(get_db)]

def authenticate_user(password: str, username: str,db):
    user = db.query(User).filter(func.lower(User.user_name) == username.lower()).first()
    if not user:
        return False
    if not crypt_context.verify(password, user.hashed_password):
        return False
    return user


def create_token(username: str, user_id: int,role:str,expiration):
    payload = {"sub": username,"id": user_id,"user_role":role}
    expiration_time = datetime.now(timezone.utc) + expiration
    payload.update({"exp": expiration_time})
    return jwt.encode(payload, key=SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: Annotated[str,Depends(oauth_bearer)], db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_name = payload.get("sub")
        user_id = payload.get("id")
        user_role = payload.get("user_role")
        user = db.query(User).filter(User.id == user_id).first()
        if user_id is None or user_name is None or user is None or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Unauthorized")
        return {"UserName":user_name,"UserId":user_id,"UserRole":user_role,"is_active":user.is_active}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Could not validate credentials")


oauth_bearer = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.post("/login")
async def login_for_access_token(response: Response,db: db_dependency,form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.password, form_data.username,db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    token = create_token(user.user_name, user.id, user.role, timedelta(seconds=20))

    raw_refresh_token = secrets.token_urlsafe(64)
    refresh_token_hash = hashlib.sha256(raw_refresh_token.encode("utf-8")).hexdigest()

    time_now = datetime.now(timezone.utc)
    expires_at= time_now + timedelta(days=7)
    absolute_expires_at = time_now+timedelta(days=30)

    user_session = UserSession(
        user_id=user.id,
        token_hash=refresh_token_hash,
        created_at=time_now,
        expires_at=expires_at,
        absolute_expires_at=absolute_expires_at,
        revoked_at=None
    )

    db.add(user_session)
    db.commit()

    response.set_cookie(
        key="refresh_token",
        value=raw_refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/auth",
        max_age=7*24*60*60
    )
    return TokenRequestModel(
        access_token = token,
        token_type = "Bearer")

@router.post("/refresh")
async def refresh_token(response: Response,db: Session = Depends(get_db), refresh_token: Annotated[str|None,Cookie()]=None):

    if refresh_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    received_token_hash= hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()

    token_exists = db.query(UserSession).filter(UserSession.token_hash == received_token_hash).first()

    if not token_exists:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    time_now = datetime.now(timezone.utc)

    if time_now >= token_exists.expires_at:
        clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    if time_now >= token_exists.absolute_expires_at:
        clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    if token_exists.revoked_at is not None:
        clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    user = db.query(User).filter(User.id == token_exists.user_id).first()

    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    new_refresh_token = secrets.token_urlsafe(64)

    new_token_hash = hashlib.sha256(new_refresh_token.encode("utf-8")).hexdigest()

    new_expires_at = min(time_now + timedelta(days=7),token_exists.absolute_expires_at)


    rows_updated = db.query(UserSession).filter(UserSession.id == token_exists.id,
                                                UserSession.token_hash == received_token_hash,
                                                UserSession.expires_at >= time_now,
                                                UserSession.absolute_expires_at>=time_now,
                                                UserSession.revoked_at.is_(None)).update({
        UserSession.token_hash:new_token_hash,
        UserSession.expires_at:new_expires_at,
    },synchronize_session=False)

    if rows_updated == 0:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )

    db.commit()

    new_access_token = create_token(user.user_name,user.id,user.role,timedelta(seconds=20))

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/auth",
        max_age=7 * 24 * 60 * 60
    )

    return TokenRequestModel(
        access_token=new_access_token,
        token_type="Bearer"
    )

@router.post("/logout")
async def logout(response: Response, refresh_token: Annotated[str|None,Cookie()]=None,db: Session = Depends(get_db)):
    if refresh_token is not None:

        token_hash = hashlib.sha256(
            refresh_token.encode("utf-8")
        ).hexdigest()

        token_exist = db.query(UserSession).filter(
            UserSession.token_hash == token_hash
        ).first()

        if token_exist and token_exist.revoked_at is None:
            token_exist.revoked_at = datetime.now(timezone.utc)
            db.commit()

    clear_refresh_cookie(response)

    return {"message": "Successfully logged out"}