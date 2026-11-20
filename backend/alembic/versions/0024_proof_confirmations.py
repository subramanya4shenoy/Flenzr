"""Immutable brand/client acknowledgement of exact publishing proof."""
from alembic import op
import sqlalchemy as sa
revision = '0024_proof_confirmations'
down_revision = '0023_publishing_proof'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('collaboration_proof_confirmations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('collaboration_id', sa.String(36), sa.ForeignKey('collaborations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('proof_id', sa.String(36), sa.ForeignKey('collaboration_publishing_proofs.id', ondelete='RESTRICT'), nullable=False, unique=True),
        sa.Column('reviewer_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False), sa.Column('request_hash', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('collaboration_id', 'request_id', name='uq_proof_confirmation_request'))
    op.create_index('ix_collaboration_proof_confirmations_collaboration_id', 'collaboration_proof_confirmations', ['collaboration_id'])
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('ALTER TABLE collaboration_proof_confirmations ENABLE ROW LEVEL SECURITY')
        op.execute('CREATE POLICY flenzr_proof_confirmations_api_only ON collaboration_proof_confirmations AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')
        op.execute("""CREATE FUNCTION flenzr_immutable_proof_confirmation() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN RAISE EXCEPTION 'Saved proof confirmations cannot be changed or deleted' USING ERRCODE = '55000'; END;
            $$""")
        op.execute('CREATE TRIGGER flenzr_proof_confirmation_immutable BEFORE UPDATE OR DELETE ON collaboration_proof_confirmations FOR EACH ROW EXECUTE FUNCTION flenzr_immutable_proof_confirmation()')


def downgrade():
    op.drop_table('collaboration_proof_confirmations')
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('DROP FUNCTION flenzr_immutable_proof_confirmation()')
