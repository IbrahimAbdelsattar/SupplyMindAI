# SupplyMind RAG Architecture

## Design principles

1. **Grounded answers** — LLM receives retrieved chunks + live operational snapshot only
2. **No hallucinated metrics** — if retrieval is empty, the model states that explicitly
3. **Operational DB unchanged** — CSV/SQLite facts injected at query time via `get_operational_snapshot()`
4. **Layered retrieval** — application vector database first, Chroma legacy fallback, CSV last resort

## Pipeline

```
Operational event (forecast, inventory, insight, report)
        │
        ▼
  hooks.py (async thread pool)
        │
        ▼
  ingestion.py → documents + embeddings (384-dim, MiniLM)
        │
        ▼
  Application database embeddings (cosine similarity)
```

## Query flow

```
User question
        │
        ▼
  embed_text(query)
        │
        ▼
  match_documents RPC (metadata filters: source_type, product_id, user_id)
        │
        ▼
  rag.py — build CONTEXT + OPERATIONAL_SNAPSHOT
        │
        ▼
  LangChain ChatOpenAI (OpenRouter) — temperature 0.1
        │
        ▼
  Answer + source citations
```

## LangChain / LangGraph

| Component | Location |
|-----------|----------|
| RAG generation | `backend/knowledge/rag.py` |
| Agent tools | `backend/tools/knowledge_tools.py`, `rag_tools.py` |
| Multi-agent graph | `backend/agents/graph.py` |
| Copilot graph | `backend/agents/copilot_graph.py` |

Agent-specific retrieval tools:

- `search_forecast_knowledge`
- `search_inventory_knowledge`
- `search_insights_knowledge`
- `search_mlops_knowledge`
- `query_inventory_knowledge` (application database → Chroma → CSV)

## Metadata filtering

Documents store `metadata` JSONB (e.g. `product_id`, `horizon_days`). Search filters:

- `source_type`: forecast | inventory | insight | report | mlops
- `product_id`: SKU filter
- `user_id`: optional per-user scoping

## Performance

| Feature | Implementation |
|---------|----------------|
| Batch embeddings | `embed_texts_batch()` with configurable `KNOWLEDGE_BATCH_EMBED_SIZE` |
| Embedding cache | SHA-256 keyed in-memory cache |
| Async ingestion | `KNOWLEDGE_INGESTION_ASYNC=true` (ThreadPoolExecutor) |
| Retrieval limit | `KNOWLEDGE_MATCH_COUNT`, `KNOWLEDGE_MATCH_THRESHOLD` |

## API

```http
POST /api/v1/knowledge/search
POST /api/v1/rag/query
```

Example RAG body:

```json
{
  "question": "Why is stock-out risk increasing for BL_KIT?",
  "product_id": "BL_KIT",
  "source_type": "inventory",
  "include_operational_context": true
}
```

## LangSmith

Set `LANGCHAIN_TRACING_V2=true` to trace RAG and copilot runs (latency, tokens, retrieval quality). See `LANGSMITH_SETUP.md`.
