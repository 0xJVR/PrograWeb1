from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


UserRole = Literal["user", "admin"]


class UserRead(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    mongo_id: str = Field(alias="_id")
    name: str
    email: EmailStr
    role: UserRole
    profileColor: int = Field(ge=0, le=7)
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserCreateRequest(RegisterRequest):
    role: UserRole = "user"


class UserUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    role: UserRole | None = None


class ProfileUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ProfileColorRequest(BaseModel):
    colorIndex: int = Field(ge=0, le=7)


class ChangePasswordRequest(BaseModel):
    currentPassword: str = Field(min_length=1, max_length=128)
    newPassword: str = Field(min_length=6, max_length=128)
    confirmPassword: str = Field(min_length=6, max_length=128)


class DeleteAccountRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    success: bool = True
    message: str | None = None
    user: UserRead


class UsersListResponse(BaseModel):
    success: bool = True
    users: list[UserRead]
    pagination: dict | None = None


class GradientsResponse(BaseModel):
    success: bool = True
    gradients: list[dict[str, str | int]]


class ProfileColorResponse(BaseModel):
    success: bool = True
    message: str
    profileColor: int
    gradient: str

