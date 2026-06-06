# SupplyMind Copilot Architecture

## Role

The **SupplyMind Copilot** is the central AI assistant for supply chain operators. It answers questions such as:

- Why is stock-out risk increasing?
- Which products need attention?
- Explain forecast changes
- What caused inventory growth?
- Show similar historical incidents
- Recommend next actions

It combines **database-backed vector memory**, **live operational data** (CSV `DataStore`), and **LangGraph tool orchestration**.

## Engines

| Mode | Env | Behavior |
|------|-----|----------|
| LangGraph (default) | `COPILOT_USE_LANGGRAPH=true` | Tool-calling agent with forecast, inventory, knowledge, MLOps tools |
| RAG fallback | LangGraph failure | `rag_query()` + multi-type semantic search + conversation persistence |

## LangGraph copilot

File: `backend/agents/copilot_graph.py`

```
User message
     │
     ▼
copilot_agent_node (ChatOpenAI + tools)
     │
     ├─ tool calls → ToolNode → back to copilot
     └─ no tools → END
```

Tools available to the copilot:

- Knowledge database: `search_*_knowledge`, `recall_agent_memory`
- Legacy RAG: `query_inventory_knowledge`
- Live ops: `generate_forecast`, `analyze_inventory`, `get_mlops_metrics`

## Multi-agent integration

Existing supervisor graph (`backend/agents/graph.py`) routes to specialized agents. Each agent binds database-backed retrieval tools:

| Agent | Retrieval tool |
|-------|----------------|
| Forecasting | `search_forecast_knowledge` |
| Inventory | `search_inventory_knowledge` |
| Insights (RAG node) | `search_insights_knowledge` |
| MLOps | `search_mlops_knowledge` |

## Memory & conversations

| Store | Table | Use |
|-------|-------|-----|
| Chat history | `conversations` | Per `session_id` + `user_id` |
| Long-term memory | `memory` | `upsert_memory` after copilot turns |

Frontend persists `session_id` in `localStorage` (`supplymind_copilot_session`).

## API

```http
POST /api/v1/copilot/chat
Authorization: Bearer <JWT>
```

```json
{
  "message": "Which products need attention?",
  "product_id": "BL_KIT",
  "mode": "business",
  "session_id": "optional-uuid"
}
```

Response:

```json
{
  "answer": "...",
  "sources": [{"title": "...", "source_type": "inventory", "similarity": 0.82}],
  "session_id": "...",
  "grounded": true,
  "engine": "langgraph"
}
```

## Frontend

| Component | Path |
|-----------|------|
| Floating copilot | `src/components/chatbot/AIChatbot.tsx` → `/copilot/chat` |
| Page summaries | `src/components/ai/AISummaryCard.tsx` → `/rag/query` |
| API client | `src/lib/knowledgeApi.ts` |

Integrated on: Dashboard, Forecasting, Inventory, AI Insights, Reports, MLOps.

## Observability

Enable LangSmith (`LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT`) to trace:

- Copilot graph runs
- Tool invocations and retrieval hits
- Token usage and latency
- Failures and fallback to RAG mode

## Security note

Copilot uses **existing JWT auth** (`_get_current_user`). Knowledge and memory are accessed server-side through SQLAlchemy.
