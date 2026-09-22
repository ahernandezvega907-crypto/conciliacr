import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./conciliacr.db")

# Render entrega la URL de Postgres con el prefijo "postgres://",
# pero SQLAlchemy 2.x requiere "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class ReconciliationJob(Base):
    __tablename__ = "reconciliation_jobs"

    id = Column(Integer, primary_key=True, index=True)
    filename_bank = Column(String)
    filename_ledger = Column(String)
    total_bank_records = Column(Integer)
    total_ledger_records = Column(Integer)
    matched_count = Column(Integer)
    unmatched_bank_count = Column(Integer)
    unmatched_ledger_count = Column(Integer)
    total_amount_matched = Column(Float)
    total_amount_discrepancy = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()