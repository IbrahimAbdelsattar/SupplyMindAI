from langchain_core.tools import tool
from pydantic import BaseModel, Field


class RAGQueryInput(BaseModel):
    query: str = Field(..., description="The semantic search query about inventory, suppliers, product details, or operational knowledge.")
    product_id: str = Field(default="", description="Optional product ID to narrow down the context.")


def _csv_knowledge_fallback(query: str, product_id: str) -> str:
    from backend.main import STORE

    parts = [f"Query: {query}"]
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
        sup = STORE.suppliers()
        for _, row in sup.head(3).iterrows():
            parts.append(
                f"Supplier {row.get('supplier_id')}: reliability {row.get('reliability_score', 'n/a')}, "
                f"lead time {row.get('lead_time_days', 'n/a')} days"
            )
    except Exception as exc:
        parts.append(f"(CSV context limited: {exc})")
    return "\n".join(parts)


def _database_knowledge(query: str, product_id: str) -> str | None:
    try:
        from backend.knowledge.client import is_knowledge_available
        from backend.knowledge.search import semantic_search

        if not is_knowledge_available():
            return None
        hits = semantic_search(query, product_id=product_id or None, match_count=8)
        if not hits:
            return None
        parts = ["Knowledge retrieved (local vector database):"]
        sources = []
        for hit in hits:
            parts.append(f"\n[{hit.get('source_type')}] {hit.get('title')}\n{str(hit.get('content', ''))[:800]}")
            sources.append(str(hit.get("title", "doc")))
        parts.append(f"\nSources: {', '.join(sorted(set(sources)))}")
        return "\n".join(parts)
    except Exception:
        return None


@tool("query_inventory_knowledge", args_schema=RAGQueryInput)
def query_inventory_knowledge(query: str, product_id: str = "") -> str:
    """Retrieves operational knowledge from local vectors, Chroma RAG, or CSV datasets."""
    database_result = _database_knowledge(query, product_id)
    if database_result:
        return database_result

    return f"Knowledge retrieved (CSV fallback):\n{_csv_knowledge_fallback(query, product_id)}"
