"""Persist media-kit enquiries and participant response history."""
from alembic import op
import sqlalchemy as sa

revision = "0008_enquiries"
down_revision = "0007_instagram_credentials"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "enquiries",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("creator_id", sa.String(36), sa.ForeignKey("creators.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("request_id", sa.String(36), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("brand_name", sa.String(160), nullable=False),
        sa.Column("brief", sa.Text(), nullable=False),
        sa.Column("rate_card_id", sa.String(36), nullable=True),
        sa.Column("deliverable", sa.String(255), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=True),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("history", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("sender_id", "request_id"),
    )
    for column in ("creator_id", "sender_id", "status"):
        op.create_index(f"ix_enquiries_{column}", "enquiries", [column])
    if op.get_bind().dialect.name == "postgresql":
        # All access goes through the participant-scoped API, never direct PostgREST clients.
        op.execute("ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY")


def downgrade():
    op.drop_table("enquiries")
