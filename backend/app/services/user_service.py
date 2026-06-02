from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError, BusinessError, NotFoundError
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.product_repository import ProductRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user_schema import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    ProfileColorRequest,
    ProfileUpdateRequest,
    UserCreateRequest,
    UserUpdateRequest,
)
from app.services.serializers import user_to_dict


GRADIENTS = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)",
]


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)
        self.products = ProductRepository(db)

    def get_profile(self, current_user: User) -> dict:
        return {"success": True, "user": user_to_dict(current_user)}

    def update_profile(self, current_user: User, data: ProfileUpdateRequest) -> dict:
        current_user.name = data.name.strip()
        self.db.commit()
        self.db.refresh(current_user)
        return {
            "success": True,
            "message": "Perfil actualizado exitosamente",
            "user": user_to_dict(current_user),
        }

    def update_profile_color(self, current_user: User, data: ProfileColorRequest) -> dict:
        current_user.profile_color = data.colorIndex
        self.db.commit()
        return {
            "success": True,
            "message": "Color de perfil actualizado",
            "profileColor": current_user.profile_color,
            "gradient": GRADIENTS[current_user.profile_color],
        }

    def change_password(self, current_user: User, data: ChangePasswordRequest) -> dict:
        if data.newPassword != data.confirmPassword:
            raise BusinessError("Las contraseñas no coinciden")
        if not verify_password(data.currentPassword, current_user.password_hash):
            raise AuthenticationError("Contraseña actual incorrecta")
        current_user.password_hash = hash_password(data.newPassword)
        self.db.commit()
        return {"success": True, "message": "Contraseña actualizada exitosamente"}

    def delete_account(self, current_user: User, data: DeleteAccountRequest) -> dict:
        if not verify_password(data.password, current_user.password_hash):
            raise AuthenticationError("Contraseña incorrecta")
        self.users.delete(current_user)
        self.db.commit()
        return {"success": True, "message": "Cuenta eliminada exitosamente"}

    def gradients(self) -> dict:
        return {
            "success": True,
            "gradients": [{"id": index, "gradient": gradient} for index, gradient in enumerate(GRADIENTS)],
        }

    def list_users(self, page: int = 1, limit: int = 10, search: str = "", role: str = "") -> dict:
        page = max(page, 1)
        limit = min(max(limit, 1), 100)
        offset = (page - 1) * limit
        total = self.users.count(search=search, role=role)
        users = self.users.list(search=search, role=role, offset=offset, limit=limit)
        return {
            "success": True,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "pages": (total + limit - 1) // limit,
            },
            "users": [user_to_dict(user) for user in users],
        }

    def create_user(self, data: UserCreateRequest) -> dict:
        email = data.email.lower()
        if self.users.get_by_email(email):
            raise BusinessError("Ya existe un usuario con ese email")
        user = User(
            name=data.name.strip(),
            email=email,
            password_hash=hash_password(data.password),
            role=data.role,
        )
        self.users.create(user)
        self.db.commit()
        return {"success": True, "message": "Usuario creado exitosamente", "user": user_to_dict(user)}

    def update_user(self, user_id: int, current_user: User, data: UserUpdateRequest) -> dict:
        if user_id == current_user.id and data.role == "user":
            raise BusinessError("No puedes cambiar tu propio rol de admin")
        user = self.users.get_by_id(user_id)
        if not user:
            raise NotFoundError("Usuario no encontrado")
        if data.name is not None:
            user.name = data.name.strip()
        if data.role is not None:
            user.role = data.role
        self.db.commit()
        self.db.refresh(user)
        return {"success": True, "message": "Usuario actualizado", "user": user_to_dict(user)}

    def delete_user(self, user_id: int, current_user: User) -> dict:
        if user_id == current_user.id:
            raise BusinessError("No puedes eliminar tu propia cuenta desde el panel de admin")
        user = self.users.get_by_id(user_id)
        if not user:
            raise NotFoundError("Usuario no encontrado")
        self.users.delete(user)
        self.db.commit()
        return {"success": True, "message": "Usuario eliminado"}

    def stats(self) -> dict:
        total_users = self.users.count()
        total_admins = self.users.count_admins()
        return {
            "success": True,
            "stats": {
                "users": {
                    "total": total_users,
                    "admins": total_admins,
                    "regularUsers": total_users - total_admins,
                    "newThisWeek": self.users.count_new_this_week(),
                },
                "products": {"total": self.products.count()},
                "messages": {"total": 0, "thisWeek": 0},
            },
        }

