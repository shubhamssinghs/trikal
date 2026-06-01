from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class User(BaseModel):
    __tablename__ = "users"

    sub: Mapped[str] = mapped_column(unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(unique=True, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(nullable=True)
    roles: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default="[]"
    )
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        nullable=False, server_default="true"
    )
