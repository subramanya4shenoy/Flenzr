"""Participant-owned shared collaboration records from accepted sources."""
from alembic import op
import sqlalchemy as sa
revision = '0017_collaborations'
down_revision = '0016_brand_shortlists'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('collaborations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('brand_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('creator_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('application_id', sa.String(36), sa.ForeignKey('campaign_applications.id', ondelete='RESTRICT'), unique=True),
        sa.Column('invitation_id', sa.String(36), sa.ForeignKey('campaign_invitations.id', ondelete='RESTRICT'), unique=True),
        sa.Column('enquiry_id', sa.String(36), sa.ForeignKey('enquiries.id', ondelete='RESTRICT'), unique=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('brand_name', sa.String(255), nullable=False),
        sa.Column('creator_name', sa.String(255), nullable=False),
        sa.Column('brief', sa.Text, nullable=False),
        sa.Column('deliverable', sa.Text, nullable=False),
        sa.Column('quoted_amount_cents', sa.Integer),
        sa.Column('currency', sa.String(3), nullable=False),
        sa.Column('requested_delivery_date', sa.Date),
        sa.Column('status', sa.String(24), nullable=False, server_default='discussion'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint('(CASE WHEN application_id IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN invitation_id IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN enquiry_id IS NOT NULL THEN 1 ELSE 0 END) = 1', name='ck_collaboration_one_source'))
    op.create_index('ix_collaborations_brand_user_id', 'collaborations', ['brand_user_id'])
    op.create_index('ix_collaborations_creator_user_id', 'collaborations', ['creator_user_id'])
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY')
        op.execute('CREATE POLICY flenzr_collaborations_api_only ON collaborations AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')


def downgrade():
    op.drop_table('collaborations')
