"""Authentication & authorization audit logging.

Events logged:
  - login_success:      User authenticated successfully
  - login_failure:      JWT verification failed
  - domain_rejected:    Email domain is not @supplymind.tech
  - account_disabled:   User exists in DB but is_active=False
  - permission_denied:  User lacks required permission
  - role_changed:       User role was modified (admin action)
  - user_created:       New user record created
  - user_deactivated:   User account deactivated
"""

from __future__ import annotations

import logging
import json
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger("backend.auth.audit")


def _audit_event(
    event: str,
    *,
    user_id: str | None = None,
    email: str | None = None,
    role: str | None = None,
    detail: str | None = None,
    ip_address: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Emit a structured audit log line.

    Format: AUTH_AUDIT | <event> | user=<id> email=<addr> role=<r> ip=<ip> | <detail> | <extra_json>
    """
    parts = [
        "AUTH_AUDIT",
        event,
        f"user={user_id or '-'}",
        f"email={email or '-'}",
        f"role={role or '-'}",
        f"ip={ip_address or '-'}",
    ]
    if detail:
        parts.append(detail)

    line = " | ".join(parts)

    if extra:
        try:
            extra_str = json.dumps(extra, default=str)
            line += f" | {extra_str}"
        except Exception:
            pass

    logger.info(line)


def log_login_success(
    user_id: str,
    email: str,
    role: str,
    ip_address: str | None = None,
) -> None:
    _audit_event(
        "LOGIN_SUCCESS",
        user_id=user_id,
        email=email,
        role=role,
        ip_address=ip_address,
    )


def log_login_failure(
    reason: str,
    email: str | None = None,
    ip_address: str | None = None,
) -> None:
    _audit_event(
        "LOGIN_FAILURE",
        email=email,
        detail=reason,
        ip_address=ip_address,
    )


def log_domain_rejected(
    email: str,
    ip_address: str | None = None,
) -> None:
    _audit_event(
        "DOMAIN_REJECTED",
        email=email,
        detail=f"Non-corporate email rejected: {email}",
        ip_address=ip_address,
    )


def log_account_disabled(
    user_id: str,
    email: str,
    ip_address: str | None = None,
) -> None:
    _audit_event(
        "ACCOUNT_DISABLED",
        user_id=user_id,
        email=email,
        detail="Login attempt on deactivated account",
        ip_address=ip_address,
    )


def log_permission_denied(
    user_id: str,
    email: str,
    role: str,
    permission: str,
    resource: str | None = None,
    ip_address: str | None = None,
) -> None:
    _audit_event(
        "PERMISSION_DENIED",
        user_id=user_id,
        email=email,
        role=role,
        detail=f"Missing permission '{permission}' for resource '{resource or '-'}'",
        ip_address=ip_address,
    )


def log_role_changed(
    admin_id: str,
    target_user_id: str,
    old_role: str,
    new_role: str,
) -> None:
    _audit_event(
        "ROLE_CHANGED",
        user_id=admin_id,
        detail=f"Changed user {target_user_id} role: {old_role} → {new_role}",
        extra={"target_user_id": target_user_id, "old_role": old_role, "new_role": new_role},
    )


def log_user_created(
    admin_id: str,
    new_user_id: str,
    email: str,
    role: str,
) -> None:
    _audit_event(
        "USER_CREATED",
        user_id=admin_id,
        email=email,
        role=role,
        detail=f"Admin created user {new_user_id}",
        extra={"new_user_id": new_user_id},
    )


def log_user_deactivated(
    admin_id: str,
    target_user_id: str,
    email: str,
) -> None:
    _audit_event(
        "USER_DEACTIVATED",
        user_id=admin_id,
        email=email,
        detail=f"Admin deactivated user {target_user_id}",
        extra={"target_user_id": target_user_id},
    )


def log_password_reset(
    admin_id: str,
    target_user_id: str,
    email: str,
) -> None:
    _audit_event(
        "PASSWORD_RESET",
        user_id=admin_id,
        email=email,
        detail=f"Admin forced a password reset for user {target_user_id}",
        extra={"target_user_id": target_user_id},
    )
