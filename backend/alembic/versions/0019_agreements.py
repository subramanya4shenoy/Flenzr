"""Explicit proposal acceptances and one immutable shared agreement."""
from alembic import op
import sqlalchemy as sa
revision = '0019_agreements'
down_revision = '0018_proposals'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('collaboration_proposal_acceptances',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('proposal_id', sa.String(36), sa.ForeignKey('collaboration_proposal_revisions.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('proposal_id', 'user_id', name='uq_proposal_acceptance_participant'))
    op.create_index('ix_collaboration_proposal_acceptances_proposal_id', 'collaboration_proposal_acceptances', ['proposal_id'])
    op.create_table('collaboration_agreements',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('collaboration_id', sa.String(36), sa.ForeignKey('collaborations.id', ondelete='RESTRICT'), nullable=False, unique=True),
        sa.Column('proposal_id', sa.String(36), sa.ForeignKey('collaboration_proposal_revisions.id', ondelete='RESTRICT'), nullable=False, unique=True),
        sa.Column('snapshot', sa.JSON, nullable=False), sa.Column('snapshot_hash', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    if op.get_bind().dialect.name == 'postgresql':
        for table in ('collaboration_proposal_acceptances', 'collaboration_agreements'):
            op.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')
            op.execute(f'CREATE POLICY flenzr_agreements_api_only ON {table} AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')
        op.execute("""CREATE FUNCTION flenzr_immutable_agreement() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN RAISE EXCEPTION 'Saved agreements cannot be changed or deleted' USING ERRCODE = '55000'; END;
            $$""")
        op.execute('CREATE TRIGGER flenzr_agreement_immutable BEFORE UPDATE OR DELETE ON collaboration_agreements FOR EACH ROW EXECUTE FUNCTION flenzr_immutable_agreement()')


def downgrade():
    op.drop_table('collaboration_agreements')
    op.drop_table('collaboration_proposal_acceptances')
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('DROP FUNCTION flenzr_immutable_agreement()')
