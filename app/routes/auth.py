from datetime import datetime,timezone,timedelta
import os
from typing import Annotated
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, APIRouter
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from sqlalchemy import func
from sqlalchemy.orm import Session
from starlette import status
from app.schemas import TokenRequestModel
from app.dependencies import get_db
from app.dependencies import crypt_context

from app.model import User

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
async def login_for_access_token(db: db_dependency,form_data: OAuth2PasswordRequestForm = Depends()):
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
    token = create_token(user.user_name, user.id, user.role, timedelta(minutes=20))
    return TokenRequestModel(
        access_token = token,
        token_type = "Bearer")