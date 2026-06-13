from datetime import datetime, timedelta
from .config import GuardrailsConfig
from .models import GuardrailResult, GuardrailViolation, ViolationCategory, ViolationSeverity


class AuthGuardrails:
    def __init__(self, config: GuardrailsConfig | None = None):
        self.config = config or GuardrailsConfig()

    def check_token(self, token: str | None, user_id: str | None = None,
                    tenant_id: str | None = None) -> GuardrailResult:
        result = GuardrailResult(passed=True)

        if not token:
            result.violations.append(GuardrailViolation(
                category=ViolationCategory.UNAUTHORIZED_ACCESS,
                severity=ViolationSeverity.CRITICAL,
                user_id=user_id,
                tenant_id=tenant_id,
                source="auth_guardrails",
                details="No authentication token provided",
                blocked=True,
            ))
            result.passed = False
            return result

        if len(token) < 20:
            result.violations.append(GuardrailViolation(
                category=ViolationCategory.UNAUTHORIZED_ACCESS,
                severity=ViolationSeverity.HIGH,
                user_id=user_id,
                tenant_id=tenant_id,
                source="auth_guardrails",
                details="Token appears malformed (too short)",
                blocked=True,
            ))
            result.passed = False

        return result

    def check_authorization(self, user_roles: list[str] | None,
                            required_permission: str,
                            user_id: str | None = None,
                            tenant_id: str | None = None) -> GuardrailResult:
        result = GuardrailResult(passed=True)

        if not user_roles:
            result.violations.append(GuardrailViolation(
                category=ViolationCategory.UNAUTHORIZED_ACCESS,
                severity=ViolationSeverity.HIGH,
                user_id=user_id,
                tenant_id=tenant_id,
                source="auth_guardrails",
                details=f"No roles assigned, required: {required_permission}",
                blocked=True,
            ))
            result.passed = False
            return result

        role_hierarchy = {
            "admin": 100,
            "manager": 80,
            "analyst": 60,
            "viewer": 40,
            "user": 20,
        }

        permission_levels = {
            "admin": 100,
            "write": 60,
            "read": 40,
            "forecast": 60,
            "execute_agent": 60,
            "manage_tenant": 100,
        }

        required_level = permission_levels.get(required_permission, 40)
        max_user_level = max(role_hierarchy.get(r.lower(), 0) for r in (user_roles or []))

        if max_user_level < required_level:
            result.violations.append(GuardrailViolation(
                category=ViolationCategory.UNAUTHORIZED_ACCESS,
                severity=ViolationSeverity.HIGH,
                user_id=user_id,
                tenant_id=tenant_id,
                source="auth_guardrails",
                details=f"Insufficient permissions. Required: {required_permission} (level {required_level}), user max: {max_user_level}",
                blocked=True,
            ))
            result.passed = False

        return result
