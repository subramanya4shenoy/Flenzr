"""Private proposal drafts and numbered shared proposal snapshots."""
from alembic import op
import sqlalchemy as sa
revision = '0018_proposals'
down_revision = '0017_collaborations'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('collaborations', sa.Column('proposal_version', sa.Integer, nullable=False, server_default='0'))
    for table in ('collaboration_proposal_drafts', 'collaboration_proposal_revisions'):
        common = [sa.Column('id', sa.String(36), primary_key=True),
                  sa.Column('collaboration_id', sa.String(36), sa.ForeignKey('collaborations.id', ondelete='RESTRICT'), nullable=False),
                  sa.Column('author_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
                  sa.Column('terms', sa.JSON, nullable=False),
                  sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
                  sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())]
        if table.endswith('drafts'):
            op.create_table(table, *common, sa.Column('revision', sa.Integer, nullable=False),
                            sa.Column('base_version', sa.Integer, nullable=False), sa.UniqueConstraint('collaboration_id', 'author_id'))
        else:
            op.create_table(table, *common, sa.Column('version', sa.Integer, nullable=False),
                            sa.Column('request_id', sa.String(36), nullable=False), sa.Column('request_hash', sa.String(64), nullable=False),
                            sa.UniqueConstraint('collaboration_id', 'version', name='uq_proposal_revision_version'), sa.UniqueConstraint('collaboration_id', 'author_id', 'request_id', name='uq_proposal_revision_request'))
        op.create_index('ix_'+table+'_collaboration_id', table, ['collaboration_id'])
        if op.get_bind().dialect.name == 'postgresql':
            op.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')
            op.execute(f'CREATE POLICY flenzr_proposals_api_only ON {table} AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')


def downgrade():
    op.drop_table('collaboration_proposal_revisions')
    op.drop_table('collaboration_proposal_drafts')
    op.drop_column('collaborations', 'proposal_version')
