"""Token budget enforcement for LLM call sites.

Context truncation prevents runaway token usage when datasets grow.
Approximate token count: 1 token ≈ 4 chars (English), ~3.5 chars (mixed).
"""

from __future__ import annotations

import logging

LOGGER = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Token budgets per feature (input context max)
# ---------------------------------------------------------------------------
TOKEN_BUDGETS = {
    "copilot_chat": 6_000,
    "forecast_reasoning": 8_000,
    "ai_insights": 10_000,
    "rag_query": 6_000,
    "platform_guide": 4_000,
    "executive_insights": 8_000,
    "high_risk_insights": 6_000,
    "revenue_insights": 6_000,
    "inventory_intelligence": 8_000,
    "inventory_rag_query": 6_000,
}

# Output token limits per feature
OUTPUT_TOKEN_LIMITS = {
    "copilot_chat": 512,
    "forecast_reasoning": 1_024,
    "ai_insights": 2_048,
    "rag_query": 512,
    "platform_guide": 512,
    "executive_insights": 1_024,
    "high_risk_insights": 1_024,
    "revenue_insights": 1_024,
}


def approx_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token for English text."""
    return max(1, len(text) // 4)


def truncate_to_budget(text: str, max_tokens: int, label: str = "") -> str:
    """Truncate text to fit within max_tokens budget. Preserves完整性 of complete lines."""
    current_tokens = approx_tokens(text)
    if current_tokens <= max_tokens:
        return text

    max_chars = max_tokens * 4
    truncated = text[:max_chars]

    # Try to break at a line boundary to preserve structure
    last_newline = truncated.rfind("\n")
    if last_newline > max_chars * 0.8:  # If we're close to the end, use full truncation
        truncated = truncated[:last_newline]

    actual_tokens = approx_tokens(truncated)
    LOGGER.warning(
        "Context truncated for %s: %d → ~%d tokens (%d chars)",
        label or "unknown",
        current_tokens,
        actual_tokens,
        len(truncated),
    )
    return truncated


def get_output_limit(feature: str) -> int:
    """Get max_tokens for LLM output based on feature."""
    return OUTPUT_TOKEN_LIMITS.get(feature, 1_024)


def get_input_budget(feature: str) -> int:
    """Get max input tokens for a feature."""
    return TOKEN_BUDGETS.get(feature, 6_000)
