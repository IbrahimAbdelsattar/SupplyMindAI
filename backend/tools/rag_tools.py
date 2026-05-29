from langchain_core.tools import tool
from pydantic import BaseModel, Field

def get_rag_service():
    import sys
    if "backend.main" in sys.modules:
        return sys.modules["backend.main"].RAG_SERVICE
    return None

class RAGQueryInput(BaseModel):
    query: str = Field(..., description="The semantic search query about inventory, suppliers, product details, or operational knowledge.")
    product_id: str = Field(default="", description="Optional product ID to narrow down the context.")

@tool("query_inventory_knowledge", args_schema=RAGQueryInput)
def query_inventory_knowledge(query: str, product_id: str = "") -> str:
    """Retrieves deep operational knowledge and contextual documents from the semantic Vector Database using RAG."""
    rag = get_rag_service()
    if not rag:
        return "Error: RAG Vector Database service is currently initializing or unavailable."

    try:
        # Instead of calling ask which delegates directly to LLM, we use the vector store index to return raw context for the graph
        retriever = rag.vector_store._store.as_retriever(search_kwargs={"k": 3})
        docs = retriever.invoke(query)

        context_parts = []
        sources = []
        for doc in docs:
            context_parts.append(doc.page_content)
            sources.append(doc.metadata.get('source', 'Unknown'))

        context = "\n\n---\n\n".join(context_parts)
        sources_str = ", ".join(set(sources))
        return f"Knowledge retrieved:\n{context}\n\nSources consulted: {sources_str}"
    except Exception as e:
        return f"Failed to query knowledge base: {str(e)}"
