"""Versioned creator delivery links and notes against saved agreements."""
from alembic import op
import sqlalchemy as sa
revision = '0020_deliveries'
down_revision = '0019_agreements'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('collaborations', sa.Column('delivery_version', sa.Integer, nullable=False, server_default='0'))
    op.create_table('collaboration_deliveries',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('collaboration_id', sa.String(36), sa.ForeignKey('collaborations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('agreement_id', sa.String(36), sa.ForeignKey('collaboration_agreements.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('creator_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('version', sa.Integer, nullable=False), sa.Column('title', sa.String(160), nullable=False),
        sa.Column('notes', sa.Text, nullable=False), sa.Column('links', sa.JSON, nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False), sa.Column('request_hash', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('collaboration_id', 'version', name='uq_delivery_version'),
        sa.UniqueConstraint('collaboration_id', 'request_id', name='uq_delivery_request'))
    op.create_index('ix_collaboration_deliveries_collaboration_id', 'collaboration_deliveries', ['collaboration_id'])
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('ALTER TABLE collaboration_deliveries ENABLE ROW LEVEL SECURITY')
        op.execute('CREATE POLICY flenzr_deliveries_api_only ON collaboration_deliveries AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')
        op.execute("""CREATE FUNCTION flenzr_immutable_delivery() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN RAISE EXCEPTION 'Submitted delivery versions cannot be changed or deleted' USING ERRCODE = '55000'; END;
            $$""")
        op.execute('CREATE TRIGGER flenzr_delivery_immutable BEFORE UPDATE OR DELETE ON collaboration_deliveries FOR EACH ROW EXECUTE FUNCTION flenzr_immutable_delivery()')


def downgrade():
    op.drop_table('collaboration_deliveries')
    op.drop_column('collaborations', 'delivery_version')
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('DROP FUNCTION flenzr_immutable_delivery()')
