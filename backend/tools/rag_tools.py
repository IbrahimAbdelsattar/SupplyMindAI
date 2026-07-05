"""Inventory Intelligence Tools — StockMind AI.

These tools are used by the Inventory Intelligence Engine and Copilot
to retrieve inventory-specific knowledge from the vector database.
"""

from langchain_core.tools import tool
from pydantic import BaseModel, Field


class InventoryQueryInput(BaseModel):
    query: str = Field(..., description="Inventory intelligence search query about stock levels, reorder, stockout, overstock, safety stock, EOQ, ROP, or inventory health.")
    product_id: str = Field(default="", description="Optional product ID to narrow down inventory context.")


def _inventory_knowledge_retrieval(query: str, product_id: str) -> str | None:
    """Retrieve inventory intelligence documents from vector database."""
    try:
        from backend.knowledge.client import is_knowledge_available
        from backend.knowledge.search import semantic_search

        if not is_knowledge_available():
            return None

        # Search for inventory intelligence documents first
        hits = semantic_search(
            query,
            source_type="inventory_intelligence",
            product_id=product_id or None,
            match_count=8,
        )

        # Fallback to general inventory documents
        if not hits:
            hits = semantic_search(
                query,
                source_type="inventory",
                product_id=product_id or None,
                match_count=6,
            )

        if not hits:
            return None

        parts = ["Inventory Intelligence (retrieved from vector database):"]
        sources = []
        for hit in hits:
            parts.append(f"\n[{hit.get('source_type')}] {hit.get('title')}\n{str(hit.get('content', ''))[:1000]}")
            sources.append(str(hit.get("title", "doc")))
        parts.append(f"\nSources: {', '.join(sorted(set(sources)))}")
        return "\n".join(parts)
    except Exception:
        return None


def _inventory_csv_fallback(query: str, product_id: str) -> str:
    """Fallback to CSV-based inventory context when vector DB is unavailable."""
    from backend.main import STORE

    parts = [f"Inventory Query: {query}"]
    if product_id:
        parts.append(f"Product filter: {product_id}")
    try:
        prods = STORE.products()
        if product_id:
            prods = prods[prods["product_id"].astype(str) == product_id]
        for _, row in prods.head(5).iterrows():
            parts.append(
                f"Product {row.get('product_id')}: {row.get('product_name')} "
                f"(category: {row.get('category', 'n/a')})"
            )
        inv = STORE.inventory()
        for _, row in inv.head(5).iterrows():
            parts.append(
                f"Stock: {row.get('product_id')} = {row.get('stock', row.get('stock_level', 'n/a'))} units"
            )
        sup = STORE.suppliers()
        for _, row in sup.head(3).iterrows():
            parts.append(
                f"Supplier {row.get('supplier_id')}: reliability {row.get('reliability_score', 'n/a')}, "
                f"lead time {row.get('lead_time_days', 'n/a')} days"
            )
    except Exception as exc:
        parts.append(f"(CSV context limited: {exc})")
    return "\n".join(parts)


@tool("query_inventory_knowledge", args_schema=InventoryQueryInput)
def query_inventory_knowledge(query: str, product_id: str = "") -> str:
    """Retrieves inventory intelligence from the StockMind AI knowledge base.
    Use for questions about stock levels, reorder points, inventory health,
    stockout risks, overstock, safety stock, EOQ, or supplier lead times."""
    vector_result = _inventory_knowledge_retrieval(query, product_id)
    if vector_result:
        return vector_result

    return f"Inventory intelligence (CSV fallback):\n{_inventory_csv_fallback(query, product_id)}"

