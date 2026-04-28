"""update order status flow

Revision ID: 0004_update_order_status_flow
Revises: 0003_remove_dream_entry_mood_summary
Create Date: 2026-04-28 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0004_update_order_status_flow"
down_revision: str | None = "0003_remove_dream_entry_mood_summary"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

old_status_enum = sa.Enum("PENDING", "PROCESSING", "COMPLETED", "CANCELLED", name="orderstatus", native_enum=False)
new_status_enum = sa.Enum("PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "RECEIVED", name="orderstatus", native_enum=False)


def upgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql("PRAGMA foreign_keys=OFF")
    try:
        bind.exec_driver_sql("UPDATE orders SET status='SHIPPED' WHERE status IN ('COMPLETED', 'completed')")
        bind.exec_driver_sql("UPDATE orders SET status='PENDING' WHERE status IN ('CANCELLED', 'cancelled')")

        with op.batch_alter_table("orders") as batch_op:
            batch_op.alter_column(
                "status",
                existing_type=old_status_enum,
                type_=new_status_enum,
                existing_nullable=False,
            )
    finally:
        bind.exec_driver_sql("PRAGMA foreign_keys=ON")


def downgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql("PRAGMA foreign_keys=OFF")
    try:
        bind.exec_driver_sql("UPDATE orders SET status='COMPLETED' WHERE status IN ('SHIPPED', 'shipped')")
        bind.exec_driver_sql("UPDATE orders SET status='COMPLETED' WHERE status IN ('RECEIVED', 'received')")
        bind.exec_driver_sql("UPDATE orders SET status='CANCELLED' WHERE status IN ('CONFIRMED', 'confirmed')")

        with op.batch_alter_table("orders") as batch_op:
            batch_op.alter_column(
                "status",
                existing_type=new_status_enum,
                type_=old_status_enum,
                existing_nullable=False,
            )
    finally:
        bind.exec_driver_sql("PRAGMA foreign_keys=ON")
