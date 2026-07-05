# SupplyMind RAG Architecture: Document Isolation & Filtering

The **Retrieval-Augmented Generation (RAG)** pipeline grounding SupplyMind AI is governed by strict document boundaries. This prevents cross-agent contamination (e.g. preventing Customer Support from accessing internal inventory stock policies).

---

## Ingestion Pipeline

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
   SQL Database (SQLite / PostgreSQL) using cosine similarity
```

During ingestion, documents are classified with a `source_type` category matching the origin event:
* `inventory`: Live stock thresholds, EOQ policies, warehouse stats.
* `forecast`: Prediction metrics, trend targets, supplier statistics.
* `insight`: Explanations and SHAP summaries.
* `report`: Monthly/weekly logistical summaries.
* `mlops`: Model drift logs.
* `general`: Onboarding materials, FAQs, user manuals, navigational guides.

---

## Isolated Query Flow (ContextBuilder)

Instead of performing broad queries across all documents, the **ContextBuilder** inside the orchestrator filters searches strictly by permitted document types for the active agent.

```
User Query
    │
    ▼
Orchestration Intent Route (e.g., Inventory)
    │
    ▼
ContextBuilder.get_filtered_context()
    │
    ├─► Enforce filters: document.source_type IN ("inventory", "incident", "recommendation")
    │
    ▼
Semantic Cosine Search (SQL-backed)
    │
    ▼
Grounded Context Chunks + Operational Snapshot
    │
    ▼
LLM Generation (Temperature 0.1)
```

### Document Permissibility Matrix

| Calling Agent | Allowed `source_type` Documents |
|---|---|
| **Inventory Agent** | `["inventory", "incident", "recommendation"]` |
| **Forecast Agent** | `["forecast"]` |
| **Customer Support Agent** | `["general", "insight"]` (No inventory or internal metrics!) |
| **Documentation Agent** | `["general"]` |
| **MLOps Agent** | `["mlops"]` |
| **Report Agent** | `["report"]` |
| **Executive Insights Agent** | `["insight", "report"]` |

---

## Retrieval Parameters & Performance

* **Similarity Threshold**: Search results are filtered to match a cosine similarity threshold of at least `KNOWLEDGE_MATCH_THRESHOLD` (default `0.35`).
* **Match Count Limits**: Chunks are capped at `KNOWLEDGE_MATCH_COUNT` (default `5` chunks) to respect token input budgets.
* **Embedding Cache**: Embedding generation is optimized using an in-memory SHA-256 cache, eliminating redundant model evaluations.
* **Groundedness**: If the ContextBuilder returns no matching knowledge docs and there is no operational database snapshot, the system returns a safe boundary warning: *"I don't have indexed knowledge for that query yet."*
