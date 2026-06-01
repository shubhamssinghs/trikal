from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create(
        self, *, sub: str, email: str, name: str, roles: list[str]
    ) -> User:
        user = await self.db.scalar(select(User).where(User.sub == sub))
        now = datetime.now(timezone.utc)

        if user is None:
            user = User(
                sub=sub, email=email, name=name, roles=roles, last_seen_at=now
            )
            self.db.add(user)
        else:
            user.email = email
            user.name = name
            user.roles = roles
            user.last_seen_at = now

        await self.db.flush()
        return user
