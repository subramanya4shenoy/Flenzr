"""Index the shared per-sender submission window."""
from alembic import op

revision = '0013_enquiry_abuse_index'
down_revision = '0012_notifications'
branch_labels = None
depends_on = None


def upgrade():
    op.create_index('ix_enquiries_sender_created', 'enquiries', ['sender_id', 'created_at'])


def downgrade():
    op.drop_index('ix_enquiries_sender_created', table_name='enquiries')
