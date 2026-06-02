from pydantic import BaseModel, EmailStr, Field

from app.schemas.user_schema import UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class AuthResponse(BaseModel):
    success: bool = True
    message: str
    token: str
    user: UserRead


class VerifyResponse(BaseModel):
    success: bool = True
    user: UserRead

