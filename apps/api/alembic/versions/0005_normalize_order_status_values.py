"""normalize order status values

Revision ID: 0005_normalize_order_status_values
Revises: 0004_update_order_status_flow
Create Date: 2026-04-28 00:00:01.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0005_normalize_order_status_values"
down_revision: str | None = "0004_update_order_status_flow"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    updates = {
        "pending": "PENDING",
        "confirmed": "CONFIRMED",
        "processing": "PROCESSING",
        "shipped": "SHIPPED",
        "received": "RECEIVED",
        "completed": "SHIPPED",
        "cancelled": "PENDING",
        "COMPLETED": "SHIPPED",
        "CANCELLED": "PENDING",
    }
    for source, target in updates.items():
        bind.exec_driver_sql(f"UPDATE orders SET status='{target}' WHERE status='{source}'")


def downgrade() -> None:
    bind = op.get_bind()
    updates = {
        "CONFIRMED": "PENDING",
        "SHIPPED": "COMPLETED",
        "RECEIVED": "COMPLETED",
    }
    for source, target in updates.items():
        bind.exec_driver_sql(f"UPDATE orders SET status='{target}' WHERE status='{source}'")
