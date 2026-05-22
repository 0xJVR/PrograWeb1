from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database.base import Base
from app.database.session import engine
from app.models.product import Product
from app.models.user import User
from app.repositories.product_repository import ProductRepository
from app.repositories.user_repository import UserRepository


def create_database() -> None:
    Base.metadata.create_all(bind=engine)


def seed_database(db: Session) -> None:
    users = UserRepository(db)
    products = ProductRepository(db)
    if users.count() == 0:
        admin = User(
            name="Admin",
            email="admin@test.com",
            password_hash=hash_password("admin123"),
            role="admin",
            profile_color=0,
        )
        regular = User(
            name="Usuario",
            email="user@test.com",
            password_hash=hash_password("user123"),
            role="user",
            profile_color=1,
        )
        users.create(admin)
        users.create(regular)
        db.commit()

    if products.count() == 0:
        admin = users.get_by_email("admin@test.com")
        creator_id = admin.id if admin else None
        sample_products = [
            Product(
                name="Teclado mecánico",
                price=79.99,
                description="Teclado compacto con switches táctiles y retroiluminación.",
                image="",
                active=True,
                created_by=creator_id,
            ),
            Product(
                name="Mouse inalámbrico",
                price=39.5,
                description="Mouse ergonómico con sensor óptico de alta precisión.",
                image="",
                active=True,
                created_by=creator_id,
            ),
            Product(
                name="Monitor 27 pulgadas",
                price=229.0,
                description="Monitor IPS Full HD para trabajo, estudio y entretenimiento.",
                image="",
                active=True,
                created_by=creator_id,
            ),
        ]
        for product in sample_products:
            products.create(product)
        db.commit()

