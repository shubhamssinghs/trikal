from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine, Base
from app.lib.oidc import jwks_client
from app.middleware.logging import RequestLoggingMiddleware
from app.utils.logger import setup_logger, get_logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logger()
    log = get_logger("startup")
    try:
        await jwks_client.warm_cache()
        log.info("oidc.jwks.warmed")
    except Exception:
        log.exception("oidc.jwks.warm_failed")
    yield
    await engine.dispose()


app = FastAPI(
    title="Trikal API",
    description="Backend API for Trikal",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RequestLoggingMiddleware)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"name": "Trikal API", "version": "0.1.0"}
