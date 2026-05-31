"""create audit_logs table

Revision ID: 0001
Revises:
Create Date: 2026-05-31 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TYPE auditoutcome AS ENUM ('success', 'failure', 'denied')")

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("request_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.String(255), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(100), nullable=True),
        sa.Column("resource_id", sa.String(255), nullable=True),
        sa.Column("outcome", postgresql.ENUM("success", "failure", "denied", name="auditoutcome", create_type=False), nullable=False),
        sa.Column("ip_hash", sa.String(64), nullable=True),
        sa.Column("extra", postgresql.JSONB(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_request_id", "audit_logs", ["request_id"])

    op.execute("REVOKE DELETE ON audit_logs FROM trikal")
    op.execute("REVOKE UPDATE ON audit_logs FROM trikal")


def downgrade() -> None:
    op.drop_index("ix_audit_logs_request_id")
    op.drop_index("ix_audit_logs_user_id")
    op.drop_index("ix_audit_logs_timestamp")
    op.drop_table("audit_logs")
    op.execute("DROP TYPE IF EXISTS auditoutcome")
