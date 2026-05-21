from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.role_dependencies import require_admin
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.user_schema import UserCreateRequest, UserResponse, UsersListResponse, UserUpdateRequest
from app.services.user_service import UserService


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def stats(
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    return UserService(db).stats()


@router.get("/users", response_model=UsersListResponse)
def list_users(
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    search: str = "",
    role: str = "",
):
    return UserService(db).list_users(page=page, limit=limit, search=search, role=role)


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreateRequest,
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    return UserService(db).create_user(data)


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdateRequest,
    current_user: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    return UserService(db).update_user(user_id, current_user, data)


@router.delete("/users/{user_id}", response_model=MessageResponse)
def delete_user(
    user_id: int,
    current_user: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    return UserService(db).delete_user(user_id, current_user)

