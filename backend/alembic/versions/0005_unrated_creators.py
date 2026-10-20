"""New creators start without a fabricated five-star rating."""
from alembic import op
import sqlalchemy as sa

revision = '0005_unrated_creators'
down_revision = '0004_creator_social'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('creators') as batch:
        batch.alter_column('rating', existing_type=sa.Float(), existing_nullable=False,
                           server_default=sa.text('0.0'))


def downgrade():
    with op.batch_alter_table('creators') as batch:
        batch.alter_column('rating', existing_type=sa.Float(), existing_nullable=False,
                           server_default=sa.text('5.0'))
