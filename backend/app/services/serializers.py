from app.models.product import Product
from app.models.user import User


def user_to_dict(user: User) -> dict:
    user_id = str(user.id)
    return {
        "id": user_id,
        "_id": user_id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "profileColor": user.profile_color,
        "createdAt": user.created_at,
        "updatedAt": user.updated_at,
    }


def product_to_dict(product: Product) -> dict:
    product_id = str(product.id)
    return {
        "id": product_id,
        "_id": product_id,
        "name": product.name,
        "price": product.price,
        "description": product.description,
        "image": product.image or "",
        "active": product.active,
        "createdBy": str(product.created_by) if product.created_by else None,
        "createdAt": product.created_at,
        "updatedAt": product.updated_at,
        "category": None,
    }

