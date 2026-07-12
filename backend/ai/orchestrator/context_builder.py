import logging
from typing import Any, List, Dict
from backend.knowledge.search import semantic_search
from backend.knowledge.rag import get_operational_snapshot

LOGGER = logging.getLogger(__name__)

class ContextBuilder:
    """Compiles filtered RAG context blocks strictly mapping to agent scopes."""

    _agent_source_types = {
        "inventory": ["inventory", "incident", "recommendation"],
        "forecast": ["forecast"],
        # Customer support: platform guides / FAQ only — never business datasets
        "customer_support": ["general", "insight"],
        "documentation": ["general", "insight"],
        "mlops": ["mlops"],
        "executive_insights": ["insight", "report"],
        "report": ["report"],
    }

    # Agents allowed to see live CSV-backed operational metrics
    _agents_with_operational_snapshot = frozenset({
        "inventory",
        "forecast",
        "executive_insights",
        "report",
    })

    @classmethod
    def get_filtered_context(
        cls,
        agent_type: str,
        query: str,
        product_id: str | None = None,
        user_id: str | None = None,
        match_count: int = 5
    ) -> tuple[str, list[dict[str, Any]]]:
        """Perform semantic search filtering documents by agent-allowed source types."""
        allowed_types = cls._agent_source_types.get(agent_type, ["general"])

        # Support must never be scoped to a product or business SKU context
        if agent_type == "customer_support":
            product_id = None
        
        # Execute search for each allowed source type to guarantee agent bounds
        all_hits = []
        for s_type in allowed_types:
            hits = semantic_search(
                query=query,
                source_type=s_type,
                product_id=product_id,
                user_id=user_id,
                match_count=match_count
            )
            all_hits.extend(hits)

        # Sort combined results by similarity score
        all_hits = sorted(all_hits, key=lambda x: x.get("similarity", 0), reverse=True)[:match_count]

        if not all_hits:
            return "", []

        parts = []
        for i, hit in enumerate(all_hits, 1):
            parts.append(
                f"[{i}] {hit.get('title')} (type={hit.get('source_type')}, "
                f"similarity={hit.get('similarity', 0):.2f})\n{hit.get('content', '')[:1000]}"
            )
        
        return "\n\n---\n\n".join(parts), all_hits

    @classmethod
    def get_operational_snapshot_for_agent(cls, agent_type: str, product_id: str | None = None) -> str:
        """Provide operational snapshots only to data agents — never customer support."""
        if agent_type in cls._agents_with_operational_snapshot:
            return get_operational_snapshot(product_id)
        return ""
