"""revert incomplete confirmed orders

Revision ID: 0007_revert_incomplete_confirmed_orders
Revises: 0006_add_order_delivery_fields
Create Date: 2026-04-29 00:10:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0007_revert_incomplete_confirmed_orders"
down_revision: str | None = "0006_add_order_delivery_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql(
        """
        UPDATE orders
        SET status='PENDING'
        WHERE status='CONFIRMED'
          AND (
            recipient_name IS NULL OR trim(recipient_name) = ''
            OR recipient_phone IS NULL OR trim(recipient_phone) = ''
            OR shipping_address IS NULL OR trim(shipping_address) = ''
          )
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql(
        """
        UPDATE orders
        SET status='CONFIRMED'
        WHERE status='PENDING'
          AND recipient_name IS NOT NULL
          AND recipient_phone IS NOT NULL
          AND shipping_address IS NOT NULL
        """
    )
