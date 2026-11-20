"""Persist the final approved work and explicit collaboration completion."""
from alembic import op
import sqlalchemy as sa
revision = '0022_completions'
down_revision = '0021_delivery_reviews'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('collaboration_completions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('collaboration_id', sa.String(36), sa.ForeignKey('collaborations.id', ondelete='RESTRICT'), nullable=False, unique=True),
        sa.Column('agreement_id', sa.String(36), sa.ForeignKey('collaboration_agreements.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('delivery_id', sa.String(36), sa.ForeignKey('collaboration_deliveries.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('review_id', sa.String(36), sa.ForeignKey('collaboration_delivery_reviews.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('completed_by', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False), sa.Column('request_hash', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('ALTER TABLE collaboration_completions ENABLE ROW LEVEL SECURITY')
        op.execute('CREATE POLICY flenzr_completions_api_only ON collaboration_completions AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')
        op.execute("""CREATE FUNCTION flenzr_immutable_completion() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN RAISE EXCEPTION 'Saved completions cannot be changed or deleted' USING ERRCODE = '55000'; END;
            $$""")
        op.execute('CREATE TRIGGER flenzr_completion_immutable BEFORE UPDATE OR DELETE ON collaboration_completions FOR EACH ROW EXECUTE FUNCTION flenzr_immutable_completion()')


def downgrade():
    op.drop_table('collaboration_completions')
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('DROP FUNCTION flenzr_immutable_completion()')
