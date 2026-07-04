"""Enterprise authentication and authorization package.

Layers:
  1. domain.py       — Email domain validation (@supplymind.tech only)
  2. rbac.py         — Role-Based Access Control definitions
  3. audit.py        — Authentication audit logging
  4. dependencies.py — FastAPI dependency injection (JWT → domain → DB → RBAC)
  5. middleware.py    — Centralized auth middleware
"""

from backend.auth.domain import is_valid_domain, ALLOWED_DOMAIN
from backend.auth.rbac import Role, ROLE_PERMISSIONS, has_permission
from backend.auth.dependencies import get_current_user, require_role, require_permission

__all__ = [
    "is_valid_domain",
    "ALLOWED_DOMAIN",
    "Role",
    "ROLE_PERMISSIONS",
    "has_permission",
    "get_current_user",
    "require_role",
    "require_permission",
]
