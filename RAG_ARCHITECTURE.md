# Supply Mind RAG Architecture

The RAG (Retrieval-Augmented Generation) system provides semantic search and grounding over deep operational documents.

## Components

- **Vector Database:** Uses ChromaDB for persistence and scalability.
- **Embeddings Model:** Typically `all-MiniLM-L6-v2` generating dense embeddings for text chunks.
- **Integration with Agents:** Exposed via the `query_inventory_knowledge` LangChain tool.
- **Ingestion Pipeline:** Uses splitters and chunkers to manage large operational datasets (found in `rag-powered-inventory-management/src/rag`).

## Execution
Instead of isolating the RAG to a distinct module, we have shifted to a **tool-calling architecture**. The raw document chunks and metadata are returned directly to the LangGraph state. The LLM then organically cites those retrieved components in its final output, drastically reducing hallucination probability.
