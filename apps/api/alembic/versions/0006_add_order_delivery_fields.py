"""add order delivery fields

Revision ID: 0006_add_order_delivery_fields
Revises: 0005_normalize_order_status_values
Create Date: 2026-04-29 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0006_add_order_delivery_fields"
down_revision: str | None = "0005_normalize_order_status_values"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("orders") as batch_op:
        batch_op.add_column(sa.Column("recipient_name", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("recipient_phone", sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column("shipping_address", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("shipping_address_detail", sa.String(length=255), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("orders") as batch_op:
        batch_op.drop_column("shipping_address_detail")
        batch_op.drop_column("shipping_address")
        batch_op.drop_column("recipient_phone")
        batch_op.drop_column("recipient_name")
