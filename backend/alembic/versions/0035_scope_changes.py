"""Immutable scope requests/decisions and versioned shared agreements."""
from alembic import op
import sqlalchemy as sa

revision = '0035_scope_changes'
down_revision = '0034_collaboration_notifications'
branch_labels = None
depends_on = None


def timestamps():
    return [sa.Column(name, sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
            for name in ('created_at', 'updated_at')]


def upgrade():
    op.create_table('collaboration_scope_changes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('collaboration_id', sa.String(36), sa.ForeignKey('collaborations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('base_agreement_id', sa.String(36), sa.ForeignKey('collaboration_agreements.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('author_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False), sa.Column('terms', sa.JSON(), nullable=False),
        sa.Column('reason', sa.String(1000), nullable=False), sa.Column('work_state_hash', sa.String(64), nullable=False),
        sa.Column('delivery_version', sa.Integer(), nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False), sa.Column('request_hash', sa.String(64), nullable=False),
        *timestamps(),
        sa.UniqueConstraint('collaboration_id','version',name='uq_scope_change_version'),
        sa.UniqueConstraint('collaboration_id','author_id','request_id',name='uq_scope_change_request'),
        sa.CheckConstraint('version >= 1',name='scope_version_positive'))
    op.create_table('collaboration_scope_decisions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('collaboration_id', sa.String(36), sa.ForeignKey('collaborations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('scope_change_id', sa.String(36), sa.ForeignKey('collaboration_scope_changes.id', ondelete='RESTRICT'), nullable=False, unique=True),
        sa.Column('actor_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('action', sa.String(12), nullable=False), sa.Column('note', sa.String(1000), nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False), sa.Column('request_hash', sa.String(64), nullable=False),
        *timestamps(),
        sa.UniqueConstraint('collaboration_id','actor_id','request_id',name='uq_scope_decision_request'),
        sa.CheckConstraint("action IN ('accept','decline','withdraw')",name='scope_decision_action'))
    for table in ('collaboration_scope_changes','collaboration_scope_decisions'):
        op.create_index('ix_'+table+'_collaboration_id', table, ['collaboration_id'])
    old_unique = next(c['name'] for c in sa.inspect(op.get_bind()).get_unique_constraints('collaboration_agreements')
                      if c['column_names']==['collaboration_id'])
    with op.batch_alter_table('collaboration_agreements') as batch:
        batch.drop_constraint(old_unique,type_='unique')
        batch.add_column(sa.Column('revision',sa.Integer(),nullable=False,server_default='1'))
        batch.add_column(sa.Column('scope_change_id',sa.String(36),nullable=True))
        batch.alter_column('proposal_id',existing_type=sa.String(36),nullable=True)
        batch.create_foreign_key('fk_agreement_scope_change','collaboration_scope_changes',['scope_change_id'],['id'],ondelete='RESTRICT')
        batch.create_unique_constraint('uq_agreement_revision',['collaboration_id','revision'])
        batch.create_unique_constraint('uq_collaboration_agreements_scope_change_id',['scope_change_id'])
        batch.create_index('ix_collaboration_agreements_collaboration_id',['collaboration_id'])
        batch.create_check_constraint('agreement_revision_positive','revision >= 1')
        batch.create_check_constraint('agreement_origin', '(revision = 1 AND scope_change_id IS NULL AND proposal_id IS NOT NULL) OR (revision > 1 AND scope_change_id IS NOT NULL AND proposal_id IS NULL)')
    if op.get_bind().dialect.name=='postgresql':
        op.execute("""CREATE FUNCTION flenzr_immutable_scope() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
            BEGIN RAISE EXCEPTION 'Saved scope requests and decisions cannot be changed or deleted' USING ERRCODE='55000'; END; $$""")
        for table in ('collaboration_scope_changes','collaboration_scope_decisions'):
            op.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')
            op.execute(f'CREATE POLICY flenzr_scope_api_only ON {table} AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')
            op.execute(f'CREATE TRIGGER flenzr_scope_immutable BEFORE UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION flenzr_immutable_scope()')


def downgrade():
    if op.get_bind().execute(sa.text('SELECT count(*) FROM collaboration_agreements WHERE revision > 1')).scalar():
        raise RuntimeError('Accepted scope changes exist. Keep compatible code or restore a reviewed backup; immutable agreement history will not be deleted.')
    if op.get_bind().execute(sa.text('SELECT count(*) FROM collaboration_scope_changes')).scalar():
        raise RuntimeError('Saved scope requests exist. Keep compatible code or restore a reviewed backup; scope history will not be deleted.')
    with op.batch_alter_table('collaboration_agreements') as batch:
        batch.drop_constraint(op.f('ck_collaboration_agreements_agreement_origin'),type_='check')
        batch.drop_constraint(op.f('ck_collaboration_agreements_agreement_revision_positive'),type_='check')
        batch.drop_constraint('uq_agreement_revision',type_='unique')
        batch.drop_constraint('uq_collaboration_agreements_scope_change_id',type_='unique')
        batch.drop_constraint('fk_agreement_scope_change',type_='foreignkey')
        batch.drop_index('ix_collaboration_agreements_collaboration_id')
        batch.drop_column('scope_change_id');batch.drop_column('revision')
        batch.alter_column('proposal_id',existing_type=sa.String(36),nullable=False)
        batch.create_unique_constraint('uq_collaboration_agreements_collaboration_id',['collaboration_id'])
    op.drop_table('collaboration_scope_decisions');op.drop_table('collaboration_scope_changes')
    if op.get_bind().dialect.name=='postgresql':op.execute('DROP FUNCTION flenzr_immutable_scope()')
