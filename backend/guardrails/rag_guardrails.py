import re
from .config import GuardrailsConfig
from .models import GuardrailResult, GuardrailViolation, ViolationCategory, ViolationSeverity


class RAGGuardrails:
    FORBIDDEN_QUERY_PATTERNS = [
        re.compile(r"(delete|drop|truncate|alter)\s+(table|database|index|schema)", re.IGNORECASE),
        re.compile(r"update\s+\w+\s+set", re.IGNORECASE),
        re.compile(r"insert\s+into", re.IGNORECASE),
        re.compile(r"\b(or|and)\s+['\"]?1['\"]?\s*=\s*['\"]?1['\"]?", re.IGNORECASE),
        re.compile(r"\bunion\s+select\b", re.IGNORECASE),
        re.compile(r"\bselect\s+\*\s+from\b", re.IGNORECASE),
        re.compile(r"['\"]\s*--", re.IGNORECASE),
        re.compile(r"(grant|revoke)\s+.*\s+(on|to|from)", re.IGNORECASE),
        re.compile(r"(exec|execute|sp_|xp_)", re.IGNORECASE),
        re.compile(r"system('s)?\s+(password|secret|key)", re.IGNORECASE),
    ]

    def __init__(self, config: GuardrailsConfig | None = None):
        self.config = config or GuardrailsConfig()

    def check_query(self, query: str, user_id: str | None = None,
                    tenant_id: str | None = None) -> GuardrailResult:
        result = GuardrailResult(passed=True, transformed_input=query)

        for pattern in self.FORBIDDEN_QUERY_PATTERNS:
            if pattern.search(query):
                result.violations.append(GuardrailViolation(
                    category=ViolationCategory.RAG_OUT_OF_DOMAIN,
                    severity=ViolationSeverity.HIGH,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    source="rag_guardrails",
                    input_preview=query[:200],
                    details=f"Forbidden RAG query pattern: {pattern.pattern[:80]}",
                    blocked=True,
                ))

        result.passed = not result.blocked
        return result

    def check_context(self, contexts: list[str], query: str,
                      user_id: str | None = None,
                      tenant_id: str | None = None) -> GuardrailResult:
        result = GuardrailResult(passed=True)

        if len(contexts) > self.config.rag_max_context_chunks:
            result.violations.append(GuardrailViolation(
                category=ViolationCategory.RAG_OUT_OF_DOMAIN,
                severity=ViolationSeverity.MEDIUM,
                user_id=user_id,
                tenant_id=tenant_id,
                source="rag_guardrails",
                details=f"Context exceeds max chunks: {len(contexts)} > {self.config.rag_max_context_chunks}",
                blocked=False,
            ))
            contexts = contexts[:self.config.rag_max_context_chunks]

        for pattern in self.FORBIDDEN_QUERY_PATTERNS:
            for ctx in contexts:
                if pattern.search(ctx):
                    result.violations.append(GuardrailViolation(
                        category=ViolationCategory.RAG_OUT_OF_DOMAIN,
                        severity=ViolationSeverity.HIGH,
                        user_id=user_id,
                        tenant_id=tenant_id,
                        source="rag_guardrails",
                        details=f"Forbidden content in RAG context chunk: {pattern.pattern[:80]}",
                        blocked=True,
                    ))

        result.passed = not result.blocked
        return result

    def check_response(self, response: str, query: str,
                       user_id: str | None = None,
                       tenant_id: str | None = None) -> GuardrailResult:
        result = GuardrailResult(passed=True)

        query_terms = set(query.lower().split())
        response_lower = response.lower()

        if not query_terms:
            return result

        found_terms = sum(1 for t in query_terms if t in response_lower and len(t) > 3)
        relevance_ratio = found_terms / max(len(query_terms), 1)

        if relevance_ratio < self.config.rag_relevance_threshold:
            result.violations.append(GuardrailViolation(
                category=ViolationCategory.RAG_OUT_OF_DOMAIN,
                severity=ViolationSeverity.MEDIUM,
                user_id=user_id,
                tenant_id=tenant_id,
                source="rag_guardrails",
                input_preview=query[:200],
                output_preview=response[:200],
                details=f"Response may be out of domain: relevance ratio {relevance_ratio:.2f} < {self.config.rag_relevance_threshold}",
                blocked=False,
            ))

        result.passed = not result.blocked
        return result
