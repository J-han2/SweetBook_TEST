from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "DreamArchive API"
    api_prefix: str = "/api"
    database_url: str = "sqlite:////app/data/dreamarchive.db"
    frontend_origin: str = "http://localhost:3000"
    storage_root: str = "/app/storage"
    uploads_subdir: str = "uploads/runtime"
    placeholders_subdir: str = "placeholders"
    llm_model_path: str = "/app/models/qwen2.5-0.5b-instruct-q4_k_m.gguf"
    llm_chat_format: str | None = "chatml"
    llm_n_ctx: int = 2048

    @property
    def uploads_dir(self) -> str:
        return f"{self.storage_root}/{self.uploads_subdir}"

    @property
    def placeholders_dir(self) -> str:
        return f"{self.storage_root}/{self.placeholders_subdir}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
