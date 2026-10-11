"""add creator social channels and bio verification

Revision ID: 0004_creator_social_and_verification
Revises: 0003_brands_and_campaigns
Create Date: 2026-10-11 15:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004_creator_social'
down_revision: Union[str, None] = '0003_brands_and_campaigns'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('creators', sa.Column('instagram_handle', sa.String(length=128), nullable=True))
    op.add_column('creators', sa.Column('instagram_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('creators', sa.Column('youtube_channel', sa.String(length=128), nullable=True))
    op.add_column('creators', sa.Column('youtube_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('creators', sa.Column('verification_code', sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column('creators', 'verification_code')
    op.drop_column('creators', 'youtube_verified')
    op.drop_column('creators', 'youtube_channel')
    op.drop_column('creators', 'instagram_verified')
    op.drop_column('creators', 'instagram_handle')
