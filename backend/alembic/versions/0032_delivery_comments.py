"""Add timestamped delivery review comments table."""
from alembic import op
import sqlalchemy as sa

revision = '0032_delivery_comments'
down_revision = '0031_collaboration_chat'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'collaboration_delivery_comments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('collaboration_id', sa.String(36), sa.ForeignKey('collaborations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('delivery_id', sa.String(36), sa.ForeignKey('collaboration_deliveries.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('file_id', sa.String(36), nullable=True),
        sa.Column('author_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('timestamp_ms', sa.Integer(), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('resolved', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_collaboration_delivery_comments_collaboration_id', 'collaboration_delivery_comments', ['collaboration_id'])
    op.create_index('ix_collaboration_delivery_comments_delivery_id', 'collaboration_delivery_comments', ['delivery_id'])


def downgrade():
    op.drop_index('ix_collaboration_delivery_comments_delivery_id', table_name='collaboration_delivery_comments')
    op.drop_index('ix_collaboration_delivery_comments_collaboration_id', table_name='collaboration_delivery_comments')
    op.drop_table('collaboration_delivery_comments')

