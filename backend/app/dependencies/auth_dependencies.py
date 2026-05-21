from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError
from app.core.security import decode_access_token
from app.database.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if token is None:
        raise AuthenticationError("Token requerido")
    payload = decode_access_token(token)
    subject = payload.get("sub") or payload.get("id")
    if subject is None:
        raise AuthenticationError("Token inválido")
    try:
        user_id = int(subject)
    except (TypeError, ValueError) as exc:
        raise AuthenticationError("Token inválido") from exc

    user = UserRepository(db).get_by_id(user_id)
    if not user:
        raise AuthenticationError("Usuario no encontrado")
    return user

