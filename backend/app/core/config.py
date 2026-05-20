from functools import lru_cache
from pathlib import Path
from os import getenv


class Settings:
    project_root: Path = Path(__file__).resolve().parents[3]
    app_name: str = "Portal Productos API"
    api_prefix: str = "/api"
    database_url: str = getenv(
        "DATABASE_URL",
        f"sqlite:///{project_root / 'backend' / 'app.db'}",
    )
    jwt_secret_key: str = getenv("JWT_SECRET", "cambia-esta-clave-en-produccion")
    jwt_algorithm: str = getenv("JWT_ALGORITHM", "HS256")
    jwt_expire_minutes: int = int(getenv("JWT_EXPIRE_MINUTES", "1440"))
    upload_dir: Path = Path(
        getenv("UPLOAD_DIR", str(project_root / "backend" / "app" / "static" / "uploads"))
    )
    public_upload_path: str = "/uploads"
    max_upload_size: int = 5 * 1024 * 1024
    allowed_image_types: set[str] = {"image/jpeg", "image/png", "image/gif", "image/webp"}


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    return settings

