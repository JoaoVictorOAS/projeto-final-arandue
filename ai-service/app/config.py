import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional
from pathlib import Path

def _resolve_default_node_api_url() -> str:
    explicit = os.getenv("NODE_API_URL") or os.getenv("BACKEND_URL")
    if explicit:
        return explicit.rstrip("/")
    vercel_url = os.getenv("VERCEL_URL") or os.getenv("VERCEL_PROJECT_PRODUCTION_URL")
    if vercel_url:
        clean_host = vercel_url.replace("http://", "").replace("https://", "").rstrip("/")
        protocol = "http" if "localhost" in clean_host else "https"
        return f"{protocol}://{clean_host}/api"
    return "http://localhost:3001/api"

def _resolve_chroma_path() -> str:
    service_path = Path(__file__).resolve().parent.parent / "chroma_db"
    if service_path.exists():
        return str(service_path)
    root_path = Path(__file__).resolve().parent.parent.parent / "data" / "chroma_db"
    if root_path.exists():
        return str(root_path)
    return str(service_path)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # LLM
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = Field(default="gemini-3-flash-preview")
    EMBEDDING_MODEL: str = Field(default="gemini-embedding-001")

    # Vector Stores
    VECTOR_PRIMARY: str = Field(default="chroma")
    VECTOR_FALLBACK: str = Field(default="none")
    CHROMA_PATH: str = Field(default_factory=_resolve_chroma_path)
    CHROMA_COLLECTION: str = Field(default="regras_mei_gemini")
    FIRESTORE_PROJECT_ID: Optional[str] = Field(default=None)
    FIRESTORE_COLLECTION: str = Field(default="regras_mei_chunks")
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = Field(default=None)
    CORPUS_VERSION: Optional[str] = Field(default=None)

    # RAG
    RAG_TOP_K: int = Field(default=4)
    RAG_MAX_DISTANCE: float = Field(default=0.32)
    RAG_MIN_SCORE: float = Field(default=0.68)
    RAG_PRIMARY_TIMEOUT_S: float = Field(default=1.5)
    RAG_BREAKER_FAILURES: int = Field(default=3)
    RAG_BREAKER_RESET_S: int = Field(default=60)

    # Gateway & Segurança
    INTERNAL_SERVICE_SECRET: str = Field(default="super_secreto_interno_arandue_2026")
    NODE_API_URL: str = Field(
        default_factory=_resolve_default_node_api_url
    )

    @property
    def node_api_base_url(self) -> str:
        url = (self.NODE_API_URL or _resolve_default_node_api_url()).rstrip("/")
        return url if url.endswith("/api") else f"{url}/api"

    # MCP Pool
    MCP_POOL_MAX: int = Field(default=50)
    MCP_IDLE_TTL_S: int = Field(default=600)

    # LLM Exec limits
    LLM_TIMEOUT_S: float = Field(default=120.0)
    LLM_MAX_TOOL_CALLS: int = Field(default=15)
    PORT: int = Field(default=8001)

settings = Settings()
