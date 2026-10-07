from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional
from pathlib import Path

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # LLM
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = Field(default="gemini-3.5-flash-lite")
    EMBEDDING_MODEL: str = Field(default="intfloat/multilingual-e5-small")

    # Vector Stores
    VECTOR_PRIMARY: str = Field(default="chroma")
    VECTOR_FALLBACK: str = Field(default="none")
    CHROMA_PATH: str = Field(default="../data/chroma_db")
    CHROMA_COLLECTION: str = Field(default="regras_mei_e5")
    FIRESTORE_PROJECT_ID: Optional[str] = Field(default=None)
    FIRESTORE_COLLECTION: str = Field(default="regras_mei_chunks")
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = Field(default=None)
    CORPUS_VERSION: Optional[str] = Field(default=None)

    # RAG
    RAG_TOP_K: int = Field(default=4)
    RAG_MAX_DISTANCE: float = Field(default=0.135)
    RAG_MIN_SCORE: float = Field(default=0.865)
    RAG_PRIMARY_TIMEOUT_S: float = Field(default=1.5)
    RAG_BREAKER_FAILURES: int = Field(default=3)
    RAG_BREAKER_RESET_S: int = Field(default=60)

    # Gateway & Segurança
    INTERNAL_SERVICE_SECRET: str = Field(default="super_secreto_interno_arandue_2026")
    NODE_API_URL: str = Field(default="http://localhost:3001/api")

    # MCP Pool
    MCP_POOL_MAX: int = Field(default=50)
    MCP_IDLE_TTL_S: int = Field(default=600)

    # LLM Exec limits
    LLM_TIMEOUT_S: float = Field(default=30.0)
    LLM_MAX_TOOL_CALLS: int = Field(default=5)
    PORT: int = Field(default=8001)

settings = Settings()
