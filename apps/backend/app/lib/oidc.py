import json
from typing import Any

import httpx
import jwt
from fastapi import HTTPException
from jwt.algorithms import RSAAlgorithm

from app.core.config import settings


class JWKSClient:
    def __init__(self):
        self._cache: dict[str, Any] = {}
        self._jwks_uri: str | None = None
        self._token_endpoint: str | None = None
        self._authorization_endpoint: str | None = None
        self._end_session_endpoint: str | None = None

    async def _load_discovery(self) -> None:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.OIDC_ISSUER}/.well-known/openid-configuration"
            )
            response.raise_for_status()
            config = response.json()

        self._jwks_uri = config["jwks_uri"]
        self._token_endpoint = config["token_endpoint"]
        self._authorization_endpoint = config["authorization_endpoint"]
        self._end_session_endpoint = config.get("end_session_endpoint")

    async def _resolve_jwks_uri(self) -> str:
        if not self._jwks_uri:
            await self._load_discovery()
        return self._jwks_uri  # type: ignore[return-value]

    async def get_authorization_endpoint(self) -> str:
        if not self._authorization_endpoint:
            await self._load_discovery()
        return self._authorization_endpoint  # type: ignore[return-value]

    async def get_token_endpoint(self) -> str:
        if not self._token_endpoint:
            await self._load_discovery()
        return self._token_endpoint  # type: ignore[return-value]

    async def get_end_session_endpoint(self) -> str | None:
        if not self._end_session_endpoint and not self._jwks_uri:
            await self._load_discovery()
        return self._end_session_endpoint

    async def fetch_userinfo(self, access_token: str) -> dict:
        if not self._jwks_uri:
            await self._load_discovery()
        userinfo_uri = f"{settings.OIDC_ISSUER}/oauth/userinfo"
        async with httpx.AsyncClient() as client:
            response = await client.get(
                userinfo_uri,
                headers={"Authorization": f"Bearer {access_token}"},
            )
        if response.status_code != 200:
            return {}
        return response.json()

    async def _fetch_jwks(self) -> None:
        jwks_uri = await self._resolve_jwks_uri()
        async with httpx.AsyncClient() as client:
            response = await client.get(jwks_uri)
            response.raise_for_status()
            jwks = response.json()

        self._cache.clear()
        for key in jwks["keys"]:
            kid = key.get("kid")
            if kid:
                self._cache[kid] = RSAAlgorithm.from_jwk(json.dumps(key))

    async def warm_cache(self) -> None:
        await self._load_discovery()
        await self._fetch_jwks()

    async def verify_token(self, token: str) -> dict:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        alg = header.get("alg")

        if not kid or not alg:
            raise HTTPException(status_code=401, detail="Invalid token header")

        if kid not in self._cache:
            await self._fetch_jwks()

        if kid not in self._cache:
            raise HTTPException(status_code=401, detail="Unknown signing key")

        try:
            return jwt.decode(
                token,
                self._cache[kid],
                algorithms=[alg],
                issuer=settings.OIDC_ISSUER,
                audience=settings.OIDC_AUDIENCE,
                leeway=10,
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    async def exchange_code(self, code: str, redirect_uri: str) -> dict:
        token_endpoint = await self.get_token_endpoint()
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_endpoint,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": settings.OIDC_CLIENT_ID,
                    "client_secret": settings.OIDC_CLIENT_SECRET,
                    "scope": "openid profile email offline_access",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Token exchange failed: {response.text}",
            )
        return response.json()

    async def refresh_access_token(self, refresh_token: str) -> dict:
        token_endpoint = await self.get_token_endpoint()
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_endpoint,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": settings.OIDC_CLIENT_ID,
                    "client_secret": settings.OIDC_CLIENT_SECRET,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=401,
                detail=f"Token refresh failed: {response.text}",
            )
        return response.json()


jwks_client = JWKSClient()
