from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth_dependencies import get_current_user
from app.dependencies.role_dependencies import require_admin
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.user_schema import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    GradientsResponse,
    ProfileColorRequest,
    ProfileColorResponse,
    ProfileUpdateRequest,
    UserResponse,
    UsersListResponse,
)
from app.services.user_service import UserService


router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UsersListResponse)
def list_users_legacy(
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    return UserService(db).list_users(page=1, limit=100)


@router.get("/profile", response_model=UserResponse)
def get_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return UserService(db).get_profile(current_user)


@router.put("/profile", response_model=UserResponse)
def update_profile(
    data: ProfileUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return UserService(db).update_profile(current_user, data)


@router.put("/profile-color", response_model=ProfileColorResponse)
def update_profile_color(
    data: ProfileColorRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return UserService(db).update_profile_color(current_user, data)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    data: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return UserService(db).change_password(current_user, data)


@router.delete("/account", response_model=MessageResponse)
def delete_account(
    data: DeleteAccountRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return UserService(db).delete_account(current_user, data)


@router.get("/gradients", response_model=GradientsResponse)
def gradients(db: Annotated[Session, Depends(get_db)]):
    return UserService(db).gradients()

