from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth_dependencies import get_current_user
from app.models.user import User
from app.schemas.auth_schema import AuthResponse, LoginRequest, VerifyResponse
from app.schemas.user_schema import RegisterRequest
from app.services.auth_service import AuthService


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Annotated[Session, Depends(get_db)]):
    return AuthService(db).register(data)


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, db: Annotated[Session, Depends(get_db)]):
    return AuthService(db).login(data)


@router.get("/verify", response_model=VerifyResponse)
def verify(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return AuthService(db).verify(current_user.id)

