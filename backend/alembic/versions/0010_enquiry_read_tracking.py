"""Track each participant's last viewed enquiry revision."""
from alembic import op
import sqlalchemy as sa

revision = "0010_enquiry_read_tracking"
down_revision = "0009_enquiry_delivery_date"
branch_labels = None
depends_on = None


def upgrade():
    for column in ("creator_read_revision", "sender_read_revision"):
        op.add_column("enquiries", sa.Column(column, sa.Integer(), nullable=False, server_default="0"))
    # Historical requests predate read tracking: avoid inventing a backlog of alerts.
    op.execute("UPDATE enquiries SET creator_read_revision = revision, sender_read_revision = revision")


def downgrade():
    op.drop_column("enquiries", "sender_read_revision")
    op.drop_column("enquiries", "creator_read_revision")
