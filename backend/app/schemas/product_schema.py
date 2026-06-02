from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, TypeAdapter, field_validator


http_url_adapter = TypeAdapter(HttpUrl)


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    price: float = Field(ge=0)
    description: str = Field(min_length=1, max_length=5000)
    image: str | None = Field(default=None, max_length=500)
    active: bool = True

    @field_validator("image")
    @classmethod
    def validate_image(cls, value: str | None) -> str | None:
        if value in (None, ""):
            return value
        if value.startswith("/uploads/"):
            return value
        http_url_adapter.validate_python(value)
        return value


class ProductCreateRequest(ProductBase):
    pass


class ProductUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    price: float | None = Field(default=None, ge=0)
    description: str | None = Field(default=None, min_length=1, max_length=5000)
    image: str | None = Field(default=None, max_length=500)
    active: bool | None = None

    @field_validator("image")
    @classmethod
    def validate_image(cls, value: str | None) -> str | None:
        if value in (None, ""):
            return value
        if value.startswith("/uploads/"):
            return value
        http_url_adapter.validate_python(value)
        return value


class ProductRead(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    mongo_id: str = Field(alias="_id")
    name: str
    price: float
    description: str
    image: str
    active: bool
    createdBy: str | None = None
    createdAt: datetime | None = None
    updatedAt: datetime | None = None
    category: str | None = None


class ProductResponse(BaseModel):
    success: bool = True
    message: str | None = None
    product: ProductRead


class ProductsListResponse(BaseModel):
    success: bool = True
    products: list[ProductRead]
    pagination: dict | None = None

