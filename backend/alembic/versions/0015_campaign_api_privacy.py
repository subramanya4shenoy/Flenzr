"""Keep campaigns and their participant records behind the authorized API."""
from alembic import op

revision = '0015_campaign_api_privacy'
down_revision = '0014_campaign_revision'
branch_labels = None
depends_on = None
TABLES = ('campaigns', 'campaign_applications', 'campaign_invitations')


def upgrade():
    if op.get_bind().dialect.name != 'postgresql':
        return
    for table in TABLES:
        op.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')
        # Restrictive policy also blocks accidental permissive browser policies.
        # The trusted table-owning/BYPASSRLS backend continues to enforce API roles.
        op.execute(f'CREATE POLICY flenzr_campaign_api_only ON {table} AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')


def downgrade():
    if op.get_bind().dialect.name != 'postgresql':
        return
    for table in reversed(TABLES):
        op.execute(f'DROP POLICY flenzr_campaign_api_only ON {table}')
        op.execute(f'ALTER TABLE {table} DISABLE ROW LEVEL SECURITY')
