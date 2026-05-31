import hashlib

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.phi_scrubber import PHIScrubber
from app.models.audit_log import AuditLog, AuditOutcome


def _hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()


def _current_request_id() -> str:
    ctx = structlog.contextvars.get_contextvars()
    return ctx.get("request_id", "unknown")


class AuditService:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def log_event(
        self,
        *,
        action: str,
        outcome: AuditOutcome,
        user_id: str = "system",
        resource_type: str | None = None,
        resource_id: str | None = None,
        ip_address: str | None = None,
        extra: dict | None = None,
    ) -> None:
        ip_hash = _hash_ip(ip_address) if ip_address else None
        safe_extra = PHIScrubber.scrub_dict(extra) if extra else None
        request_id = _current_request_id()

        entry = AuditLog(
            request_id=request_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            outcome=outcome,
            ip_hash=ip_hash,
            extra=safe_extra,
        )
        self._db.add(entry)
