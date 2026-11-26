"""Extend the private notification inbox with collaboration event targets."""
from alembic import op
import sqlalchemy as sa

revision = '0034_collaboration_notifications'
down_revision = '0033_private_chat_and_comments'
branch_labels = None
depends_on = None

TARGET = ('(enquiry_id IS NOT NULL AND enquiry_revision IS NOT NULL AND collaboration_id IS NULL AND event_key IS NULL) OR '
          '(enquiry_id IS NULL AND enquiry_revision IS NULL AND collaboration_id IS NOT NULL AND event_key IS NOT NULL)')


def upgrade():
    with op.batch_alter_table('notifications') as batch:
        batch.alter_column('enquiry_id', existing_type=sa.String(36), nullable=True)
        batch.alter_column('enquiry_revision', existing_type=sa.Integer(), nullable=True)
        batch.add_column(sa.Column('collaboration_id', sa.String(36), nullable=True))
        batch.add_column(sa.Column('event_key', sa.String(100), nullable=True))
        batch.create_foreign_key('fk_notifications_collaboration', 'collaborations', ['collaboration_id'], ['id'], ondelete='CASCADE')
        batch.create_index('ix_notifications_collaboration_id', ['collaboration_id'])
        batch.create_unique_constraint('uq_notification_collaboration_event', ['user_id', 'collaboration_id', 'event_key'])
        batch.create_check_constraint('notification_target', TARGET)
    # The existing PostgreSQL RLS and private account broadcast trigger remain.
    # No historical notifications or collaboration email jobs are created.


def downgrade():
    # Old code cannot represent collaboration targets. Explicit deletion avoids
    # assigning collaboration events to unrelated enquiry records.
    op.execute("DELETE FROM notifications WHERE collaboration_id IS NOT NULL")
    with op.batch_alter_table('notifications') as batch:
        batch.drop_constraint(op.f('ck_notifications_notification_target'), type_='check')
        batch.drop_constraint('uq_notification_collaboration_event', type_='unique')
        batch.drop_index('ix_notifications_collaboration_id')
        batch.drop_constraint('fk_notifications_collaboration', type_='foreignkey')
        batch.drop_column('event_key')
        batch.drop_column('collaboration_id')
        batch.alter_column('enquiry_id', existing_type=sa.String(36), nullable=False)
        batch.alter_column('enquiry_revision', existing_type=sa.Integer(), nullable=False)
