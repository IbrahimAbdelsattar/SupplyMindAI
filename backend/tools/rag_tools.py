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


@tool("query_inventory_knowledge", args_schema=RAGQueryInput)
def query_inventory_knowledge(query: str, product_id: str = "") -> str:
    """Retrieves operational knowledge from the vector database or CSV datasets."""
    import sys

    rag = None
    if "backend.main" in sys.modules:
        rag = sys.modules["backend.main"].RAG_SERVICE

    if rag is None:
        return f"Knowledge retrieved (CSV fallback):\n{_csv_knowledge_fallback(query, product_id)}"

    try:
        sku = product_id or None
        retrieved = rag.vector_store.query(
            question=query,
            documents=rag.documents,
            selected_sku=sku,
            limit=rag.settings.query_result_count,
        )
        if not retrieved:
            return f"Knowledge retrieved (CSV fallback):\n{_csv_knowledge_fallback(query, product_id)}"

        context_parts = []
        sources = []
        for item in retrieved:
            context_parts.append(str(item.get("document", "")))
            meta = item.get("metadata") or {}
            sources.append(str(meta.get("source", meta.get("product_id", "Unknown"))))

        context = "\n\n---\n\n".join(context_parts)
        sources_str = ", ".join(sorted(set(sources)))
        return f"Knowledge retrieved:\n{context}\n\nSources consulted: {sources_str}"
    except Exception as e:
        return f"Knowledge retrieved (CSV fallback):\n{_csv_knowledge_fallback(query, product_id)}\n\n(RAG error: {e})"
