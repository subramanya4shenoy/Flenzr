"""Track campaign revisions for safe draft editing."""
from alembic import op
import sqlalchemy as sa

revision = '0014_campaign_revision'
down_revision = '0013_enquiry_abuse_index'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('campaigns', sa.Column('revision', sa.Integer(), nullable=False, server_default='1'))


def downgrade():
    op.drop_column('campaigns', 'revision')
