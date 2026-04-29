"""simplify dream images and remove export status fields

Revision ID: 0010_simplify_images_and_remove_export_status
Revises: 0009_admin_fields
Create Date: 2026-04-29 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision: str = "0010_simplify_images_and_remove_export_status"
down_revision: str | None = "0009_admin_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    dream_columns = {column["name"] for column in inspector.get_columns("dream_entries")}
    order_columns = {column["name"] for column in inspector.get_columns("orders")}
    bind.exec_driver_sql("PRAGMA foreign_keys=OFF")

    try:
        if "image_url" not in dream_columns:
            with op.batch_alter_table("dream_entries", schema=None) as batch_op:
                batch_op.add_column(sa.Column("image_url", sa.String(length=500), nullable=True))
            dream_columns.add("image_url")

        if "uploaded_image_url" in dream_columns and "representative_image_url" in dream_columns:
            op.execute(
                """
                UPDATE dream_entries
                SET image_url = COALESCE(NULLIF(image_url, ''), uploaded_image_url, representative_image_url)
                """
            )
        elif "uploaded_image_url" in dream_columns:
            op.execute(
                """
                UPDATE dream_entries
                SET image_url = COALESCE(NULLIF(image_url, ''), uploaded_image_url)
                """
            )
        elif "representative_image_url" in dream_columns:
            op.execute(
                """
                UPDATE dream_entries
                SET image_url = COALESCE(NULLIF(image_url, ''), representative_image_url)
                """
            )

        if "representative_image_url" in dream_columns or "uploaded_image_url" in dream_columns:
            with op.batch_alter_table("dream_entries", schema=None) as batch_op:
                if "representative_image_url" in dream_columns:
                    batch_op.drop_column("representative_image_url")
                if "uploaded_image_url" in dream_columns:
                    batch_op.drop_column("uploaded_image_url")

        if "export_status" in order_columns or "export_error" in order_columns:
            with op.batch_alter_table("orders", schema=None) as batch_op:
                if "export_status" in order_columns:
                    batch_op.drop_column("export_status")
                if "export_error" in order_columns:
                    batch_op.drop_column("export_error")
    finally:
        bind.exec_driver_sql("PRAGMA foreign_keys=ON")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    dream_columns = {column["name"] for column in inspector.get_columns("dream_entries")}
    order_columns = {column["name"] for column in inspector.get_columns("orders")}
    bind.exec_driver_sql("PRAGMA foreign_keys=OFF")

    try:
        if "export_error" not in order_columns or "export_status" not in order_columns:
            with op.batch_alter_table("orders", schema=None) as batch_op:
                if "export_error" not in order_columns:
                    batch_op.add_column(sa.Column("export_error", sa.Text(), nullable=True))
                if "export_status" not in order_columns:
                    batch_op.add_column(
                        sa.Column("export_status", sa.String(length=20), nullable=False, server_default="pending")
                    )

        if "uploaded_image_url" not in dream_columns or "representative_image_url" not in dream_columns:
            with op.batch_alter_table("dream_entries", schema=None) as batch_op:
                if "uploaded_image_url" not in dream_columns:
                    batch_op.add_column(sa.Column("uploaded_image_url", sa.String(length=500), nullable=True))
                if "representative_image_url" not in dream_columns:
                    batch_op.add_column(sa.Column("representative_image_url", sa.String(length=500), nullable=True))

        if "image_url" in dream_columns:
            op.execute(
                """
                UPDATE dream_entries
                SET representative_image_url = image_url,
                    uploaded_image_url = CASE
                        WHEN image_url LIKE '/media/uploads/%' THEN image_url
                        ELSE NULL
                    END
                """
            )

            with op.batch_alter_table("dream_entries", schema=None) as batch_op:
                batch_op.drop_column("image_url")
    finally:
        bind.exec_driver_sql("PRAGMA foreign_keys=ON")
