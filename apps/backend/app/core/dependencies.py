from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.lib.oidc import jwks_client
from app.models.audit_log import AuditOutcome
from app.schemas.user import CurrentUser
from app.services.audit import AuditService
from app.services.user import UserService


_bearer = HTTPBearer(auto_error=True)


async def get_session(db: AsyncSession = Depends(get_db)) -> AsyncSession:
    return db


async def get_audit_service(db: AsyncSession = Depends(get_session)) -> AuditService:
    return AuditService(db)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_session),
) -> CurrentUser:
    audit = AuditService(db)
    ip = request.client.host if request.client else None

    try:
        claims = await jwks_client.verify_token(credentials.credentials)
    except HTTPException:
        await audit.log_event(
            action="USER_AUTH",
            outcome=AuditOutcome.DENIED,
            user_id="anonymous",
            ip_address=ip,
            extra={"reason": "token_verification_failed"},
        )
        raise

    sub = claims["sub"]

    # Profile claims are not in the token — fetch from userinfo endpoint
    userinfo = await jwks_client.fetch_userinfo(credentials.credentials)
    given_name = userinfo.get("given_name", "")
    family_name = userinfo.get("family_name", "")
    name = " ".join(filter(None, [given_name, family_name])) or userinfo.get("name", "") or sub
    email = userinfo.get("email", "")
    roles = userinfo.get("roles") or userinfo.get("groups") or []

    user = await UserService(db).get_or_create(
        sub=sub, email=email, name=name, roles=roles
    )

    await audit.log_event(
        action="USER_AUTH",
        outcome=AuditOutcome.SUCCESS,
        user_id=str(user.id),
        ip_address=ip,
    )

    return CurrentUser(
        sub=sub, email=email, name=name, roles=roles, user_id=user.id
    )
