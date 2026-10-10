"""initial identity and creators schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-10-10 21:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('supabase_uid', sa.String(length=64), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('avatar_url', sa.String(length=1024), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_superadmin', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_users')),
        sa.UniqueConstraint('email', name=op.f('uq_users_email')),
        sa.UniqueConstraint('supabase_uid', name=op.f('uq_users_supabase_uid')),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_supabase_uid'), 'users', ['supabase_uid'], unique=True)

    # 2. user_roles table
    op.create_table(
        'user_roles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('role', sa.String(length=32), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_roles_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_user_roles')),
    )
    op.create_index(op.f('ix_user_roles_user_id'), 'user_roles', ['user_id'], unique=False)
    op.create_index('ix_user_roles_user_id_role', 'user_roles', ['user_id', 'role'], unique=True)

    # 3. creators table
    op.create_table(
        'creators',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('handle', sa.String(length=64), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('niche', sa.String(length=128), nullable=True),
        sa.Column('location', sa.String(length=128), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('rating', sa.Float(), nullable=False, server_default=sa.text('5.0')),
        sa.Column('custom_domain', sa.String(length=255), nullable=True),
        sa.Column('profile_theme', sa.String(length=64), nullable=True, server_default='default'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_creators_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_creators')),
        sa.UniqueConstraint('custom_domain', name=op.f('uq_creators_custom_domain')),
        sa.UniqueConstraint('handle', name=op.f('uq_creators_handle')),
        sa.UniqueConstraint('user_id', name=op.f('uq_creators_user_id')),
    )
    op.create_index(op.f('ix_creators_handle'), 'creators', ['handle'], unique=True)
    op.create_index(op.f('ix_creators_user_id'), 'creators', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_table('creators')
    op.drop_table('user_roles')
    op.drop_table('users')
