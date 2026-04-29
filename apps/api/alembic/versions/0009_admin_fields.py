"""add admin fields to orders and order_status_history table

Revision ID: 0009_admin_fields
Revises: 0008_normalize_incomplete_confirmed_orders_lowercase
Create Date: 2026-04-29 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009_admin_fields"
down_revision: str | None = "0008_normalize_incomplete_confirmed_orders_lowercase"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("orders") as batch_op:
        batch_op.add_column(sa.Column("export_status", sa.String(length=20), nullable=False, server_default="pending"))
        batch_op.add_column(sa.Column("export_error", sa.Text, nullable=True))
        batch_op.add_column(sa.Column("admin_memo", sa.Text, nullable=True))

    op.create_table(
        "order_status_history",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("order_id", sa.Integer, sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("from_status", sa.String(length=30), nullable=True),
        sa.Column("to_status", sa.String(length=30), nullable=False),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("changed_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("order_status_history")
    with op.batch_alter_table("orders") as batch_op:
        batch_op.drop_column("admin_memo")
        batch_op.drop_column("export_error")
        batch_op.drop_column("export_status")
