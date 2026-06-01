from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.schemas.user import CurrentUser

router = APIRouter()


@router.get("/me", response_model=CurrentUser)
async def get_me(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    return current_user
