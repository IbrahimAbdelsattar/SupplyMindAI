"""Application settings for the inventory RAG backend."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_OPENROUTER_MODEL = "openai/gpt-oss-120b:free"
DEFAULT_OPENROUTER_FALLBACK_MODEL = "openai/gpt-oss-120b:free"
DEFAULT_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def _load_dotenv(dotenv_path: Path) -> None:
    if not dotenv_path.exists():
        return

    for raw_line in dotenv_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _read_secret_file(secret_file: Path) -> str | None:
    if not secret_file.exists():
        return None

    text = secret_file.read_text(encoding="utf-8")
    match = re.search(r"api_key\s*=\s*(\S+)", text, flags=re.IGNORECASE)
    if match:
        return match.group(1).strip()

    stripped = text.strip()
    return stripped or None


def _read_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _read_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    return int(value.strip())


def _read_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    return float(value.strip())


@dataclass(frozen=True)
class Settings:
    project_root: Path
    data_dir: Path
    all_docs_path: Path
    daily_docs_path: Path
    chroma_dir: Path
    secret_file: Path
    openrouter_api_key: str | None
    openrouter_base_url: str
    openrouter_model: str
    openrouter_fallback_model: str
    openrouter_site_url: str
    openrouter_app_name: str
    openrouter_timeout_seconds: float
    openrouter_max_tokens: int
    embedding_model: str
    chroma_collection_name: str
    chroma_legacy_collection_name: str
    bootstrap_chroma_on_startup: bool
    query_result_count: int
    rebuild_batch_size: int


@lru_cache(maxsize=1)
def load_settings() -> Settings:
    project_root = Path(__file__).resolve().parents[3]
    data_dir = project_root / "data"
    secret_file = project_root / ".txt"
    _load_dotenv(project_root / ".env")

    openrouter_api_key = os.getenv("RAG_API_KEY") or os.getenv("OPENROUTER_API_KEY") or _read_secret_file(secret_file)

    return Settings(
        project_root=project_root,
        data_dir=data_dir,
        all_docs_path=data_dir / "inventory_rag_all_docs.jsonl",
        daily_docs_path=data_dir / "inventory_rag_daily_docs.jsonl",
        chroma_dir=data_dir / "chroma_db",
        secret_file=secret_file,
        openrouter_api_key=openrouter_api_key,
        openrouter_base_url=os.getenv("OPENROUTER_BASE_URL", DEFAULT_OPENROUTER_BASE_URL).rstrip("/"),
        openrouter_model=os.getenv("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL),
        openrouter_fallback_model=os.getenv(
            "OPENROUTER_FALLBACK_MODEL",
            DEFAULT_OPENROUTER_FALLBACK_MODEL,
        ),
        openrouter_site_url=os.getenv("OPENROUTER_SITE_URL", "http://localhost:8080"),
        openrouter_app_name=os.getenv("OPENROUTER_APP_NAME", "Ask Stock Mind"),
        openrouter_timeout_seconds=_read_float("OPENROUTER_TIMEOUT_SECONDS", 25.0),
        openrouter_max_tokens=_read_int("OPENROUTER_MAX_TOKENS", 220),
        embedding_model=os.getenv("EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL),
        chroma_collection_name=os.getenv("CHROMA_COLLECTION_NAME", "inventory_rag_docs"),
        chroma_legacy_collection_name=os.getenv("CHROMA_LEGACY_COLLECTION_NAME", "langchain"),
        bootstrap_chroma_on_startup=_read_bool("BOOTSTRAP_CHROMA_ON_STARTUP", True),
        query_result_count=_read_int("QUERY_RESULT_COUNT", 3),
        rebuild_batch_size=_read_int("REBUILD_BATCH_SIZE", 128),
    )
