"""add agricultural profile fields to users

Revision ID: 0002
Revises: 0001
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002"
down_revision: Union[str, Sequence[str], None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("farm_name", sa.String(length=160), nullable=True))
    op.add_column("users", sa.Column("agricultural_role", sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "agricultural_role")
    op.drop_column("users", "farm_name")