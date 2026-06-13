from .config import GuardrailsConfig
from .models import GuardrailResult, GuardrailViolation, ViolationCategory, ViolationSeverity


class AgentGuardrails:
    ALLOWED_TOOLS = {
        "executive_insights",
        "forecasting_agent",
        "inventory_agent",
        "rag_agent",
        "mlops_agent",
        "supervisor",
    }

    SENSITIVE_TOOLS = {
        "mlops_agent": ViolationSeverity.MEDIUM,
    }

    def __init__(self, config: GuardrailsConfig | None = None):
        self.config = config or GuardrailsConfig()

    def check_agent_step(self, step_count: int, user_id: str | None = None,
                          tenant_id: str | None = None) -> GuardrailResult:
        result = GuardrailResult(passed=True)

        if step_count > self.config.agent_max_steps:
            result.violations.append(GuardrailViolation(
                category=ViolationCategory.AGENT_PERMISSION,
                severity=ViolationSeverity.HIGH,
                user_id=user_id,
                tenant_id=tenant_id,
                source="agent_guardrails",
                details=f"Agent step limit exceeded: {step_count} > {self.config.agent_max_steps}",
                blocked=True,
            ))

        result.passed = not result.blocked
        return result

    def check_tool_access(self, tool_name: str, user_roles: list[str] | None = None,
                           user_id: str | None = None, tenant_id: str | None = None) -> GuardrailResult:
        result = GuardrailResult(passed=True)

        if tool_name not in self.ALLOWED_TOOLS:
            result.violations.append(GuardrailViolation(
                category=ViolationCategory.AGENT_PERMISSION,
                severity=ViolationSeverity.HIGH,
                user_id=user_id,
                tenant_id=tenant_id,
                source="agent_guardrails",
                details=f"Agent tried to access unknown tool: '{tool_name}'",
                blocked=True,
            ))
            result.passed = False
            return result

        if tool_name in self.SENSITIVE_TOOLS:
            severity = self.SENSITIVE_TOOLS[tool_name]
            if not user_roles:
                result.violations.append(GuardrailViolation(
                    category=ViolationCategory.AGENT_PERMISSION,
                    severity=severity,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    source="agent_guardrails",
                    details=f"Agent tried to access sensitive tool '{tool_name}' without role info",
                    blocked=True,
                ))
                result.passed = False

            allowed_roles = {"admin", "manager", "analyst"}
            if user_roles and not any(r.lower() in allowed_roles for r in user_roles):
                result.violations.append(GuardrailViolation(
                    category=ViolationCategory.AGENT_PERMISSION,
                    severity=ViolationSeverity.MEDIUM,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    source="agent_guardrails",
                    details=f"Insufficient role for tool '{tool_name}'. Required one of: {allowed_roles}",
                    blocked=True,
                ))
                result.passed = False

        return result

    def check_agent_input(self, agent_input: str, user_id: str | None = None,
                           tenant_id: str | None = None) -> GuardrailResult:
        result = GuardrailResult(passed=True)

        forbidden_in_agent = [
            "ignore system prompt",
            "override instructions",
            "access other tenant",
            "retrieve data for",
            "show all users",
            "list all tenants",
            "delete all",
            "drop table",
            "truncate",
        ]

        for trigger in forbidden_in_agent:
            if trigger in agent_input.lower():
                result.violations.append(GuardrailViolation(
                    category=ViolationCategory.AGENT_PERMISSION,
                    severity=ViolationSeverity.HIGH,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    source="agent_guardrails",
                    input_preview=agent_input[:200],
                    details=f"Agent input contains forbidden instruction: '{trigger}'",
                    blocked=True,
                ))

        result.passed = not result.blocked
        return result
