"""Add private parent campaigns without changing existing offer IDs or participants."""
from alembic import op
import sqlalchemy as sa

revision = '0029_campaign_hierarchy'
down_revision = '0028_offers'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('marketing_campaigns',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('objective', sa.Text(), nullable=False, server_default=''),
        sa.Column('revision', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('id', 'organization_id', name='uq_marketing_campaign_owner'),
    )
    op.create_index('ix_marketing_campaigns_organization_id', 'marketing_campaigns', ['organization_id'])
    with op.batch_alter_table('campaigns') as batch:
        batch.add_column(sa.Column('parent_campaign_id', sa.String(36), nullable=True))
        batch.create_index('ix_campaigns_parent_campaign_id', ['parent_campaign_id'])
        batch.create_foreign_key('fk_offer_parent_campaign_owner', 'marketing_campaigns',
                                 ['parent_campaign_id', 'organization_id'], ['id', 'organization_id'])
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY')
        op.execute('CREATE POLICY flenzr_marketing_campaign_api_only ON marketing_campaigns AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')


def downgrade():
    with op.batch_alter_table('campaigns') as batch:
        batch.drop_constraint('fk_offer_parent_campaign_owner', type_='foreignkey')
        batch.drop_index('ix_campaigns_parent_campaign_id')
        batch.drop_column('parent_campaign_id')
    op.drop_index('ix_marketing_campaigns_organization_id', table_name='marketing_campaigns')
    op.drop_table('marketing_campaigns')
