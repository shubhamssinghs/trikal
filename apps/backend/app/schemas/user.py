import uuid

from pydantic import BaseModel


class CurrentUser(BaseModel):
    sub: str
    email: str
    name: str
    roles: list[str]
    user_id: uuid.UUID
