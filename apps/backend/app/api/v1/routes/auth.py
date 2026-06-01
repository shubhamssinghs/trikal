import secrets
from urllib.parse import urlencode

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_session
from app.lib.oidc import jwks_client
from app.lib.redis import get_redis
from app.models.audit_log import AuditOutcome
from app.schemas.auth import LogoutRequest, RefreshRequest, TokenResponse
from app.services.audit import AuditService
from app.services.user import UserService

router = APIRouter()

_STATE_TTL = 300  # 5 minutes


@router.get(
    "/login",
    status_code=302,
    response_class=RedirectResponse,
    description="Redirects browser to the Trishul IAM login page. Open directly in a browser — not callable via fetch/Swagger.",
    responses={302: {"description": "Redirect to identity provider authorization endpoint"}},
)
async def login(
    redis: aioredis.Redis = Depends(get_redis),
) -> RedirectResponse:
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)

    await redis.setex(f"oidc:state:{state}", _STATE_TTL, nonce)

    authorization_endpoint = await jwks_client.get_authorization_endpoint()
    params = urlencode({
        "client_id": settings.OIDC_CLIENT_ID,
        "response_type": "code",
        "scope": "openid profile email offline_access",
        "redirect_uri": settings.OIDC_REDIRECT_URI,
        "state": state,
        "nonce": nonce,
    })
    return RedirectResponse(url=f"{authorization_endpoint}?{params}")


@router.get(
    "/callback",
    status_code=302,
    response_class=RedirectResponse,
    description="Handles the redirect from Trishul IAM after login. Called automatically by the browser — not manually.",
    responses={302: {"description": "Redirect to frontend with access_token query param"}},
)
async def callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    redis: aioredis.Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_session),
) -> RedirectResponse:
    audit = AuditService(db)
    ip = request.client.host if request.client else None

    stored_nonce = await redis.getdel(f"oidc:state:{state}")
    if not stored_nonce:
        await audit.log_event(
            action="OIDC_CALLBACK",
            outcome=AuditOutcome.DENIED,
            user_id="anonymous",
            ip_address=ip,
            extra={"reason": "invalid_or_expired_state"},
        )
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    try:
        tokens = await jwks_client.exchange_code(
            code=code, redirect_uri=settings.OIDC_REDIRECT_URI
        )
    except HTTPException:
        await audit.log_event(
            action="OIDC_CALLBACK",
            outcome=AuditOutcome.DENIED,
            user_id="anonymous",
            ip_address=ip,
            extra={"reason": "code_exchange_failed"},
        )
        raise

    id_token = tokens.get("id_token")
    if not id_token:
        raise HTTPException(status_code=502, detail="No id_token in response")

    claims = await jwks_client.verify_token(id_token)

    if claims.get("nonce") != stored_nonce:
        await audit.log_event(
            action="OIDC_CALLBACK",
            outcome=AuditOutcome.DENIED,
            user_id="anonymous",
            ip_address=ip,
            extra={"reason": "nonce_mismatch"},
        )
        raise HTTPException(status_code=400, detail="Nonce mismatch")

    sub = claims["sub"]

    # Profile claims are not in the token — fetch from userinfo endpoint
    userinfo = await jwks_client.fetch_userinfo(tokens["access_token"])

    given_name = userinfo.get("given_name", "")
    family_name = userinfo.get("family_name", "")
    name = " ".join(filter(None, [given_name, family_name])) or userinfo.get("name", "") or sub
    email = userinfo.get("email", "")
    roles = userinfo.get("roles") or userinfo.get("groups") or []

    user = await UserService(db).get_or_create(
        sub=sub, email=email, name=name, roles=roles
    )

    await audit.log_event(
        action="OIDC_CALLBACK",
        outcome=AuditOutcome.SUCCESS,
        user_id=str(user.id),
        ip_address=ip,
    )

    params = urlencode({
        "access_token": tokens["access_token"],
        "refresh_token": tokens.get("refresh_token", ""),
        "expires_in": tokens.get("expires_in", 3600),
    })
    return RedirectResponse(url=f"{settings.FRONTEND_URL}?{params}")


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    body: RefreshRequest,
    db: AsyncSession = Depends(get_session),
) -> TokenResponse:
    audit = AuditService(db)
    ip = request.client.host if request.client else None

    try:
        tokens = await jwks_client.refresh_access_token(body.refresh_token)
    except HTTPException:
        await audit.log_event(
            action="TOKEN_REFRESH",
            outcome=AuditOutcome.DENIED,
            user_id="anonymous",
            ip_address=ip,
            extra={"reason": "refresh_failed"},
        )
        raise

    await audit.log_event(
        action="TOKEN_REFRESH",
        outcome=AuditOutcome.SUCCESS,
        user_id="anonymous",
        ip_address=ip,
    )

    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens.get("refresh_token"),
        expires_in=tokens.get("expires_in", 3600),
    )


@router.get("/logout")
async def logout(
    request: Request,
    id_token_hint: str | None = Query(None),
    db: AsyncSession = Depends(get_session),
) -> RedirectResponse:
    audit = AuditService(db)
    ip = request.client.host if request.client else None

    await audit.log_event(
        action="USER_LOGOUT",
        outcome=AuditOutcome.SUCCESS,
        user_id="anonymous",
        ip_address=ip,
    )

    end_session_endpoint = await jwks_client.get_end_session_endpoint()
    if end_session_endpoint:
        params: dict = {"post_logout_redirect_uri": settings.FRONTEND_LOGOUT_URL}
        if id_token_hint:
            params["id_token_hint"] = id_token_hint
        return RedirectResponse(url=f"{end_session_endpoint}?{urlencode(params)}")

    return RedirectResponse(url=settings.FRONTEND_LOGOUT_URL)
