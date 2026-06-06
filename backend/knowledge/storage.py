"""Local filesystem storage with per-user isolation."""

from __future__ import annotations

import mimetypes
import os
import shutil
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path, PurePosixPath
from typing import BinaryIO, Optional
from urllib.parse import quote

from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parents[2]
STORAGE_ROOT = Path(os.getenv("STORAGE_PATH", PROJECT_ROOT / "data" / "storage")).resolve()


class StorageBucket(str, Enum):
    DOCUMENTS = "documents"
    DATA_IMPORTS = "data-imports"
    REPORTS = "reports"
    FORECASTS = "forecasts"
    AVATARS = "avatars"


class FileMetadata(BaseModel):
    name: str
    size: int
    content_type: str
    created_at: str
    updated_at: str
    last_accessed_at: Optional[str] = None


class StorageResponse(BaseModel):
    success: bool
    message: str
    file_path: Optional[str] = None
    public_url: Optional[str] = None
    metadata: Optional[FileMetadata] = None


def is_storage_available() -> bool:
    try:
        STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
        return STORAGE_ROOT.is_dir()
    except OSError:
        return False


def _safe_relative(value: str) -> Path:
    normalized = PurePosixPath(value.replace("\\", "/"))
    if normalized.is_absolute() or ".." in normalized.parts:
        raise ValueError("Invalid storage path")
    parts = [part for part in normalized.parts if part not in {"", "."}]
    if not parts:
        raise ValueError("File path is required")
    return Path(*parts)


def _user_root(bucket: StorageBucket | str, user_id: str | None) -> Path:
    bucket_name = StorageBucket(bucket).value
    root = STORAGE_ROOT / bucket_name
    if user_id:
        root = root / _safe_relative(user_id)
    return root.resolve()


def _path(bucket: StorageBucket | str, file_path: str, user_id: str | None = None) -> Path:
    base = _user_root(bucket, user_id)
    target = (base / _safe_relative(file_path)).resolve()
    if not target.is_relative_to(base):
        raise ValueError("Invalid storage path")
    return target


async def upload_file(
    bucket: StorageBucket | str, file_path: str, file_data: bytes | BinaryIO,
    content_type: str = "application/octet-stream", user_id: Optional[str] = None,
) -> StorageResponse:
    try:
        target = _path(bucket, file_path, user_id)
        target.parent.mkdir(parents=True, exist_ok=True)
        data = file_data.read() if hasattr(file_data, "read") else file_data
        target.write_bytes(data)
        return StorageResponse(
            success=True, message="File uploaded successfully", file_path=file_path,
            public_url=get_public_url(bucket, file_path, user_id=user_id),
        )
    except Exception as exc:
        return StorageResponse(success=False, message=f"Upload failed: {exc}")


async def download_file(
    bucket: StorageBucket | str, file_path: str, user_id: Optional[str] = None,
) -> tuple[bytes, str] | None:
    try:
        target = _path(bucket, file_path, user_id)
        if not target.is_file():
            return None
        return target.read_bytes(), mimetypes.guess_type(target.name)[0] or "application/octet-stream"
    except (OSError, ValueError):
        return None


async def delete_file(
    bucket: StorageBucket | str, file_path: str, user_id: Optional[str] = None,
) -> StorageResponse:
    try:
        target = _path(bucket, file_path, user_id)
        if not target.is_file():
            return StorageResponse(success=False, message="File not found")
        target.unlink()
        return StorageResponse(success=True, message="File deleted successfully", file_path=file_path)
    except Exception as exc:
        return StorageResponse(success=False, message=f"Delete failed: {exc}")


def get_public_url(
    bucket: StorageBucket | str, file_path: str, expires_in: Optional[int] = None,
    user_id: Optional[str] = None,
) -> str | None:
    try:
        if not _path(bucket, file_path, user_id).is_file():
            return None
        bucket_name = StorageBucket(bucket).value
        return f"/api/v1/storage/files/{quote(file_path, safe='')}/download?bucket={quote(bucket_name)}"
    except (OSError, ValueError):
        return None


async def list_files(
    bucket: StorageBucket | str, folder_path: str = "", user_id: Optional[str] = None,
) -> list[FileMetadata]:
    try:
        base = _user_root(bucket, user_id)
        if folder_path:
            base = _path(bucket, folder_path, user_id)
        if not base.exists():
            return []
        files = []
        for item in sorted(path for path in base.rglob("*") if path.is_file()):
            stat = item.stat()
            files.append(
                FileMetadata(
                    name=item.relative_to(base).as_posix(),
                    size=stat.st_size,
                    content_type=mimetypes.guess_type(item.name)[0] or "application/octet-stream",
                    created_at=datetime.fromtimestamp(stat.st_ctime, timezone.utc).isoformat(),
                    updated_at=datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
                    last_accessed_at=datetime.fromtimestamp(stat.st_atime, timezone.utc).isoformat(),
                )
            )
        return files
    except (OSError, ValueError):
        return []


async def move_file(
    bucket: StorageBucket | str, from_path: str, to_path: str, user_id: Optional[str] = None,
) -> StorageResponse:
    try:
        source = _path(bucket, from_path, user_id)
        target = _path(bucket, to_path, user_id)
        target.parent.mkdir(parents=True, exist_ok=True)
        source.replace(target)
        return StorageResponse(success=True, message="File moved successfully", file_path=to_path)
    except Exception as exc:
        return StorageResponse(success=False, message=f"Move failed: {exc}")


async def copy_file(
    bucket: StorageBucket | str, from_path: str, to_path: str, user_id: Optional[str] = None,
) -> StorageResponse:
    try:
        source = _path(bucket, from_path, user_id)
        target = _path(bucket, to_path, user_id)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        return StorageResponse(success=True, message="File copied successfully", file_path=to_path)
    except Exception as exc:
        return StorageResponse(success=False, message=f"Copy failed: {exc}")
