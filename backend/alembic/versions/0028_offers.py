"""Offer visibility and private application negotiations."""
from alembic import op
import sqlalchemy as sa
revision = '0028_offers'
down_revision = '0027_collaboration_messages'
branch_labels = None
depends_on = None

def upgrade():
    # Published legacy campaigns were already public. New Offer drafts choose their audience explicitly.
    op.add_column('campaigns', sa.Column('visibility', sa.String(16), nullable=False, server_default='public'))
    op.add_column('campaign_applications', sa.Column('negotiation_revision', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('campaign_applications', sa.Column('negotiation_author', sa.String(16), nullable=False, server_default='creator'))
    op.add_column('campaign_applications', sa.Column('negotiation_history', sa.JSON(), nullable=False, server_default='[]'))

def downgrade():
    op.drop_column('campaign_applications', 'negotiation_history')
    op.drop_column('campaign_applications', 'negotiation_author')
    op.drop_column('campaign_applications', 'negotiation_revision')
    op.drop_column('campaigns', 'visibility')
