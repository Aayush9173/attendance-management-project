import os
from fastapi import Response

from app.database import LocalSession
from passlib.context import CryptContext

crypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = LocalSession()
    try:
        yield db
    finally:
        db.close()


REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days


def get_cookie_settings() -> dict:
    """Return environment-driven cookie flags for refresh tokens."""
    environment = os.getenv("ENVIRONMENT", "development").lower()
    secure_env = os.getenv("COOKIE_SECURE")
    if secure_env is not None:
        is_secure = secure_env.lower() in ("true", "1")
    else:
        is_secure = environment == "production"

    return {
        "key": REFRESH_COOKIE_NAME,
        "httponly": True,
        "secure": is_secure,
        "samesite": os.getenv("COOKIE_SAMESITE", "lax").lower(),
        "path": os.getenv("COOKIE_PATH", "/"),
    }


def set_refresh_cookie(response: Response, raw_token: str) -> None:
    """Set the HttpOnly refresh token cookie on the response."""
    settings = get_cookie_settings()
    response.set_cookie(
        value=raw_token,
        max_age=REFRESH_COOKIE_MAX_AGE,
        **settings,
    )


def clear_refresh_cookie(response: Response) -> None:
    """Clear the refresh token cookie with matching path and security flags."""
    settings = get_cookie_settings()
    response.delete_cookie(**settings)


def get_cors_origins() -> list[str]:
    """Resolve allowed CORS origins based on the running environment."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    raw = os.getenv("CORS_ORIGINS", "")
    origins = [orig.strip() for orig in raw.split(",") if orig.strip()]

    if env == "production":
        if not origins:
            raise RuntimeError(
                "Configuration Error: CORS_ORIGINS environment variable is required in production."
            )
        return origins

    if not origins:
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://192.168.1.38:5173",
        ]
    return origins


def get_trusted_origins() -> list[str]:
    """Resolve trusted origins for CSRF validation on cookie-bearing endpoints."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    raw = os.getenv("TRUSTED_ORIGINS", "")
    origins = [orig.strip() for orig in raw.split(",") if orig.strip()]

    if env == "production":
        if not origins:
            raise RuntimeError(
                "Configuration Error: TRUSTED_ORIGINS environment variable is required in production."
            )
        return origins

    if not origins:
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://192.168.1.38:5173",
            "http://127.0.0.1:8000",
            "http://localhost:8000",
        ]
    return origins


