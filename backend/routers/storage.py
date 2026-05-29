"""Storage router — Supabase storage file management endpoints."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, HTTPException, status, UploadFile, File, Query
from fastapi.responses import FileResponse, StreamingResponse

from backend.knowledge.storage import (
    upload_file,
    download_file,
    delete_file,
    get_public_url,
    list_files,
    move_file,
    copy_file,
    StorageBucket,
    is_supabase_storage_available,
)
from backend.knowledge.auth import get_user_from_token

router = APIRouter(prefix="/api/v1/storage", tags=["storage"])


# ─────────────────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────────────────

async def verify_storage_configured() -> None:
    """Verify that Supabase storage is configured."""
    if not is_supabase_storage_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Storage service not available. Please configure Supabase."
        )


async def get_current_user_id(authorization: str = None) -> str:
    """Extract user ID from authorization token."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )
    
    try:
        # Extract token from "Bearer <token>"
        scheme, token = authorization.split(" ")
        if scheme.lower() != "bearer":
            raise ValueError("Invalid authorization scheme")
        
        user = await get_user_from_token(token)
        return user.id
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


# ─────────────────────────────────────────────────────────────────────────
# Document Upload Endpoints
# ─────────────────────────────────────────────────────────────────────────

@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    authorization: str = None,
) -> dict[str, Any]:
    """Upload document to storage.
    
    Supports: PDF, DOCX, XLSX, CSV, TXT, JSON
    Max size: 20MB
    """
    await verify_storage_configured()
    
    try:
        user_id = await get_current_user_id(authorization)
        
        # Validate file type
        allowed_types = {
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv",
            "text/plain",
            "application/json",
        }
        
        if file.content_type not in allowed_types:
            raise ValueError(f"File type not supported: {file.content_type}")
        
        # Read file
        content = await file.read()
        if len(content) > 20 * 1024 * 1024:  # 20MB
            raise ValueError("File size exceeds 20MB limit")
        
        # Upload
        response = await upload_file(
            bucket=StorageBucket.DOCUMENTS,
            file_path=file.filename,
            file_data=content,
            content_type=file.content_type,
            user_id=user_id,
        )
        
        if response.success:
            # Get public URL
            public_url = get_public_url(
                StorageBucket.DOCUMENTS,
                file.filename,
                user_id=user_id
            )
            
            return {
                "success": True,
                "message": "Document uploaded successfully",
                "file_name": file.filename,
                "file_size": len(content),
                "content_type": file.content_type,
                "public_url": public_url,
            }
        else:
            raise ValueError(response.message)
    
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload document"
        )


@router.post("/data/upload")
async def upload_data_file(
    file: UploadFile = File(...),
    authorization: str = None,
) -> dict[str, Any]:
    """Upload data file (CSV, Excel) for import.
    
    Supports: CSV, XLSX
    Max size: 50MB
    """
    await verify_storage_configured()
    
    try:
        user_id = await get_current_user_id(authorization)
        
        # Validate file type
        allowed_types = {
            "text/csv",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
        
        if file.content_type not in allowed_types:
            raise ValueError(f"File type not supported. Use CSV or XLSX.")
        
        # Read file
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:  # 50MB
            raise ValueError("File size exceeds 50MB limit")
        
        # Upload
        response = await upload_file(
            bucket=StorageBucket.DATA_IMPORTS,
            file_path=file.filename,
            file_data=content,
            content_type=file.content_type,
            user_id=user_id,
        )
        
        if response.success:
            return {
                "success": True,
                "message": "Data file uploaded successfully",
                "file_name": file.filename,
                "file_size": len(content),
            }
        else:
            raise ValueError(response.message)
    
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload data file"
        )


@router.post("/reports/upload")
async def upload_report(
    file: UploadFile = File(...),
    authorization: str = None,
) -> dict[str, Any]:
    """Upload report file (PDF, DOCX).
    
    Supports: PDF, DOCX
    Max size: 20MB
    """
    await verify_storage_configured()
    
    try:
        user_id = await get_current_user_id(authorization)
        
        # Validate file type
        allowed_types = {
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
        
        if file.content_type not in allowed_types:
            raise ValueError("Only PDF and DOCX files are supported for reports")
        
        # Read file
        content = await file.read()
        if len(content) > 20 * 1024 * 1024:  # 20MB
            raise ValueError("File size exceeds 20MB limit")
        
        # Upload
        response = await upload_file(
            bucket=StorageBucket.REPORTS,
            file_path=file.filename,
            file_data=content,
            content_type=file.content_type,
            user_id=user_id,
        )
        
        if response.success:
            return {
                "success": True,
                "message": "Report uploaded successfully",
                "file_name": file.filename,
                "file_size": len(content),
            }
        else:
            raise ValueError(response.message)
    
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload report"
        )


# ─────────────────────────────────────────────────────────────────────────
# File Management Endpoints
# ─────────────────────────────────────────────────────────────────────────

@router.get("/files")
async def list_user_files(
    bucket: StorageBucket = Query(StorageBucket.DOCUMENTS),
    folder: str = Query(""),
    authorization: str = None,
) -> dict[str, Any]:
    """List files in user's storage bucket."""
    await verify_storage_configured()
    
    try:
        user_id = await get_current_user_id(authorization)
        
        files = await list_files(
            bucket=bucket,
            folder_path=folder,
            user_id=user_id,
        )
        
        return {
            "success": True,
            "bucket": bucket,
            "folder": folder,
            "files": [f.model_dump() for f in files],
            "count": len(files),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list files"
        )


@router.delete("/files/{file_name}")
async def delete_user_file(
    file_name: str,
    bucket: StorageBucket = Query(StorageBucket.DOCUMENTS),
    authorization: str = None,
) -> dict[str, str]:
    """Delete file from storage."""
    await verify_storage_configured()
    
    try:
        user_id = await get_current_user_id(authorization)
        
        response = await delete_file(
            bucket=bucket,
            file_path=file_name,
            user_id=user_id,
        )
        
        if response.success:
            return {
                "success": True,
                "message": "File deleted successfully",
            }
        else:
            raise ValueError(response.message)
    
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file"
        )


@router.post("/files/{file_name}/url")
async def get_file_url(
    file_name: str,
    bucket: StorageBucket = Query(StorageBucket.DOCUMENTS),
    expires_in: int = Query(3600, description="URL expiration in seconds"),
    authorization: str = None,
) -> dict[str, Any]:
    """Get public or signed URL for file."""
    await verify_storage_configured()
    
    try:
        user_id = await get_current_user_id(authorization)
        
        # For signed URLs with expiration
        url = get_public_url(
            bucket=bucket,
            file_path=file_name,
            expires_in=expires_in,
            user_id=user_id,
        )
        
        if not url:
            raise ValueError("Failed to generate URL")
        
        return {
            "success": True,
            "url": url,
            "expires_in": expires_in,
        }
    
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate URL"
        )


# ─────────────────────────────────────────────────────────────────────────
# Storage Health Check
# ─────────────────────────────────────────────────────────────────────────

@router.get("/health")
async def storage_health() -> dict[str, Any]:
    """Check storage service health."""
    is_available = is_supabase_storage_available()
    
    return {
        "status": "healthy" if is_available else "unavailable",
        "storage_available": is_available,
        "message": "Storage service is available" if is_available else "Storage not configured"
    }
