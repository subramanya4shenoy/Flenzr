"""Add an optional requested delivery date without changing existing enquiries."""
from alembic import op
import sqlalchemy as sa

revision = "0009_enquiry_delivery_date"
down_revision = "0008_enquiries"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("enquiries", sa.Column("preferred_delivery_date", sa.Date(), nullable=True))


def downgrade():
    op.drop_column("enquiries", "preferred_delivery_date")
