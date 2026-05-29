"""Supabase Storage Manager — handles file uploads, downloads, and management."""

from __future__ import annotations

import logging
from io import BytesIO
from pathlib import Path
from typing import Any, Optional, BinaryIO
from datetime import timedelta
from enum import Enum

from pydantic import BaseModel

LOGGER = logging.getLogger(__name__)


class StorageBucket(str, Enum):
    """Available storage buckets."""
    DOCUMENTS = "documents"
    DATA_IMPORTS = "data-imports"
    REPORTS = "reports"
    FORECASTS = "forecasts"
    AVATARS = "avatars"


class FileMetadata(BaseModel):
    """File metadata."""
    name: str
    size: int
    content_type: str
    created_at: str
    updated_at: str
    last_accessed_at: Optional[str] = None


class StorageResponse(BaseModel):
    """Storage operation response."""
    success: bool
    message: str
    file_path: Optional[str] = None
    public_url: Optional[str] = None
    metadata: Optional[FileMetadata] = None


def get_supabase_storage_client() -> Any:
    """Get Supabase storage client."""
    try:
        from supabase import create_client
        import os
        
        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        
        if not supabase_url or not supabase_service_role_key:
            LOGGER.warning("Supabase storage not configured (missing URL or SERVICE_ROLE_KEY)")
            return None
            
        return create_client(supabase_url, supabase_service_role_key)
    except Exception as exc:
        LOGGER.exception("Failed to initialize Supabase storage client: %s", exc)
        return None


def is_supabase_storage_available() -> bool:
    """Check if Supabase storage is available."""
    return get_supabase_storage_client() is not None


async def upload_file(
    bucket: StorageBucket | str,
    file_path: str,
    file_data: bytes | BinaryIO,
    content_type: str = "application/octet-stream",
    user_id: Optional[str] = None,
) -> StorageResponse:
    """Upload file to Supabase storage.
    
    Args:
        bucket: Storage bucket name
        file_path: Path in bucket (e.g., "user123/report.pdf")
        file_data: File bytes or file object
        content_type: MIME type of file
        user_id: Optional user ID for access control
    
    Returns:
        StorageResponse with upload result
    """
    client = get_supabase_storage_client()
    if not client:
        return StorageResponse(
            success=False,
            message="Supabase storage not configured"
        )
    
    try:
        # Convert file object to bytes if needed
        if hasattr(file_data, "read"):
            file_bytes = file_data.read()
        else:
            file_bytes = file_data
        
        # Add user prefix if user_id provided
        if user_id:
            file_path = f"{user_id}/{file_path}"
        
        # Upload file
        response = client.storage.from_(str(bucket)).upload(
            file_path,
            file_bytes,
            {
                "content-type": content_type,
            }
        )
        
        LOGGER.info(f"File uploaded: {bucket}/{file_path}")
        
        return StorageResponse(
            success=True,
            message="File uploaded successfully",
            file_path=response.path if hasattr(response, "path") else file_path,
            public_url=get_public_url(str(bucket), file_path) if hasattr(response, "path") else None,
        )
    except Exception as exc:
        LOGGER.error(f"Upload failed for {bucket}/{file_path}: {exc}")
        return StorageResponse(
            success=False,
            message=f"Upload failed: {str(exc)}"
        )


async def download_file(
    bucket: StorageBucket | str,
    file_path: str,
    user_id: Optional[str] = None,
) -> tuple[bytes, str] | None:
    """Download file from Supabase storage.
    
    Args:
        bucket: Storage bucket name
        file_path: Path in bucket
        user_id: Optional user ID for access control
    
    Returns:
        Tuple of (file_bytes, content_type) or None if not found
    """
    client = get_supabase_storage_client()
    if not client:
        LOGGER.warning("Supabase storage not configured")
        return None
    
    try:
        # Add user prefix if user_id provided
        if user_id:
            file_path = f"{user_id}/{file_path}"
        
        # Download file
        response = client.storage.from_(str(bucket)).download(file_path)
        
        LOGGER.info(f"File downloaded: {bucket}/{file_path}")
        
        return response, "application/octet-stream"
    except Exception as exc:
        LOGGER.error(f"Download failed for {bucket}/{file_path}: {exc}")
        return None


async def delete_file(
    bucket: StorageBucket | str,
    file_path: str,
    user_id: Optional[str] = None,
) -> StorageResponse:
    """Delete file from Supabase storage.
    
    Args:
        bucket: Storage bucket name
        file_path: Path in bucket
        user_id: Optional user ID for access control
    
    Returns:
        StorageResponse with delete result
    """
    client = get_supabase_storage_client()
    if not client:
        return StorageResponse(
            success=False,
            message="Supabase storage not configured"
        )
    
    try:
        # Add user prefix if user_id provided
        if user_id:
            file_path = f"{user_id}/{file_path}"
        
        # Delete file
        client.storage.from_(str(bucket)).remove([file_path])
        
        LOGGER.info(f"File deleted: {bucket}/{file_path}")
        
        return StorageResponse(
            success=True,
            message="File deleted successfully",
            file_path=file_path,
        )
    except Exception as exc:
        LOGGER.error(f"Delete failed for {bucket}/{file_path}: {exc}")
        return StorageResponse(
            success=False,
            message=f"Delete failed: {str(exc)}"
        )


def get_public_url(
    bucket: StorageBucket | str,
    file_path: str,
    expires_in: Optional[int] = None,
    user_id: Optional[str] = None,
) -> str | None:
    """Get public URL for file.
    
    Args:
        bucket: Storage bucket name
        file_path: Path in bucket
        expires_in: Expiration time in seconds (for signed URLs)
        user_id: Optional user ID for access control
    
    Returns:
        Public URL or signed URL, or None if not available
    """
    client = get_supabase_storage_client()
    if not client:
        return None
    
    try:
        # Add user prefix if user_id provided
        if user_id:
            file_path = f"{user_id}/{file_path}"
        
        if expires_in:
            # Generate signed URL with expiration
            url = client.storage.from_(str(bucket)).create_signed_url(
                file_path,
                expires_in
            )
            return url.get("signedURL") if isinstance(url, dict) else str(url)
        else:
            # Generate public URL
            url = client.storage.from_(str(bucket)).get_public_url(file_path)
            return url.get("publicURL") if isinstance(url, dict) else str(url)
    except Exception as exc:
        LOGGER.error(f"Failed to get URL for {bucket}/{file_path}: {exc}")
        return None


async def list_files(
    bucket: StorageBucket | str,
    folder_path: str = "",
    user_id: Optional[str] = None,
) -> list[FileMetadata]:
    """List files in storage bucket.
    
    Args:
        bucket: Storage bucket name
        folder_path: Folder path to list
        user_id: Optional user ID for access control
    
    Returns:
        List of FileMetadata objects
    """
    client = get_supabase_storage_client()
    if not client:
        return []
    
    try:
        # Add user prefix if user_id provided
        if user_id:
            folder_path = f"{user_id}/{folder_path}" if folder_path else str(user_id)
        
        # List files
        response = client.storage.from_(str(bucket)).list(folder_path)
        
        files = []
        if isinstance(response, list):
            for item in response:
                if item.get("name") and not item.get("id") == "RLS":
                    files.append(FileMetadata(
                        name=item.get("name", ""),
                        size=item.get("metadata", {}).get("size", 0),
                        content_type=item.get("metadata", {}).get("mimetype", "application/octet-stream"),
                        created_at=item.get("created_at", ""),
                        updated_at=item.get("updated_at", ""),
                    ))
        
        LOGGER.info(f"Listed {len(files)} files in {bucket}/{folder_path}")
        return files
    except Exception as exc:
        LOGGER.error(f"Failed to list files in {bucket}/{folder_path}: {exc}")
        return []


async def move_file(
    bucket: StorageBucket | str,
    from_path: str,
    to_path: str,
    user_id: Optional[str] = None,
) -> StorageResponse:
    """Move/rename file in storage.
    
    Args:
        bucket: Storage bucket name
        from_path: Source path
        to_path: Destination path
        user_id: Optional user ID for access control
    
    Returns:
        StorageResponse with move result
    """
    client = get_supabase_storage_client()
    if not client:
        return StorageResponse(
            success=False,
            message="Supabase storage not configured"
        )
    
    try:
        # Add user prefix if user_id provided
        if user_id:
            from_path = f"{user_id}/{from_path}"
            to_path = f"{user_id}/{to_path}"
        
        # Move file
        client.storage.from_(str(bucket)).move(from_path, to_path)
        
        LOGGER.info(f"File moved: {bucket}/{from_path} -> {bucket}/{to_path}")
        
        return StorageResponse(
            success=True,
            message="File moved successfully",
            file_path=to_path,
        )
    except Exception as exc:
        LOGGER.error(f"Move failed for {bucket}/{from_path}: {exc}")
        return StorageResponse(
            success=False,
            message=f"Move failed: {str(exc)}"
        )


async def copy_file(
    bucket: StorageBucket | str,
    from_path: str,
    to_path: str,
    user_id: Optional[str] = None,
) -> StorageResponse:
    """Copy file in storage.
    
    Args:
        bucket: Storage bucket name
        from_path: Source path
        to_path: Destination path
        user_id: Optional user ID for access control
    
    Returns:
        StorageResponse with copy result
    """
    client = get_supabase_storage_client()
    if not client:
        return StorageResponse(
            success=False,
            message="Supabase storage not configured"
        )
    
    try:
        # Download source file
        file_data = await download_file(bucket, from_path, user_id)
        if not file_data:
            return StorageResponse(
                success=False,
                message="Source file not found"
            )
        
        # Upload to destination
        return await upload_file(bucket, to_path, file_data[0], file_data[1], user_id)
    except Exception as exc:
        LOGGER.error(f"Copy failed for {bucket}/{from_path}: {exc}")
        return StorageResponse(
            success=False,
            message=f"Copy failed: {str(exc)}"
        )
