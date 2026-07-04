"""Legacy auth dependencies — re-exported from backend.auth.dependencies.

All new code should import directly from backend.auth.dependencies.
This file exists only to maintain backward compatibility.
"""

from backend.auth.dependencies import (
    get_current_user,
    require_permission,
    require_role,
    _utc_now,
)

_get_current_user = get_current_user

__all__ = ["get_current_user", "_get_current_user", "require_permission", "require_role", "_utc_now"]
