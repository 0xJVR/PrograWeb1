from datetime import datetime, timedelta, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        statement = select(User).where(User.email == email.lower())
        return self.db.scalar(statement)

    def list(self, search: str = "", role: str = "", offset: int = 0, limit: int | None = None) -> list[User]:
        statement = select(User)
        if search:
            pattern = f"%{search.lower()}%"
            statement = statement.where(or_(func.lower(User.name).like(pattern), User.email.like(pattern)))
        if role:
            statement = statement.where(User.role == role)
        statement = statement.order_by(User.created_at.desc())
        if limit is not None:
            statement = statement.offset(offset).limit(limit)
        return list(self.db.scalars(statement).all())

    def count(self, search: str = "", role: str = "") -> int:
        statement = select(func.count()).select_from(User)
        if search:
            pattern = f"%{search.lower()}%"
            statement = statement.where(or_(func.lower(User.name).like(pattern), User.email.like(pattern)))
        if role:
            statement = statement.where(User.role == role)
        return int(self.db.scalar(statement) or 0)

    def count_admins(self) -> int:
        return int(self.db.scalar(select(func.count()).select_from(User).where(User.role == "admin")) or 0)

    def count_new_this_week(self) -> int:
        since = datetime.now(timezone.utc) - timedelta(days=7)
        return int(self.db.scalar(select(func.count()).select_from(User).where(User.created_at >= since)) or 0)

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.flush()
        self.db.refresh(user)
        return user

    def delete(self, user: User) -> None:
        self.db.delete(user)
        self.db.flush()

