from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.product import Product


class ProductRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, product_id: int) -> Product | None:
        return self.db.get(Product, product_id)

    def list(self, offset: int = 0, limit: int | None = None) -> list[Product]:
        statement = select(Product).order_by(Product.created_at.desc())
        if limit is not None:
            statement = statement.offset(offset).limit(limit)
        return list(self.db.scalars(statement).all())

    def count(self) -> int:
        return int(self.db.scalar(select(func.count()).select_from(Product)) or 0)

    def create(self, product: Product) -> Product:
        self.db.add(product)
        self.db.flush()
        self.db.refresh(product)
        return product

    def delete(self, product: Product) -> None:
        self.db.delete(product)
        self.db.flush()

