"""ratecards and links schema

Revision ID: 0002_ratecards_and_links
Revises: 0001_initial_schema
Create Date: 2026-10-10 22:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_ratecards_and_links'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. rate_cards table
    op.create_table(
        'rate_cards',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('creator_id', sa.String(length=36), nullable=False),
        sa.Column('platform', sa.String(length=32), nullable=False),
        sa.Column('deliverable_type', sa.String(length=32), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(length=1024), nullable=True),
        sa.Column('base_price_cents', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('turnaround_days', sa.Integer(), nullable=False, server_default='7'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['creator_id'], ['creators.id'], name=op.f('fk_rate_cards_creator_id_creators'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_rate_cards')),
    )
    op.create_index(op.f('ix_rate_cards_creator_id'), 'rate_cards', ['creator_id'], unique=False)
    op.create_index('ix_rate_cards_creator_platform', 'rate_cards', ['creator_id', 'platform'], unique=False)

    # 2. tracked_links table
    op.create_table(
        'tracked_links',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('creator_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('destination_url', sa.String(length=2048), nullable=False),
        sa.Column('short_code', sa.String(length=32), nullable=False),
        sa.Column('utm_source', sa.String(length=128), nullable=True),
        sa.Column('utm_medium', sa.String(length=128), nullable=True),
        sa.Column('utm_campaign', sa.String(length=128), nullable=True),
        sa.Column('click_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['creator_id'], ['creators.id'], name=op.f('fk_tracked_links_creator_id_creators'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_tracked_links')),
        sa.UniqueConstraint('short_code', name=op.f('uq_tracked_links_short_code')),
    )
    op.create_index(op.f('ix_tracked_links_creator_id'), 'tracked_links', ['creator_id'], unique=False)
    op.create_index(op.f('ix_tracked_links_short_code'), 'tracked_links', ['short_code'], unique=True)

    # 3. link_clicks table
    op.create_table(
        'link_clicks',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('link_id', sa.String(length=36), nullable=False),
        sa.Column('clicked_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('referrer', sa.String(length=1024), nullable=True),
        sa.Column('ip_hash', sa.String(length=64), nullable=True),
        sa.Column('country', sa.String(length=64), nullable=True),
        sa.Column('user_agent', sa.String(length=512), nullable=True),
        sa.ForeignKeyConstraint(['link_id'], ['tracked_links.id'], name=op.f('fk_link_clicks_link_id_tracked_links'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_link_clicks')),
    )
    op.create_index(op.f('ix_link_clicks_clicked_at'), 'link_clicks', ['clicked_at'], unique=False)
    op.create_index(op.f('ix_link_clicks_link_id'), 'link_clicks', ['link_id'], unique=False)


def downgrade() -> None:
    op.drop_table('link_clicks')
    op.drop_table('tracked_links')
    op.drop_table('rate_cards')
