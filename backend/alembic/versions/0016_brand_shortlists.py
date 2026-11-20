"""Private brand shortlist groups and creator memberships."""
from alembic import op
import sqlalchemy as sa
revision='0016_brand_shortlists'
down_revision='0015_campaign_api_privacy'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('brand_shortlists',sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('organization_id',sa.String(36),sa.ForeignKey('organizations.id',ondelete='CASCADE'),nullable=False),
        sa.Column('name',sa.String(80),nullable=False),sa.Column('normalized_name',sa.String(255),nullable=False),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False,server_default=sa.func.now()),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False,server_default=sa.func.now()))
    op.create_index('ix_brand_shortlists_organization_id','brand_shortlists',['organization_id'])
    op.create_index('ix_brand_shortlists_org_name','brand_shortlists',['organization_id','normalized_name'],unique=True)
    op.create_table('brand_shortlist_members',sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('shortlist_id',sa.String(36),sa.ForeignKey('brand_shortlists.id',ondelete='CASCADE'),nullable=False),
        sa.Column('creator_id',sa.String(36),sa.ForeignKey('creators.id',ondelete='CASCADE'),nullable=False),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False,server_default=sa.func.now()),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False,server_default=sa.func.now()))
    op.create_index('ix_brand_shortlist_members_shortlist_id','brand_shortlist_members',['shortlist_id'])
    op.create_index('ix_brand_shortlist_members_creator_id','brand_shortlist_members',['creator_id'])
    op.create_index('ix_brand_shortlist_members_unique','brand_shortlist_members',['shortlist_id','creator_id'],unique=True)
    if op.get_bind().dialect.name=='postgresql':
        for table in ('brand_shortlists','brand_shortlist_members'):
            op.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')
            op.execute(f'CREATE POLICY flenzr_shortlists_api_only ON {table} AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')

def downgrade():
    op.drop_table('brand_shortlist_members')
    op.drop_table('brand_shortlists')
