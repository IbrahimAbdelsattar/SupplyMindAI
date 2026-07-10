"""Password hashing utilities (pure Python PBKDF2 with dynamic passlib fallback)."""
from __future__ import annotations

import secrets
import string
import hashlib

def hash_password(plain: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac('sha256', plain.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"pbkdf2:sha256:100000${salt}${dk.hex()}"


def verify_password(plain: str, hashed: str) -> bool:
    try:
        if hashed.startswith("pbkdf2:sha256:"):
            parts = hashed.split("$")
            iterations = int(parts[0].split(":")[2])
            salt = parts[1]
            hash_val = parts[2]
            dk = hashlib.pbkdf2_hmac('sha256', plain.encode('utf-8'), salt.encode('utf-8'), iterations)
            return dk.hex() == hash_val
        else:
            # Fallback to bcrypt verification if passlib is installed
            try:
                from passlib.context import CryptContext
                pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
                return pwd_context.verify(plain, hashed)
            except ImportError:
                return False
    except Exception:
        return False


def generate_temp_password(length: int = 14) -> str:
    """Generate a random temporary password for admin-created accounts."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))
