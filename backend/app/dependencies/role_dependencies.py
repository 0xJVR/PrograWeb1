from typing import Annotated

from fastapi import Depends

from app.core.exceptions import AuthorizationError
from app.dependencies.auth_dependencies import get_current_user
from app.models.user import User


def require_admin(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    if current_user.role != "admin":
        raise AuthorizationError("Acceso denegado. Se requieren permisos de administrador")
    return current_user

