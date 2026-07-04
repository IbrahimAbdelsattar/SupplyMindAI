import logging
import os
import jwt
from datetime import datetime, timezone
from fastapi import Request, HTTPException
from backend.knowledge.auth import AuthUser

logger = logging.getLogger("backend.auth")

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)

async def _get_current_user(request: Request) -> AuthUser:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authentication header")
    
    token = auth_header.split(" ")[1]
    
    try:
        # Decode without verification first to extract the user ID.
        # In a production app, verify the signature using Clerk's JWKS.
        unverified_claims = jwt.decode(token, options={"verify_signature": False})
        user_id = unverified_claims.get("sub", "unknown")
        
        # Clerk doesn't always include email by default unless requested in claims.
        email = unverified_claims.get("email", f"{user_id}@supplymind.ai")
        
        return AuthUser(
            id=user_id,
            email=email,
            user_metadata={"name": "Clerk User"},
            app_metadata={"role": "admin", "is_active": True},
            created_at=_utc_now().isoformat(),
            updated_at=_utc_now().isoformat(),
        )
    except Exception as e:
        logger.error(f"Failed to decode token: {e}")
        raise HTTPException(status_code=401, detail="Invalid Authentication token")
