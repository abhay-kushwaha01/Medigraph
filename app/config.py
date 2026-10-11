"""
Application configuration loaded from environment variables via .env.
Secrets are never logged or returned in API responses.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Neo4j Aura connection settings
    neo4j_uri: str = ""
    neo4j_username: str = "neo4j"
    neo4j_password: str = ""
    neo4j_database: str = "neo4j"

    # CORS — comma-separated list of allowed frontend origins
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Application settings
    app_name: str = "MediGraph AI"
    app_version: str = "1.0.0"
    debug: bool = False

    # File upload settings
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 50
    allowed_extensions: str = "csv,json,xlsx,xls,pdf"

    # API security
    api_key_header: str = "X-API-Key"
    admin_api_key: str = ""        # Leave empty to disable key-based auth in dev

    # Pagination defaults
    default_graph_limit: int = 200
    max_graph_limit: int = 1000

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> List[str]:
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]

    @property
    def allowed_extension_set(self) -> set:
        return {e.strip().lower() for e in self.allowed_extensions.split(",") if e.strip()}

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    def is_neo4j_configured(self) -> bool:
        """Return True only when all three Neo4j credentials are non-empty."""
        return bool(self.neo4j_uri and self.neo4j_username and self.neo4j_password)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
