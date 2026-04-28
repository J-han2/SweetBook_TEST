"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-23 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "book_drafts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("subtitle", sa.String(length=200), nullable=True),
        sa.Column("cover_phrase", sa.String(length=255), nullable=True),
        sa.Column("cover_theme", sa.String(length=100), nullable=True),
        sa.Column("status", sa.Enum("draft", "finalized", name="bookdraftstatus", native_enum=False), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "dream_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("dream_date", sa.Date(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("memo", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("representative_image_url", sa.String(length=500), nullable=True),
        sa.Column("uploaded_image_url", sa.String(length=500), nullable=True),
        sa.Column("is_seed", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("category", sa.Enum("emotion", "event", "symbol", "relation", "custom", name="tagcategory", native_enum=False), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "book_draft_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("book_draft_id", sa.Integer(), nullable=False),
        sa.Column("dream_entry_id", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["book_draft_id"], ["book_drafts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["dream_entry_id"], ["dream_entries.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("book_draft_id", "dream_entry_id", name="uq_book_draft_entry"),
    )
    op.create_table(
        "dream_entry_tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("dream_entry_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["dream_entry_id"], ["dream_entries.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dream_entry_id", "tag_id", name="uq_dream_entry_tag"),
    )
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("book_draft_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.Enum("pending", "processing", "completed", "cancelled", name="orderstatus", native_enum=False), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("export_version", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["book_draft_id"], ["book_drafts.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("orders")
    op.drop_table("dream_entry_tags")
    op.drop_table("book_draft_items")
    op.drop_table("tags")
    op.drop_table("dream_entries")
    op.drop_table("book_drafts")
