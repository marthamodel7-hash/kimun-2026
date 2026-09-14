"""Baseline schema — mirrors Base.metadata (managed via init_db + autogenerate after this)."""
revision = "0001_baseline"
down_revision = None

from alembic import op  # noqa
import sqlalchemy as sa  # noqa


def upgrade():
    pass  # initial create handled by app.db.init_db; future changes autogenerate new revisions


def downgrade():
    pass
