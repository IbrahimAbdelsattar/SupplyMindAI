import logging
from backend.guardrails.output_guardrails import OutputGuardrails

LOGGER = logging.getLogger(__name__)

class ResponseValidator:
    """Validates generated agent response text against security and hallucination guardrails."""

    def __init__(self) -> None:
        self.guardrails = OutputGuardrails()

    def validate_response(self, text: str, user_id: str | None = None, session_id: str | None = None) -> str:
        """Inspect response text. Redact private information or log warnings for high uncertainty."""
        try:
            # Check for secrets/PII leak
            result = self.guardrails.check_output(
                output=text,
                user_id=user_id
            )
            
            # If blocked due to sensitive data, sanitize and redact
            if not result.passed:
                LOGGER.warning("Response check failed safety guardrails. Redacting content.")
                return self.guardrails.sanitize_output(text)

            # Check for hallucinations or uncertainty warnings and log them
            violations = result.violations
            if violations:
                LOGGER.info("Response validation violations: %s", [v.details for v in violations])

        except Exception as exc:
            LOGGER.error("Response validation failed: %s", exc)

        return text
