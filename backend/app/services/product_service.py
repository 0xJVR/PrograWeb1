import secrets
import time
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import BusinessError, NotFoundError
from app.models.product import Product
from app.models.user import User
from app.repositories.product_repository import ProductRepository
from app.schemas.product_schema import ProductCreateRequest, ProductUpdateRequest
from app.services.serializers import product_to_dict


class ProductService:
    def __init__(self, db: Session):
        self.db = db
        self.products = ProductRepository(db)
        self.settings = get_settings()

    def list_products(self) -> dict:
        products = self.products.list()
        return {"success": True, "products": [product_to_dict(product) for product in products]}

    def get_product(self, product_id: int) -> dict:
        product = self.products.get_by_id(product_id)
        if not product:
            raise NotFoundError("Producto no encontrado")
        return {"success": True, "product": product_to_dict(product)}

    async def create_product(
        self,
        data: ProductCreateRequest,
        current_user: User,
        image_file: UploadFile | None = None,
    ) -> dict:
        image = await self._resolve_image(data.image or "", image_file)
        product = Product(
            name=data.name.strip(),
            price=data.price,
            description=data.description.strip(),
            image=image,
            active=data.active,
            created_by=current_user.id,
        )
        self.products.create(product)
        self.db.commit()
        return {
            "success": True,
            "message": "Producto creado exitosamente",
            "product": product_to_dict(product),
        }

    async def update_product(
        self,
        product_id: int,
        data: ProductUpdateRequest,
        image_file: UploadFile | None = None,
    ) -> dict:
        product = self.products.get_by_id(product_id)
        if not product:
            raise NotFoundError("Producto no encontrado")

        if data.name is not None:
            product.name = data.name.strip()
        if data.price is not None:
            product.price = data.price
        if data.description is not None:
            product.description = data.description.strip()
        if data.active is not None:
            product.active = data.active
        if image_file is not None or data.image is not None:
            product.image = await self._resolve_image(data.image or "", image_file)

        self.db.commit()
        self.db.refresh(product)
        return {
            "success": True,
            "message": "Producto actualizado exitosamente",
            "product": product_to_dict(product),
        }

    async def update_image(self, product_id: int, image_file: UploadFile | None) -> dict:
        product = self.products.get_by_id(product_id)
        if not product:
            raise NotFoundError("Producto no encontrado")
        if image_file is None:
            raise BusinessError("No se proporcionó ninguna imagen")
        product.image = await self._save_upload(image_file)
        self.db.commit()
        self.db.refresh(product)
        return {
            "success": True,
            "message": "Imagen actualizada exitosamente",
            "product": product_to_dict(product),
        }

    def delete_product(self, product_id: int) -> dict:
        product = self.products.get_by_id(product_id)
        if not product:
            raise NotFoundError("Producto no encontrado")
        self.products.delete(product)
        self.db.commit()
        return {"success": True, "message": "Producto eliminado exitosamente"}

    async def _resolve_image(self, image: str, image_file: UploadFile | None) -> str:
        if image_file is not None:
            return await self._save_upload(image_file)
        return image or ""

    async def _save_upload(self, image_file: UploadFile) -> str:
        if image_file.content_type not in self.settings.allowed_image_types:
            raise BusinessError(
                "Tipo de archivo no permitido. Solo se permiten imágenes (jpg, png, gif, webp)"
            )
        data = await image_file.read()
        if len(data) > self.settings.max_upload_size:
            raise BusinessError("El archivo es demasiado grande. Máximo 5MB")

        extension = Path(image_file.filename or "").suffix.lower()
        if extension not in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
            extension = ".webp"
        filename = f"product_{int(time.time() * 1000)}_{secrets.token_hex(4)}{extension}"
        path = self.settings.upload_dir / filename
        path.write_bytes(data)
        return f"{self.settings.public_upload_path}/{filename}"

