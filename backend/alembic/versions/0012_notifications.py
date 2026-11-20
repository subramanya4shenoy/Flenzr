"""Durable private notifications and transactional email outbox."""
from alembic import op
import sqlalchemy as sa

revision = '0012_notifications'
down_revision = '0011_enquiry_broadcast'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('notifications',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('enquiry_id', sa.String(36), sa.ForeignKey('enquiries.id', ondelete='CASCADE'), nullable=False),
        sa.Column('enquiry_revision', sa.Integer(), nullable=False),
        sa.Column('kind', sa.String(32), nullable=False),
        sa.Column('title', sa.String(160), nullable=False),
        sa.Column('message', sa.String(300), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('user_id', 'enquiry_id', 'enquiry_revision'))
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_enquiry_id', 'notifications', ['enquiry_id'])
    op.create_table('notification_emails',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('notification_id', sa.String(36), sa.ForeignKey('notifications.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False),
        sa.Column('next_attempt_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('locked_until', sa.DateTime(timezone=True)),
        sa.Column('lock_token', sa.String(36)),
        sa.Column('transport', sa.String(12)),
        sa.Column('last_error', sa.String(80)),
        sa.Column('sent_at', sa.DateTime(timezone=True)))
    for column in ['status', 'next_attempt_at']:
        op.create_index('ix_notification_emails_' + column, 'notification_emails', [column])
    if op.get_bind().dialect.name != 'postgresql':
        return
    op.execute('ALTER TABLE notifications ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE notification_emails ENABLE ROW LEVEL SECURITY')
    op.execute("""DO $migration$ BEGIN
      IF to_regprocedure('realtime.send(jsonb,text,text,boolean)') IS NULL THEN RETURN; END IF;
      CREATE FUNCTION public.flenzr_broadcast_notification() RETURNS trigger
      LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
      BEGIN
        PERFORM realtime.send('{}'::jsonb, 'enquiries_changed', 'enquiries:' || NEW.user_id, true);
        RETURN NEW;
      END; $fn$;
      REVOKE ALL ON FUNCTION public.flenzr_broadcast_notification() FROM PUBLIC;
      CREATE TRIGGER flenzr_notification_changed AFTER INSERT OR UPDATE OF read_at ON public.notifications
        FOR EACH ROW EXECUTE FUNCTION public.flenzr_broadcast_notification();
    END; $migration$;""")


def downgrade():
    op.drop_table('notification_emails')
    op.drop_table('notifications')
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('DROP FUNCTION IF EXISTS public.flenzr_broadcast_notification()')
