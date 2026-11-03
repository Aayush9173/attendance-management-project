
from app.database import LocalSession
from passlib.context import CryptContext



crypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = LocalSession()
    try:
        yield db
    finally:
        db.close()
