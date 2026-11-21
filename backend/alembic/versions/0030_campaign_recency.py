"""Remember the brand's most recently opened campaigns."""
from alembic import op
import sqlalchemy as sa

revision = '0030_campaign_recency'
down_revision = '0029_campaign_hierarchy'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('marketing_campaigns', sa.Column('last_opened_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('marketing_campaigns', 'last_opened_at')
