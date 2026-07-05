"""Intent Detector for the Inventory Intelligence Engine.

Before any retrieval or reasoning, detect what the user is asking about.
This prevents the Inventory Intelligence Engine from answering questions
outside its domain (HR, Finance, general enterprise search, etc.).
"""

from __future__ import annotations

import logging
import re
from enum import Enum
from dataclasses import dataclass
from typing import Any

LOGGER = logging.getLogger(__name__)


class IntentCategory(str, Enum):
    """The category of a user's question."""
    INVENTORY = "inventory"
    FORECAST = "forecast"
    REPORT = "report"
    MLOPS = "mlops"
    GENERAL = "general"
    OUT_OF_SCOPE = "out_of_scope"


@dataclass
class IntentResult:
    """Result of intent detection."""
    category: IntentCategory
    confidence: float
    reason: str
    sub_category: str = ""
    product_id: str | None = None


# Inventory-specific keywords and patterns
_INVENTORY_PATTERNS: list[tuple[re.Pattern, str, float]] = [
    (re.compile(r"\b(stock[- ]out|out of stock|stockout)\b", re.IGNORECASE), "stockout_risk", 0.95),
    (re.compile(r"\bre\-?order\b", re.IGNORECASE), "reorder", 0.90),
    (re.compile(r"\boverstock(ed)?\b", re.IGNORECASE), "overstock", 0.90),
    (re.compile(r"\bsafety stock\b", re.IGNORECASE), "safety_stock", 0.90),
    (re.compile(r"\binventory turn(over)?\b", re.IGNORECASE), "turnover", 0.90),
    (re.compile(r"\bworking capital\b", re.IGNORECASE), "working_capital", 0.85),
    (re.compile(r"\binventory health\b", re.IGNORECASE), "health", 0.90),
    (re.compile(r"\b(days of|day[s]?) supply\b", re.IGNORECASE), "days_of_supply", 0.85),
    (re.compile(r"\bstock level[s]?\b", re.IGNORECASE), "stock_level", 0.85),
    (re.compile(r"\binventory risk\b", re.IGNORECASE), "risk", 0.90),
    (re.compile(r"\bwhich product[s]?\b", re.IGNORECASE), "product_query", 0.75),
    (re.compile(r"\bwhat.*(stock|inventory)\b", re.IGNORECASE), "general_inventory", 0.80),
    (re.compile(r"\bhow many.*(unit|stock)\b", re.IGNORECASE), "quantity_query", 0.85),
    (re.compile(r"\b(inventory|stock|warehouse)\b", re.IGNORECASE), "general_inventory", 0.70),
    (re.compile(r"\b(replenish|replenishment)\b", re.IGNORECASE), "replenishment", 0.90),
    (re.compile(r"\b(EOQ|economic order)\b", re.IGNORECASE), "eoq", 0.95),
    (re.compile(r"\b(ROP|reorder point)\b", re.IGNORECASE), "rop", 0.95),
    (re.compile(r"\blead time\b", re.IGNORECASE), "lead_time", 0.85),
    (re.compile(r"\bsupplier.*(risk|delay|reliab)\b", re.IGNORECASE), "supplier_risk", 0.80),
    (re.compile(r"\b(slow moving|excess|dead stock)\b", re.IGNORECASE), "slow_moving", 0.90),
    (re.compile(r"\b(critical|urgent).*(stock|inventory)\b", re.IGNORECASE), "critical", 0.85),
]

_FORECAST_PATTERNS: list[tuple[re.Pattern, str, float]] = [
    (re.compile(r"\bforecast\b", re.IGNORECASE), "demand_forecast", 0.85),
    (re.compile(r"\bdemand.*(predict|forecast|trend)\b", re.IGNORECASE), "demand_prediction", 0.90),
    (re.compile(r"\b(predict|forecast).*demand\b", re.IGNORECASE), "demand_prediction", 0.90),
    (re.compile(r"\bseasonality\b", re.IGNORECASE), "seasonality", 0.85),
    (re.compile(r"\bconfiden(ce|t).*(forecast|predict)\b", re.IGNORECASE), "forecast_confidence", 0.85),
    (re.compile(r"\btrend\b", re.IGNORECASE), "demand_trend", 0.70),
]

_REPORT_PATTERNS: list[tuple[re.Pattern, str, float]] = [
    (re.compile(r"\b(generate|create|run).*(report)\b", re.IGNORECASE), "generate_report", 0.90),
    (re.compile(r"\breport\b", re.IGNORECASE), "report_query", 0.80),
    (re.compile(r"\b(ABC|XYZ).*anal(yze|ysis)\b", re.IGNORECASE), "abc_xyz", 0.90),
]

_MLOPS_PATTERNS: list[tuple[re.Pattern, str, float]] = [
    (re.compile(r"\b(drift|data drift|model drift)\b", re.IGNORECASE), "drift", 0.95),
    (re.compile(r"\b(accuracy|model accuracy)\b", re.IGNORECASE), "accuracy", 0.90),
    (re.compile(r"\b(retrain|retraining|re.train)\b", re.IGNORECASE), "retraining", 0.90),
    (re.compile(r"\b(pipeline|ml pipeline)\b", re.IGNORECASE), "pipeline", 0.80),
    (re.compile(r"\b(model|ml).*(health|status|perform)\b", re.IGNORECASE), "model_health", 0.85),
]

_OUT_OF_SCOPE_PATTERNS: list[re.Pattern] = [
    re.compile(r"\b(employee|hr|human resources|payroll|hiring|fire)\b", re.IGNORECASE),
    re.compile(r"\b(financ(e|ial)|revenue|profit.*loss|balance sheet)\b", re.IGNORECASE),
    re.compile(r"\b(website|frontend|UI|UX|landing page)\b", re.IGNORECASE),
    re.compile(r"\b(developer|code|program|script|api.*key|token)\b", re.IGNORECASE),
    re.compile(r"\b(password|login|auth|authentication|sign.?in)\b", re.IGNORECASE),
    re.compile(r"\b(database.*query|SQL|select.*from|insert.*into)\b", re.IGNORECASE),
    re.compile(r"\b(general.*search|enterprise.*search|find.*document)\b", re.IGNORECASE),
    re.compile(r"\b(who|where).*(office|team|manage)\b", re.IGNORECASE),
]


def _check_out_of_scope(text: str) -> tuple[bool, str]:
    for pattern in _OUT_OF_SCOPE_PATTERNS:
        if pattern.search(text):
            return True, f"Matched out-of-scope pattern: {pattern.pattern}"
    return False, ""


def _extract_product_id(text: str) -> str | None:
    patterns = [
        re.compile(r"\b[A-Z]{2,6}_[A-Z0-9]{2,6}\b"),
        re.compile(r"\b[A-Z]{2,6}-\d+\b"),
        re.compile(r"\bPROD\d{3,6}\b"),
    ]
    for pat in patterns:
        match = pat.search(text)
        if match:
            return match.group(0)
    return None


def _score_patterns(text: str, patterns: list[tuple[re.Pattern, str, float]]) -> list[tuple[str, float, str]]:
    results: list[tuple[str, float, str]] = []
    for pattern, sub_category, base_conf in patterns:
        match = pattern.search(text)
        if match:
            length_ratio = len(match.group(0)) / len(text) if len(text) > 0 else 0
            confidence = min(1.0, base_conf + (length_ratio * 0.1))
            results.append((sub_category, confidence, f"Matched: {match.group(0)}"))
    return results


def detect_intent(question: str) -> IntentResult:
    if not question or not question.strip():
        return IntentResult(category=IntentCategory.GENERAL, confidence=1.0, reason="Empty question")
    text = question.strip()
    is_oos, oos_reason = _check_out_of_scope(text)
    if is_oos:
        LOGGER.info("Out-of-scope question detected: %s", oos_reason)
        return IntentResult(category=IntentCategory.OUT_OF_SCOPE, confidence=0.95, reason=oos_reason)
    inventory_scores = _score_patterns(text, _INVENTORY_PATTERNS)
    forecast_scores = _score_patterns(text, _FORECAST_PATTERNS)
    report_scores = _score_patterns(text, _REPORT_PATTERNS)
    mlops_scores = _score_patterns(text, _MLOPS_PATTERNS)
    scores = {
        IntentCategory.INVENTORY: max((s[1] for s in inventory_scores), default=0.0),
        IntentCategory.FORECAST: max((s[1] for s in forecast_scores), default=0.0),
        IntentCategory.REPORT: max((s[1] for s in report_scores), default=0.0),
        IntentCategory.MLOPS: max((s[1] for s in mlops_scores), default=0.0),
    }
    best_category = max(scores, key=scores.get)
    best_confidence = scores[best_category]
    product_id = _extract_product_id(text)
    all_matches = inventory_scores + forecast_scores + report_scores + mlops_scores
    all_matches.sort(key=lambda x: x[1], reverse=True)
    reason = all_matches[0][2] if all_matches else "No specific patterns matched"
    if best_confidence < 0.5:
        return IntentResult(category=IntentCategory.GENERAL, confidence=0.6, reason="Low confidence", product_id=product_id)
    source = {IntentCategory.INVENTORY: inventory_scores, IntentCategory.FORECAST: forecast_scores, IntentCategory.REPORT: report_scores, IntentCategory.MLOPS: mlops_scores}.get(best_category, [])
    return IntentResult(category=best_category, confidence=best_confidence, reason=reason, sub_category=source[0][0] if source else "", product_id=product_id)
