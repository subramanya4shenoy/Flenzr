"""Private delivery file reservations and immutable submitted metadata."""
from alembic import op
import sqlalchemy as sa
revision = '0025_collaboration_files'
down_revision = '0024_proof_confirmations'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('collaboration_deliveries', sa.Column('files', sa.JSON(), nullable=False, server_default='[]'))
    op.create_table('collaboration_files',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('collaboration_id', sa.String(36), sa.ForeignKey('collaborations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('agreement_id', sa.String(36), sa.ForeignKey('collaboration_agreements.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('creator_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('delivery_id', sa.String(36), sa.ForeignKey('collaboration_deliveries.id', ondelete='RESTRICT')),
        sa.Column('object_key', sa.String(255), nullable=False, unique=True),
        sa.Column('filename', sa.String(160), nullable=False), sa.Column('content_type', sa.String(80), nullable=False),
        sa.Column('size_bytes', sa.BigInteger(), nullable=False), sa.Column('state', sa.String(16), nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('collaboration_id', 'request_id', name='uq_collaboration_file_request'),
        sa.CheckConstraint("state IN ('pending', 'ready', 'removed')", name='collaboration_file_state'),
        sa.CheckConstraint('size_bytes > 0', name='collaboration_file_positive_size'))
    for column in ('collaboration_id', 'creator_user_id'):
        op.create_index('ix_collaboration_files_' + column, 'collaboration_files', [column])
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('ALTER TABLE collaboration_files ENABLE ROW LEVEL SECURITY')
        op.execute('CREATE POLICY flenzr_files_api_only ON collaboration_files AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')
        op.execute("""CREATE FUNCTION flenzr_protect_submitted_file() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
              IF OLD.delivery_id IS NOT NULL THEN
                RAISE EXCEPTION 'Submitted file metadata cannot be changed or deleted' USING ERRCODE = '55000';
              END IF;
              IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
              RETURN NEW;
            END;
            $$""")
        op.execute('CREATE TRIGGER flenzr_submitted_file_immutable BEFORE UPDATE OR DELETE ON collaboration_files FOR EACH ROW EXECUTE FUNCTION flenzr_protect_submitted_file()')


def downgrade():
    op.drop_table('collaboration_files')
    op.drop_column('collaboration_deliveries', 'files')
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('DROP FUNCTION flenzr_protect_submitted_file()')
