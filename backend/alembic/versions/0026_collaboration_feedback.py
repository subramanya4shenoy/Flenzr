"""Participant-only immutable feedback on completed collaborations."""
from alembic import op
import sqlalchemy as sa
revision = '0026_collaboration_feedback'
down_revision = '0025_collaboration_files'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('collaboration_feedback',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('collaboration_id', sa.String(36), sa.ForeignKey('collaborations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('completion_id', sa.String(36), sa.ForeignKey('collaboration_completions.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('author_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('recipient_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('author_role', sa.String(16), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False), sa.Column('comment', sa.Text(), nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False), sa.Column('request_hash', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('collaboration_id', 'author_id', name='uq_collaboration_feedback_author'),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='collaboration_feedback_rating'),
        sa.CheckConstraint('author_id <> recipient_id', name='collaboration_feedback_not_self'),
        sa.CheckConstraint("author_role IN ('brand', 'creator')", name='collaboration_feedback_role'))
    op.create_index('ix_collaboration_feedback_collaboration_id', 'collaboration_feedback', ['collaboration_id'])
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('ALTER TABLE collaboration_feedback ENABLE ROW LEVEL SECURITY')
        op.execute('CREATE POLICY flenzr_feedback_api_only ON collaboration_feedback AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')
        op.execute("""CREATE FUNCTION flenzr_immutable_feedback() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN RAISE EXCEPTION 'Submitted collaboration feedback cannot be changed or deleted' USING ERRCODE = '55000'; END;
            $$""")
        op.execute('CREATE TRIGGER flenzr_feedback_immutable BEFORE UPDATE OR DELETE ON collaboration_feedback FOR EACH ROW EXECUTE FUNCTION flenzr_immutable_feedback()')


def downgrade():
    op.drop_table('collaboration_feedback')
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('DROP FUNCTION flenzr_immutable_feedback()')
