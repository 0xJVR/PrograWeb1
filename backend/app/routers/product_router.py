from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.role_dependencies import require_admin
from app.models.user import User
from app.routers.request_parsers import parse_product_create, parse_product_update
from app.schemas.common import MessageResponse
from app.schemas.product_schema import ProductResponse, ProductsListResponse
from app.services.product_service import ProductService


router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ProductsListResponse)
def list_products(db: Annotated[Session, Depends(get_db)]):
    return ProductService(db).list_products()


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Annotated[Session, Depends(get_db)]):
    return ProductService(db).get_product(product_id)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    parsed: Annotated[tuple, Depends(parse_product_create)],
    current_user: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    data, image_file = parsed
    return await ProductService(db).create_product(data, current_user, image_file)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    parsed: Annotated[tuple, Depends(parse_product_update)],
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    data, image_file = parsed
    return await ProductService(db).update_product(product_id, data, image_file)


@router.post("/{product_id}/image", response_model=ProductResponse)
async def update_product_image(
    product_id: int,
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
    image: UploadFile | None = File(default=None),
):
    return await ProductService(db).update_image(product_id, image)


@router.delete("/{product_id}", response_model=MessageResponse)
def delete_product(
    product_id: int,
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    return ProductService(db).delete_product(product_id)

