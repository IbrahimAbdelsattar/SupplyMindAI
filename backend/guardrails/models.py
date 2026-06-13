from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class ViolationSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ViolationCategory(str, Enum):
    PROMPT_INJECTION = "prompt_injection"
    JAILBREAK = "jailbreak"
    PROMPT_LEAKAGE = "prompt_leakage"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    TENANT_VIOLATION = "tenant_violation"
    HALLUCINATION = "hallucination"
    FORECAST_INVALID = "forecast_invalid"
    FORBIDDEN_TOPIC = "forbidden_topic"
    RAG_OUT_OF_DOMAIN = "rag_out_of_domain"
    RATE_LIMIT = "rate_limit"
    AGENT_PERMISSION = "agent_permission"
    SENSITIVE_DATA = "sensitive_data"
    CODE_EXECUTION = "code_execution"
    ROLE_PLAY = "role_play"
    ADVERSARIAL = "adversarial"
    OTHER = "other"


class GuardrailViolation(BaseModel):
    id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)
    category: ViolationCategory
    severity: ViolationSeverity
    user_id: Optional[str] = None
    tenant_id: Optional[str] = None
    session_id: Optional[str] = None
    source: str
    input_preview: Optional[str] = None
    output_preview: Optional[str] = None
    details: Optional[str] = None
    blocked: bool = True
    metadata: Optional[dict] = None


class GuardrailResult(BaseModel):
    passed: bool = True
    violations: list[GuardrailViolation] = Field(default_factory=list)
    transformed_input: Optional[str] = None
    confidence: float = 1.0

    @property
    def blocked(self) -> bool:
        return any(v.blocked for v in self.violations)

    @property
    def highest_severity(self) -> Optional[ViolationSeverity]:
        if not self.violations:
            return None
        order = [ViolationSeverity.LOW, ViolationSeverity.MEDIUM, ViolationSeverity.HIGH, ViolationSeverity.CRITICAL]
        return max((v.severity for v in self.violations), key=lambda s: order.index(s))


class RedTeamResult(BaseModel):
    test_name: str
    category: str
    passed: bool
    severity: ViolationSeverity
    prompt: str
    response_preview: Optional[str] = None
    detection_triggered: bool
    details: Optional[str] = None
