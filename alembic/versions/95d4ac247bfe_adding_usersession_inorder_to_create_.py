"""Adding UserSession inorder to create refresh token

Revision ID: 95d4ac247bfe
Revises: e27bd0326313
Create Date: 2026-11-14 18:32:28.960370

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '95d4ac247bfe'
down_revision: Union[str, Sequence[str], None] = 'e27bd0326313'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('user_sessions',
                    sa.Column('id', sa.Integer, primary_key=True),
                    sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'),nullable=False),
                    sa.Column('token_hash',sa.String(64),nullable=False,unique=True),
                    sa.Column('created_at',sa.DateTime,nullable=False),
                    sa.Column('expires_at',sa.DateTime,nullable=False),
                    sa.Column('absolute_expires_at',sa.DateTime,nullable=True),
                    sa.Column('revoked_at',sa.DateTime,nullable=True))

    op.create_index(op.f('ix_user_session_user_id'),'user_sessions',['user_id'],unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_session_user_id'),table_name='user_sessions')

    op.drop_table('user_sessions')
