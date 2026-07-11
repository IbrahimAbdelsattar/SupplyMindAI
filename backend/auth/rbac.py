"""Role-Based Access Control (RBAC) definitions.

Roles (from most to least privileged):
  admin   — Full system access, user management, settings
  manager — Operational access: manage inventory, view analytics, reports
  analyst — Read-heavy: dashboards, forecasting, insights, reports
  viewer  — Read-only: dashboards, basic reports
"""

from __future__ import annotations

import logging
from enum import Enum

logger = logging.getLogger("backend.auth.rbac")


class Role(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    ANALYST = "analyst"
    VIEWER = "viewer"


# Role hierarchy: higher index = more restricted
_ROLE_HIERARCHY: list[Role] = [Role.VIEWER, Role.ANALYST, Role.MANAGER, Role.ADMIN]


def _role_level(role: str) -> int:
    """Return numeric level for a role (higher = more privileged)."""
    try:
        return _ROLE_HIERARCHY.index(Role(role))
    except ValueError:
        return -1


# ─── Permission Definitions ────────────────────────────────────────────────────

class Permission:
    # Dashboard & read
    VIEW_DASHBOARD = "view_dashboard"
    VIEW_REPORTS = "view_reports"

    # Data
    VIEW_DATA = "view_data"
    MANAGE_DATA = "manage_data"

    # Inventory
    VIEW_INVENTORY = "view_inventory"
    MANAGE_INVENTORY = "manage_inventory"
    APPLY_INVENTORY = "apply_inventory"

    # Forecasting
    VIEW_FORECASTS = "view_forecasts"
    GENERATE_FORECASTS = "generate_forecasts"

    # Insights & AI
    VIEW_INSIGHTS = "view_insights"
    GENERATE_INSIGHTS = "generate_insights"
    USE_COPILOT = "use_copilot"

    # Reports
    GENERATE_REPORTS = "generate_reports"
    DOWNLOAD_REPORTS = "download_reports"

    # MLOps
    VIEW_MLOPS = "view_mlops"
    MANAGE_MLOPS = "manage_mlops"

    # User management (admin only)
    MANAGE_USERS = "manage_users"
    VIEW_USERS = "view_users"

    # System settings (admin only)
    MANAGE_SETTINGS = "manage_settings"
    VIEW_SETTINGS = "view_settings"


# ─── Role → Permissions Map ────────────────────────────────────────────────────

ROLE_PERMISSIONS: dict[str, set[str]] = {
    Role.ADMIN: {
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_REPORTS,
        Permission.VIEW_DATA,
        Permission.MANAGE_DATA,
        Permission.VIEW_INVENTORY,
        Permission.MANAGE_INVENTORY,
        Permission.APPLY_INVENTORY,
        Permission.VIEW_FORECASTS,
        Permission.GENERATE_FORECASTS,
        Permission.VIEW_INSIGHTS,
        Permission.GENERATE_INSIGHTS,
        Permission.USE_COPILOT,
        Permission.GENERATE_REPORTS,
        Permission.DOWNLOAD_REPORTS,
        Permission.VIEW_MLOPS,
        Permission.MANAGE_MLOPS,
        Permission.MANAGE_USERS,
        Permission.VIEW_USERS,
        Permission.MANAGE_SETTINGS,
        Permission.VIEW_SETTINGS,
    },
    Role.MANAGER: {
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_REPORTS,
        Permission.VIEW_DATA,
        Permission.MANAGE_DATA,
        Permission.VIEW_INVENTORY,
        Permission.MANAGE_INVENTORY,
        Permission.APPLY_INVENTORY,
        Permission.VIEW_FORECASTS,
        Permission.GENERATE_FORECASTS,
        Permission.VIEW_INSIGHTS,
        Permission.GENERATE_INSIGHTS,
        Permission.USE_COPILOT,
        Permission.GENERATE_REPORTS,
        Permission.DOWNLOAD_REPORTS,
        Permission.VIEW_MLOPS,
        Permission.VIEW_SETTINGS,
    },
    Role.ANALYST: {
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_DATA,
        Permission.VIEW_INVENTORY,
        Permission.VIEW_FORECASTS,
        Permission.GENERATE_FORECASTS,
        Permission.VIEW_INSIGHTS,
        Permission.GENERATE_INSIGHTS,
        Permission.USE_COPILOT,
        Permission.VIEW_MLOPS,
        Permission.VIEW_SETTINGS,
    },
    Role.VIEWER: {
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_REPORTS,
        Permission.VIEW_DATA,
        Permission.VIEW_INVENTORY,
        Permission.VIEW_FORECASTS,
        Permission.VIEW_INSIGHTS,
        Permission.VIEW_SETTINGS,
    },
}


def has_permission(role: str, permission: str) -> bool:
    """Check if a role has a specific permission."""
    perms = ROLE_PERMISSIONS.get(role, set())
    return permission in perms


def require_permission(role: str, permission: str) -> None:
    """Raise PermissionError if role lacks the given permission."""
    if not has_permission(role, permission):
        raise PermissionError(
            f"Role '{role}' does not have permission '{permission}'"
        )


def is_at_least_role(user_role: str, required_role: str) -> bool:
    """Check if user_role is at least as privileged as required_role."""
    return _role_level(user_role) >= _role_level(required_role)
