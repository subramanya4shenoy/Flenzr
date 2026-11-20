"""Immutable brand/client decisions on submitted delivery versions."""
from alembic import op
import sqlalchemy as sa
revision = '0021_delivery_reviews'
down_revision = '0020_deliveries'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('collaboration_delivery_reviews',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('collaboration_id', sa.String(36), sa.ForeignKey('collaborations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('delivery_id', sa.String(36), sa.ForeignKey('collaboration_deliveries.id', ondelete='RESTRICT'), nullable=False, unique=True),
        sa.Column('reviewer_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('decision', sa.String(24), nullable=False), sa.Column('feedback', sa.Text, nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False), sa.Column('request_hash', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('collaboration_id', 'request_id', name='uq_delivery_review_request'),
        sa.CheckConstraint("decision IN ('approved', 'revisions_requested')", name='delivery_review_decision'))
    op.create_index('ix_collaboration_delivery_reviews_collaboration_id', 'collaboration_delivery_reviews', ['collaboration_id'])
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('ALTER TABLE collaboration_delivery_reviews ENABLE ROW LEVEL SECURITY')
        op.execute('CREATE POLICY flenzr_delivery_reviews_api_only ON collaboration_delivery_reviews AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)')
        op.execute("""CREATE FUNCTION flenzr_immutable_delivery_review() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN RAISE EXCEPTION 'Saved delivery reviews cannot be changed or deleted' USING ERRCODE = '55000'; END;
            $$""")
        op.execute('CREATE TRIGGER flenzr_delivery_review_immutable BEFORE UPDATE OR DELETE ON collaboration_delivery_reviews FOR EACH ROW EXECUTE FUNCTION flenzr_immutable_delivery_review()')


def downgrade():
    op.drop_table('collaboration_delivery_reviews')
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('DROP FUNCTION flenzr_immutable_delivery_review()')
