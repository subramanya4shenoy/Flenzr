"""Durable participant-only collaboration conversations."""
from alembic import op
import sqlalchemy as sa
revision = '0027_collaboration_messages'
down_revision = '0026_collaboration_feedback'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('collaborations', sa.Column('message_version', sa.Integer(), nullable=False, server_default='0'))
    op.create_table('collaboration_messages',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('collaboration_id', sa.String(36), sa.ForeignKey('collaborations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('author_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('author_role', sa.String(16), nullable=False), sa.Column('sequence', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False), sa.Column('request_hash', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('collaboration_id', 'sequence', name='uq_collaboration_message_sequence'),
        sa.UniqueConstraint('collaboration_id', 'author_id', 'request_id', name='uq_collaboration_message_request'),
        sa.CheckConstraint('sequence > 0', name='collaboration_message_sequence'),
        sa.CheckConstraint("author_role IN ('brand', 'creator')", name='collaboration_message_role'))
    op.create_index('ix_collaboration_messages_collaboration_id', 'collaboration_messages', ['collaboration_id'])
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('ALTER TABLE collaboration_messages ENABLE ROW LEVEL SECURITY')
        op.execute('CREATE POLICY flenzr_messages_api_only ON collaboration_messages AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')
        op.execute("""CREATE FUNCTION flenzr_immutable_message() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN RAISE EXCEPTION 'Sent collaboration messages cannot be changed or deleted' USING ERRCODE = '55000'; END;
            $$""")
        op.execute('CREATE TRIGGER flenzr_message_immutable BEFORE UPDATE OR DELETE ON collaboration_messages FOR EACH ROW EXECUTE FUNCTION flenzr_immutable_message()')


def downgrade():
    op.drop_table('collaboration_messages')
    op.drop_column('collaborations', 'message_version')
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('DROP FUNCTION flenzr_immutable_message()')
