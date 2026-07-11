import re
from .config import GuardrailsConfig
from .models import GuardrailResult, GuardrailViolation, ViolationCategory, ViolationSeverity


class OutputGuardrails:
    HALLUCINATION_INDICATORS = [
        r"\bI\s+(am\s+)?(not\s+)?(sure|certain|confident|aware)\b",
        r"\bI'm\s+(not\s+)?(sure|certain|confident|aware)\b",
        r"\bI\s+(don't|do\s+not)\s+(know|have|understand)\b",
        r"\bI\s+(cannot|could\s+not)\s+(find|locate|determine)\b",
        r"\bbased\s+on\s+my\s+(training|knowledge)\s+cutoff\b",
        r"\bas\s+of\s+my\s+(last|most\s+recent)\s+(update|training)\b",
        r"\bI\s+(think|believe|guess|suppose)\b",
        r"\bit'?s?\s+(possible|likely|probably)\s+that\b",
        r"\bit\s+might\s+be\b",
        r"\b(according\s+to|per)\s+(my|our)\s+(knowledge|understanding|records)\b",
        r"\bI\s+don't\s+have\s+(access\s+to\s+)?(real.time|current|live|latest)\b",
        r"\bI\s+cannot\s+(provide|give|offer)\s+(real.time|live|current)\b",
    ]

    FORBIDDEN_OUTPUT_PATTERNS = [
        # Require 4 groups of 4 digits separated by spaces (typical card format)
        (re.compile(r"\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b"), "Possible credit card number in output"),
        (re.compile(r"BEGIN\s+(RSA|DSA|EC|PGP|OPENSSH)\s+(PRIVATE\s+)?KEY", re.IGNORECASE), "Private key leaked in output"),
        # Require credential keyword followed by a quoted or long value (avoids JSON key-only matches)
        (re.compile(r"(?:password|secret|token)\s*[=:]\s*(?:['\"]\S{8,}['\"]|\S{20,})", re.IGNORECASE), "Possible secret leaked in output"),
        # Require api_key/apikey followed by a quoted or long value
        (re.compile(r"api[_-]?key\s*[=:]\s*(?:['\"]\S{8,}['\"]|\S{20,})", re.IGNORECASE), "API key leaked in output"),
    ]

    def __init__(self, config: GuardrailsConfig | None = None):
        self.config = config or GuardrailsConfig()

    def check_output(self, output: str, expected_domain: str | None = None,
                     user_id: str | None = None, tenant_id: str | None = None,
                     input_query: str | None = None) -> GuardrailResult:
        result = GuardrailResult(passed=True)

        for violation_category, threshold in [
            (ViolationCategory.HALLUCINATION, 0.5),
        ]:
            pass

        for pattern, description in self.FORBIDDEN_OUTPUT_PATTERNS:
            if pattern.search(output):
                result.violations.append(GuardrailViolation(
                    category=ViolationCategory.SENSITIVE_DATA,
                    severity=ViolationSeverity.CRITICAL,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    source="output_guardrails",
                    output_preview=output[:200],
                    details=description,
                    blocked=True,
                ))

        result = self._check_hallucination_indicators(output, result, user_id, tenant_id)
        if input_query:
            result = self._check_fabricated_data(output, result, user_id, tenant_id)

        result.passed = not result.blocked
        return result

    def _check_hallucination_indicators(self, output: str, result: GuardrailResult,
                                         user_id: str | None, tenant_id: str | None) -> GuardrailResult:
        indicators_found = 0
        for pattern_str in self.HALLUCINATION_INDICATORS:
            if re.search(pattern_str, output, re.IGNORECASE):
                indicators_found += 1

        if indicators_found >= 3:
            result.violations.append(GuardrailViolation(
                category=ViolationCategory.HALLUCINATION,
                severity=ViolationSeverity.MEDIUM,
                user_id=user_id,
                tenant_id=tenant_id,
                source="output_guardrails",
                output_preview=output[:200],
                details=f"Multiple uncertainty indicators found ({indicators_found}). Response may be hallucinated.",
                blocked=False,
            ))

        return result

    def _check_fabricated_data(self, output: str, result: GuardrailResult,
                                user_id: str | None, tenant_id: str | None) -> GuardrailResult:
        number_patterns = re.findall(r'\b\d{4,}\b', output)
        suspicious_numbers = [n for n in number_patterns if len(n) >= 6 and n[-1] == '0' and n[-2] == '0']

        if len(suspicious_numbers) > 3:
            result.violations.append(GuardrailViolation(
                category=ViolationCategory.HALLUCINATION,
                severity=ViolationSeverity.MEDIUM,
                user_id=user_id,
                tenant_id=tenant_id,
                source="output_guardrails",
                output_preview=output[:200],
                details=f"Suspicious number patterns detected ({len(suspicious_numbers)}). Possible data fabrication.",
                blocked=False,
            ))

        return result

    @staticmethod
    def sanitize_output(output: str) -> str:
        output = re.sub(r'(api[_-]?key|secret|password|token)\s*[=:]\s*\S+',
                        r'\1: ***REDACTED***', output, flags=re.IGNORECASE)
        output = re.sub(r'BEGIN\s+(RSA|DSA|EC|PGP|OPENSSH)\s+(PRIVATE\s+)?KEY.*?END\s+\1\s+(PRIVATE\s+)?KEY',
                        '***REDACTED PRIVATE KEY***', output, flags=re.DOTALL | re.IGNORECASE)
        return output
