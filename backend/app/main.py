from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.database.init_db import create_database, seed_database
from app.database.session import SessionLocal
from app.routers import admin_router, auth_router, product_router, user_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    create_database()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.mount(settings.public_upload_path, StaticFiles(directory=str(settings.upload_dir)), name="uploads")

app.include_router(auth_router.router, prefix=settings.api_prefix)
app.include_router(product_router.router, prefix=settings.api_prefix)
app.include_router(user_router.router, prefix=settings.api_prefix)
app.include_router(admin_router.router, prefix=settings.api_prefix)


@app.get("/")
def root():
    return {"success": True, "message": "Portal Productos API"}

