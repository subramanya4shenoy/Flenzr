"""Keep chat metadata and delivery comments behind participant-authorized APIs."""
from alembic import op

revision = '0033_private_chat_and_comments'
down_revision = '0032_delivery_comments'
branch_labels = None
depends_on = None

TABLES = (
    'collaboration_message_reads',
    'collaboration_message_reactions',
    'collaboration_delivery_comments',
)


def upgrade():
    if op.get_bind().dialect.name != 'postgresql':
        return
    for table in TABLES:
        op.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')
        op.execute(f'CREATE POLICY flenzr_{table}_api_only ON {table} '
                   'AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')


def downgrade():
    if op.get_bind().dialect.name != 'postgresql':
        return
    for table in reversed(TABLES):
        op.execute(f'DROP POLICY flenzr_{table}_api_only ON {table}')
        op.execute(f'ALTER TABLE {table} DISABLE ROW LEVEL SECURITY')
