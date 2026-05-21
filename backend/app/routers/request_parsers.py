from fastapi import Request, UploadFile
from pydantic import ValidationError

from app.core.exceptions import ValidationFailed
from app.schemas.product_schema import ProductCreateRequest, ProductUpdateRequest


def parse_bool(value) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    return str(value).lower() not in {"false", "0", "no", "off"}


async def parse_product_create(request: Request) -> tuple[ProductCreateRequest, UploadFile | None]:
    try:
        if request.headers.get("content-type", "").startswith("multipart/form-data"):
            form = await request.form()
            image_value = form.get("image")
            image_file = image_value if hasattr(image_value, "read") and hasattr(image_value, "filename") else None
            payload = {
                "name": form.get("name"),
                "price": form.get("price"),
                "description": form.get("description"),
                "active": parse_bool(form.get("active")),
            }
            if isinstance(image_value, str):
                payload["image"] = image_value
            return ProductCreateRequest.model_validate(payload), image_file
        return ProductCreateRequest.model_validate(await request.json()), None
    except ValidationError as exc:
        raise ValidationFailed(details=exc.errors()) from exc


async def parse_product_update(request: Request) -> tuple[ProductUpdateRequest, UploadFile | None]:
    try:
        if request.headers.get("content-type", "").startswith("multipart/form-data"):
            form = await request.form()
            image_value = form.get("image")
            image_file = image_value if hasattr(image_value, "read") and hasattr(image_value, "filename") else None
            payload = {}
            for field in ("name", "price", "description"):
                if field in form:
                    payload[field] = form.get(field)
            if "active" in form:
                payload["active"] = parse_bool(form.get("active"))
            if isinstance(image_value, str):
                payload["image"] = image_value
            return ProductUpdateRequest.model_validate(payload), image_file
        return ProductUpdateRequest.model_validate(await request.json()), None
    except ValidationError as exc:
        raise ValidationFailed(details=exc.errors()) from exc

