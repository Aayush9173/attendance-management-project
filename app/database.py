import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()


def normalize_database_url(url: str) -> str:
    """Normalize PostgreSQL database URLs to use the Psycopg 3 dialect prefix."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and not url.startswith("postgresql+psycopg://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


raw_database_url = os.getenv("DATABASE_URL")

if not raw_database_url:
    raise RuntimeError("DATABASE_URL environment variable is not configured.")

SQLDATABASE_URL = normalize_database_url(raw_database_url)

engine_kwargs = {
    "pool_pre_ping": True,
    "pool_recycle": 300,
}

if not SQLDATABASE_URL.startswith("sqlite"):
    engine_kwargs["pool_size"] = int(os.getenv("DB_POOL_SIZE", "5"))
    engine_kwargs["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW", "10"))

engine = create_engine(SQLDATABASE_URL, **engine_kwargs)

LocalSession = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()
