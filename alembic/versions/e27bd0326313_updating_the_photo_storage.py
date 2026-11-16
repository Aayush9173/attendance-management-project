"""updating the photo storage

Revision ID: e27bd0326313
Revises: 0ffa6669f7ae
Create Date: 2026-11-10 20:26:11.085997

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e27bd0326313'
down_revision: Union[str, Sequence[str], None] = '0ffa6669f7ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('attendance','check_in_photo')
    op.drop_column('attendance','check_out_photo')


def downgrade() -> None:
    op.add_column('attendance',sa.Column('check_in_photo',sa.String,nullable=True))
    op.add_column('attendance',sa.Column('check_out_photo',sa.String,nullable=True))
