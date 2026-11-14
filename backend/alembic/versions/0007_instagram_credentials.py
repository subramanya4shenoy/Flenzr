"""Store encrypted Instagram credentials separately from public profile fields."""
from alembic import op
import sqlalchemy as sa
revision = '0007_instagram_credentials'
down_revision = '0006_creator_social_links'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('creators', sa.Column('social_credentials', sa.JSON(), nullable=False, server_default=sa.text("'{}'")))


def downgrade():
    op.drop_column('creators', 'social_credentials')
