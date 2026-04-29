"""remove mood_summary from dream entries

Revision ID: 0003_remove_dream_entry_mood_summary
Revises: 0002_remove_dream_entry_memo
Create Date: 2026-04-28 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0003_remove_dream_entry_mood_summary"
down_revision: str | None = "0002_remove_dream_entry_memo"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("dream_entries")}
    if "mood_summary" not in columns:
        return

    bind.exec_driver_sql("PRAGMA foreign_keys=OFF")
    try:
        with op.batch_alter_table("dream_entries") as batch_op:
            batch_op.drop_column("mood_summary")
    finally:
        bind.exec_driver_sql("PRAGMA foreign_keys=ON")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("dream_entries")}
    if "mood_summary" in columns:
        return

    bind.exec_driver_sql("PRAGMA foreign_keys=OFF")
    try:
        with op.batch_alter_table("dream_entries") as batch_op:
            batch_op.add_column(sa.Column("mood_summary", sa.String(length=500), nullable=True))
    finally:
        bind.exec_driver_sql("PRAGMA foreign_keys=ON")
