from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.audit import AuditService


async def get_session(db: AsyncSession = Depends(get_db)) -> AsyncSession:
    return db


async def get_audit_service(db: AsyncSession = Depends(get_session)) -> AuditService:
    return AuditService(db)
