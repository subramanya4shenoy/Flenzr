"""Add read receipts, message reactions, call event type, and user last_seen_at for collaboration chat."""
from alembic import op
import sqlalchemy as sa

revision = '0031_collaboration_chat'
down_revision = '0030_campaign_recency'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('collaboration_messages', sa.Column('message_type', sa.String(16), nullable=False, server_default='text'))

    op.create_table(
        'collaboration_message_reads',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('collaboration_id', sa.String(36), sa.ForeignKey('collaborations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('last_read_sequence', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('collaboration_id', 'user_id', name='uq_collaboration_message_read_user'),
    )
    op.create_index('ix_collaboration_message_reads_collaboration_id', 'collaboration_message_reads', ['collaboration_id'])
    op.create_index('ix_collaboration_message_reads_user_id', 'collaboration_message_reads', ['user_id'])

    op.create_table(
        'collaboration_message_reactions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('message_id', sa.String(36), sa.ForeignKey('collaboration_messages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('collaboration_id', sa.String(36), sa.ForeignKey('collaborations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('emoji', sa.String(16), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('message_id', 'user_id', 'emoji', name='uq_collaboration_message_reaction'),
    )
    op.create_index('ix_collaboration_message_reactions_message_id', 'collaboration_message_reactions', ['message_id'])
    op.create_index('ix_collaboration_message_reactions_collaboration_id', 'collaboration_message_reactions', ['collaboration_id'])


def downgrade():
    op.drop_index('ix_collaboration_message_reactions_collaboration_id', table_name='collaboration_message_reactions')
    op.drop_index('ix_collaboration_message_reactions_message_id', table_name='collaboration_message_reactions')
    op.drop_table('collaboration_message_reactions')
    op.drop_index('ix_collaboration_message_reads_user_id', table_name='collaboration_message_reads')
    op.drop_index('ix_collaboration_message_reads_collaboration_id', table_name='collaboration_message_reads')
    op.drop_table('collaboration_message_reads')
    op.drop_column('collaboration_messages', 'message_type')
    op.drop_column('users', 'last_seen_at')

