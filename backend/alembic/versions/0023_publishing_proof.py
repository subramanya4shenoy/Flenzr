"""Immutable creator-supplied publishing proof and final links."""
from alembic import op
import sqlalchemy as sa
revision = '0023_publishing_proof'
down_revision = '0022_completions'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('collaboration_publishing_proofs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('collaboration_id', sa.String(36), sa.ForeignKey('collaborations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('agreement_id', sa.String(36), sa.ForeignKey('collaboration_agreements.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('delivery_id', sa.String(36), sa.ForeignKey('collaboration_deliveries.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('review_id', sa.String(36), sa.ForeignKey('collaboration_delivery_reviews.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('creator_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('version', sa.Integer, nullable=False), sa.Column('notes', sa.Text, nullable=False), sa.Column('links', sa.JSON, nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False), sa.Column('request_hash', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('collaboration_id', 'version', name='uq_publishing_proof_version'),
        sa.UniqueConstraint('collaboration_id', 'request_id', name='uq_publishing_proof_request'))
    op.create_index('ix_collaboration_publishing_proofs_collaboration_id', 'collaboration_publishing_proofs', ['collaboration_id'])
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('ALTER TABLE collaboration_publishing_proofs ENABLE ROW LEVEL SECURITY')
        op.execute('CREATE POLICY flenzr_proofs_api_only ON collaboration_publishing_proofs AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')
        op.execute("""CREATE FUNCTION flenzr_immutable_publishing_proof() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN RAISE EXCEPTION 'Saved publishing proofs cannot be changed or deleted' USING ERRCODE = '55000'; END;
            $$""")
        op.execute('CREATE TRIGGER flenzr_publishing_proof_immutable BEFORE UPDATE OR DELETE ON collaboration_publishing_proofs FOR EACH ROW EXECUTE FUNCTION flenzr_immutable_publishing_proof()')


def downgrade():
    op.drop_table('collaboration_publishing_proofs')
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('DROP FUNCTION flenzr_immutable_publishing_proof()')
