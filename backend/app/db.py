from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from app.core_config import settings
from app.models import Base

is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    **({} if is_sqlite else {"pool_size": 5, "max_overflow": 10}),
)
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


def _add_missing_columns(table_name: str, sa_table):
    """Generic: add any columns defined in the model but missing from the DB table."""
    insp = inspect(engine)
    try:
        existing_cols = {c["name"] for c in insp.get_columns(table_name)}
    except Exception:
        return  # table doesn't exist yet; create_all handles it
    for col in sa_table.columns:
        if col.name not in existing_cols:
            col_type = col.type.compile(engine.dialect)
            nullable = "NULL" if col.nullable else "NOT NULL DEFAULT ''"
            if col.server_default is not None:
                # Table already has a server default in the model; skip manual default
                ddl = f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type}"
            elif col.default and hasattr(col.default, 'arg'):
                default_val = col.default.arg
                if isinstance(default_val, bool):
                    pg_default = "TRUE" if default_val else "FALSE"
                elif isinstance(default_val, (int, float)):
                    pg_default = str(default_val)
                elif isinstance(default_val, str):
                    pg_default = f"'{default_val}'"
                else:
                    pg_default = "''"
                if col.nullable:
                    ddl = f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type} DEFAULT {pg_default} NULL"
                else:
                    ddl = f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type} DEFAULT {pg_default}"
            else:
                if col.nullable:
                    ddl = f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type} NULL"
                else:
                    ddl = f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type} DEFAULT ''"
            try:
                with engine.begin() as conn:
                    conn.execute(text(ddl))
            except Exception:
                pass  # column already exists or other transient error


def ensure_schema():
    """Idempotent lightweight migration — works for both SQLite and PostgreSQL."""
    from sqlalchemy import inspect as _insp
    insp = _insp(engine)
    tables = set(insp.get_table_names())

    # --- Create any missing tables ---
    Base.metadata.create_all(bind=engine)

    # --- Add missing columns to existing tables ---
    for table_name, sa_table in Base.metadata.tables.items():
        if table_name in tables:
            _add_missing_columns(table_name, sa_table)

    # --- SQLite-specific: re-check and fix columns with raw ALTER TABLE ---
    if not is_sqlite:
        return
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
    if "users" in tables:
        cols = {c["name"] for c in insp.get_columns("users")}
        if "reference_number" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN reference_number VARCHAR(60) DEFAULT ''"))
    if "incidents" in tables:
        cols = {c["name"] for c in insp.get_columns("incidents")}
        if "description" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE incidents ADD COLUMN description TEXT DEFAULT ''"))
        if "created_at" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE incidents ADD COLUMN created_at DATETIME"))
    if "departments" in tables:
        cols = {c["name"] for c in insp.get_columns("departments")}
        if "code" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE departments ADD COLUMN code VARCHAR(10) DEFAULT ''"))
