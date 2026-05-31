import logging
import sys
from typing import Any

import structlog

from app.core.config import settings
from app.core.phi_scrubber import PHIScrubber


def add_service_context(logger: Any, method_name: str, event_dict: dict) -> dict:
    event_dict["service"] = "trikal"
    event_dict["environment"] = settings.ENVIRONMENT
    return event_dict


def setup_logger() -> None:
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        add_service_context,
        PHIScrubber.scrub_processor,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.dev.ConsoleRenderer()
        if settings.ENVIRONMENT == "development"
        else structlog.processors.JSONRenderer(),
    ]

    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=settings.LOG_LEVEL.upper(),
    )


def get_logger(name: str | None = None) -> Any:
    return structlog.get_logger(name or "trikal")
