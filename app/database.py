import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

SQLDATABASE_URL = os.getenv("DATABASE_URL")

if not SQLDATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured in .env")

engine = create_engine(SQLDATABASE_URL)

LocalSession = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()