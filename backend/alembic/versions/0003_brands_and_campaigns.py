"""brands and campaigns schema

Revision ID: 0003_brands_and_campaigns
Revises: 0002_ratecards_and_links
Create Date: 2026-10-11 00:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003_brands_and_campaigns'
down_revision: Union[str, None] = '0002_ratecards_and_links'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. organizations
    op.create_table(
        'organizations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=64), nullable=False),
        sa.Column('logo_url', sa.String(length=1024), nullable=True),
        sa.Column('billing_email', sa.String(length=255), nullable=False),
        sa.Column('billing_status', sa.String(length=32), nullable=False, server_default='active'),
        sa.Column('owner_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], name=op.f('fk_organizations_owner_id_users'), ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_organizations')),
        sa.UniqueConstraint('slug', name=op.f('uq_organizations_slug')),
    )
    op.create_index(op.f('ix_organizations_owner_id'), 'organizations', ['owner_id'], unique=False)
    op.create_index(op.f('ix_organizations_slug'), 'organizations', ['slug'], unique=True)

    # 2. brand_profiles
    op.create_table(
        'brand_profiles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('organization_id', sa.String(length=36), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=False),
        sa.Column('industry', sa.String(length=128), nullable=True),
        sa.Column('website', sa.String(length=1024), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_brand_profiles_organization_id_organizations'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_brand_profiles')),
        sa.UniqueConstraint('organization_id', name=op.f('uq_brand_profiles_organization_id')),
    )
    op.create_index(op.f('ix_brand_profiles_organization_id'), 'brand_profiles', ['organization_id'], unique=True)

    # 3. campaigns
    op.create_table(
        'campaigns',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('organization_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('brief', sa.Text(), nullable=False),
        sa.Column('target_niche', sa.String(length=128), nullable=True),
        sa.Column('deliverable_summary', sa.String(length=512), nullable=True),
        sa.Column('budget_total_cents', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='draft'),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_campaigns_organization_id_organizations'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_campaigns')),
    )
    op.create_index(op.f('ix_campaigns_organization_id'), 'campaigns', ['organization_id'], unique=False)
    op.create_index(op.f('ix_campaigns_status'), 'campaigns', ['status'], unique=False)

    # 4. campaign_applications
    op.create_table(
        'campaign_applications',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('campaign_id', sa.String(length=36), nullable=False),
        sa.Column('creator_id', sa.String(length=36), nullable=False),
        sa.Column('pitch_message', sa.Text(), nullable=True),
        sa.Column('proposed_rate_cents', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], name=op.f('fk_campaign_applications_campaign_id_campaigns'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['creator_id'], ['creators.id'], name=op.f('fk_campaign_applications_creator_id_creators'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_campaign_applications')),
    )
    op.create_index(op.f('ix_campaign_applications_campaign_id'), 'campaign_applications', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_campaign_applications_creator_id'), 'campaign_applications', ['creator_id'], unique=False)
    op.create_index('ix_campaign_applications_unique', 'campaign_applications', ['campaign_id', 'creator_id'], unique=True)

    # 5. campaign_invitations
    op.create_table(
        'campaign_invitations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('campaign_id', sa.String(length=36), nullable=False),
        sa.Column('creator_id', sa.String(length=36), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('offered_rate_cents', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='invited'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], name=op.f('fk_campaign_invitations_campaign_id_campaigns'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['creator_id'], ['creators.id'], name=op.f('fk_campaign_invitations_creator_id_creators'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_campaign_invitations')),
    )
    op.create_index(op.f('ix_campaign_invitations_campaign_id'), 'campaign_invitations', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_campaign_invitations_creator_id'), 'campaign_invitations', ['creator_id'], unique=False)
    op.create_index('ix_campaign_invitations_unique', 'campaign_invitations', ['campaign_id', 'creator_id'], unique=True)


def downgrade() -> None:
    op.drop_table('campaign_invitations')
    op.drop_table('campaign_applications')
    op.drop_table('campaigns')
    op.drop_table('brand_profiles')
    op.drop_table('organizations')
