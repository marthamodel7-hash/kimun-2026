from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core_config import settings
from app.models import Base

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    ensure_schema()


def ensure_schema():
    """Idempotent lightweight migration for SQLite dev DBs (Alembic owns Postgres)."""
    if not settings.DATABASE_URL.startswith("sqlite"):
        return
    from sqlalchemy import inspect, text
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    if "tasks" in tables:
        cols = {c["name"] for c in insp.get_columns("tasks")}
        if "recurrence" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE tasks ADD COLUMN recurrence VARCHAR(20) DEFAULT ''"))
    if "delegates" in tables:
        cols = {c["name"] for c in insp.get_columns("delegates")}
        with engine.begin() as conn:
            if "checkin_code" not in cols:
                conn.execute(text("ALTER TABLE delegates ADD COLUMN checkin_code VARCHAR(40) DEFAULT ''"))
            if "badge_url" not in cols:
                conn.execute(text("ALTER TABLE delegates ADD COLUMN badge_url VARCHAR(500) DEFAULT ''"))
            if "group_id" not in cols:
                conn.execute(text("ALTER TABLE delegates ADD COLUMN group_id INTEGER"))
    if "committees" in tables:
        cols = {c["name"] for c in insp.get_columns("committees")}
        if "capacity" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE committees ADD COLUMN capacity INTEGER DEFAULT 40"))
    # --- public registration portal columns ---
    if "delegates" in tables:
        cols = {c["name"] for c in insp.get_columns("delegates")}
        with engine.begin() as conn:
            for col, typ, default in [
                ("registration_token", "VARCHAR(100)", "''"),
                ("email_verified", "BOOLEAN", "0"),
                ("registration_completed_at", "DATETIME", None),
                ("fee_amount", "REAL", "0"),
                ("payment_reference", "VARCHAR(200)", "''"),
                ("payment_screenshot_url", "VARCHAR(500)", "''"),
                ("photo_url", "VARCHAR(500)", "''"),
                ("experience_level", "VARCHAR(30)", "'first_timer'"),
                ("emergency_contact_name", "VARCHAR(120)", "''"),
                ("emergency_contact_phone", "VARCHAR(40)", "''"),
                ("dietary_restrictions", "VARCHAR(200)", "''"),
                ("tshirt_size", "VARCHAR(10)", "''"),
                ("registration_type", "VARCHAR(20)", "'individual'"),
                ("committee_preferences", "VARCHAR(500)", "''"),
            ]:
                if col not in cols:
                    clause = f"ALTER TABLE delegates ADD COLUMN {col} {typ} DEFAULT {default}" if default else f"ALTER TABLE delegates ADD COLUMN {col} {typ}"
                    conn.execute(text(clause))
    # --- volunteer recruitment columns ---
    if "users" in tables:
        cols = {c["name"] for c in insp.get_columns("users")}
        if "reference_number" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN reference_number VARCHAR(60) DEFAULT ''"))
    # --- incident description column ---
    if "incidents" in tables:
        cols = {c["name"] for c in insp.get_columns("incidents")}
        if "description" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE incidents ADD COLUMN description TEXT DEFAULT ''"))
        if "created_at" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE incidents ADD COLUMN created_at DATETIME"))
    # --- department code column ---
    if "departments" in tables:
        cols = {c["name"] for c in insp.get_columns("departments")}
        if "code" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE departments ADD COLUMN code VARCHAR(10) DEFAULT ''"))
