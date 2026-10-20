"""Persist additional creator social accounts alongside Instagram and YouTube."""
from alembic import op
import sqlalchemy as sa

revision = '0006_creator_social_links'
down_revision = '0005_unrated_creators'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('creators', sa.Column('social_links', sa.JSON(), nullable=False, server_default=sa.text("'{}'")))


def downgrade():
    op.drop_column('creators', 'social_links')
