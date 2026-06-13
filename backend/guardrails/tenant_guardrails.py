from .config import GuardrailsConfig
from .models import GuardrailResult, GuardrailViolation, ViolationCategory, ViolationSeverity


class TenantGuardrails:
    def __init__(self, config: GuardrailsConfig | None = None):
        self.config = config or GuardrailsConfig()

    def check_tenant_access(self, user_tenant_id: str | None,
                            resource_tenant_id: str | None,
                            user_id: str | None = None,
                            session_id: str | None = None) -> GuardrailResult:
        result = GuardrailResult(passed=True)

        if not user_tenant_id:
            result.violations.append(GuardrailViolation(
                category=ViolationCategory.TENANT_VIOLATION,
                severity=ViolationSeverity.CRITICAL,
                user_id=user_id,
                tenant_id=None,
                session_id=session_id,
                source="tenant_guardrails",
                details="User has no assigned tenant",
                blocked=True,
            ))
            result.passed = False
            return result

        if resource_tenant_id is not None and user_tenant_id != resource_tenant_id:
            result.violations.append(GuardrailViolation(
                category=ViolationCategory.TENANT_VIOLATION,
                severity=ViolationSeverity.CRITICAL,
                user_id=user_id,
                tenant_id=user_tenant_id,
                session_id=session_id,
                source="tenant_guardrails",
                details=f"Tenant isolation violation: user is in tenant '{user_tenant_id}', "
                        f"but resource belongs to tenant '{resource_tenant_id}'",
                blocked=True,
            ))
            result.passed = False

        return result

    def check_agent_state_tenant(self, state: dict,
                                  expected_tenant_id: str | None,
                                  user_id: str | None = None,
                                  session_id: str | None = None) -> GuardrailResult:
        result = GuardrailResult(passed=True)

        state_tenant = state.get("tenant_id")

        if not expected_tenant_id and not state_tenant:
            return result

        if state_tenant and expected_tenant_id and state_tenant != expected_tenant_id:
            result.violations.append(GuardrailViolation(
                category=ViolationCategory.TENANT_VIOLATION,
                severity=ViolationSeverity.CRITICAL,
                user_id=user_id,
                tenant_id=expected_tenant_id,
                session_id=session_id,
                source="tenant_guardrails",
                details=f"Agent state tenant mismatch: state has '{state_tenant}', expected '{expected_tenant_id}'",
                blocked=True,
            ))
            result.passed = False

        return result
