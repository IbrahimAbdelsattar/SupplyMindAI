"""StockMind AI — Inventory Intelligence Engine.

This package transforms raw inventory data into semantic knowledge documents,
applies business rules, detects user intent, and powers the Inventory Agent
within the LangGraph orchestration.
"""

from backend.inventory.knowledge_builder import (
    build_inventory_knowledge_document,
    build_all_inventory_documents,
    InventoryKnowledgeDocument,
)
from backend.inventory.intent_detector import (
    detect_intent,
    IntentCategory,
    IntentResult,
)
from backend.inventory.business_rules import (
    evaluate_business_rules,
    InventoryAlert,
    BusinessRuleResult,
    AlertSeverity,
)

__all__ = [
    "build_inventory_knowledge_document",
    "build_all_inventory_documents",
    "InventoryKnowledgeDocument",
    "detect_intent",
    "IntentCategory",
    "IntentResult",
    "evaluate_business_rules",
    "InventoryAlert",
    "BusinessRuleResult",
    "AlertSeverity",
]
