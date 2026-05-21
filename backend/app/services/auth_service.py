from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError, BusinessError, NotFoundError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth_schema import LoginRequest
from app.schemas.user_schema import RegisterRequest
from app.services.serializers import user_to_dict


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)

    def register(self, data: RegisterRequest) -> dict:
        email = data.email.lower()
        if self.users.get_by_email(email):
            raise BusinessError("El email ya está registrado")

        user = User(
            name=data.name.strip(),
            email=email,
            password_hash=hash_password(data.password),
            role="user",
        )
        self.users.create(user)
        self.db.commit()
        token = create_access_token(str(user.id), user.email, user.role)
        return {
            "success": True,
            "message": "Usuario registrado exitosamente",
            "token": token,
            "user": user_to_dict(user),
        }

    def login(self, data: LoginRequest) -> dict:
        user = self.users.get_by_email(data.email.lower())
        if not user or not verify_password(data.password, user.password_hash):
            raise AuthenticationError("Credenciales inválidas")

        token = create_access_token(str(user.id), user.email, user.role)
        return {
            "success": True,
            "message": "Login exitoso",
            "token": token,
            "user": user_to_dict(user),
        }

    def verify(self, user_id: int) -> dict:
        user = self.users.get_by_id(user_id)
        if not user:
            raise NotFoundError("Usuario no encontrado")
        return {"success": True, "user": user_to_dict(user)}

