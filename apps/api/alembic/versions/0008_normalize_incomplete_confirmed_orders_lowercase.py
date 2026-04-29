"""normalize incomplete confirmed orders lowercase

Revision ID: 0008_normalize_incomplete_confirmed_orders_lowercase
Revises: 0007_revert_incomplete_confirmed_orders
Create Date: 2026-04-29 00:20:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0008_normalize_incomplete_confirmed_orders_lowercase"
down_revision: str | None = "0007_revert_incomplete_confirmed_orders"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql(
        """
        UPDATE orders
        SET status='pending'
        WHERE status='confirmed'
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
        SET status='confirmed'
        WHERE status='pending'
          AND recipient_name IS NOT NULL
          AND trim(recipient_name) <> ''
          AND recipient_phone IS NOT NULL
          AND trim(recipient_phone) <> ''
          AND shipping_address IS NOT NULL
          AND trim(shipping_address) <> ''
        """
    )
