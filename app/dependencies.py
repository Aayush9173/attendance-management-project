from fastapi.openapi.models import Response

from app.database import LocalSession
from passlib.context import CryptContext



crypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = LocalSession()
    try:
        yield db
    finally:
        db.close()


def clear_refresh_cookie(response: Response):
    response.delete_cookie(
        key="refresh_token",
        path="/auth",
        secure=False,
        httponly=True,
        samesite="lax"
    )