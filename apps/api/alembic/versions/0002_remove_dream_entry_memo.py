"""remove memo from dream entries

Revision ID: 0002_remove_dream_entry_memo
Revises: 0001_initial
Create Date: 2026-04-26 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0002_remove_dream_entry_memo"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql("PRAGMA foreign_keys=OFF")
    try:
        with op.batch_alter_table("dream_entries") as batch_op:
            batch_op.drop_column("memo")
    finally:
        bind.exec_driver_sql("PRAGMA foreign_keys=ON")


def downgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql("PRAGMA foreign_keys=OFF")
    try:
        with op.batch_alter_table("dream_entries") as batch_op:
            batch_op.add_column(sa.Column("memo", sa.Text(), nullable=True))
    finally:
        bind.exec_driver_sql("PRAGMA foreign_keys=ON")
