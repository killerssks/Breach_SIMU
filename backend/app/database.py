import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

raw_db_url = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# Fix legacy postgres:// URL format provided by Render/Heroku/Fly/Supabase for SQLAlchemy 1.4+
if raw_db_url.startswith("postgres://"):
    raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)

DATABASE_URL = raw_db_url

engine_kwargs = {
    "pool_pre_ping": True,
}

if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()


def init_db():
    # Import models here so SQLAlchemy registers all tables before create_all.
    from app.models import campaign, credential, event, user, organization  # noqa: F401

    Base.metadata.create_all(bind=engine)

    # 🟢 DYNAMIC MIGRATION: Ensure subject and template columns exist in campaigns table
    from sqlalchemy import inspect
    inspector = inspect(engine)
    try:
        columns = [col["name"] for col in inspector.get_columns("campaigns")]
        with engine.begin() as conn:
            if "subject" not in columns:
                conn.execute(text("ALTER TABLE campaigns ADD COLUMN subject VARCHAR"))
                print("[*] Database Migration: Added 'subject' column to 'campaigns' table.")
            if "template" not in columns:
                conn.execute(text("ALTER TABLE campaigns ADD COLUMN template VARCHAR"))
                print("[*] Database Migration: Added 'template' column to 'campaigns' table.")
    except Exception as e:
        print(f"[-] Database migration warning: {e}")

