# SupplyMind Supabase Intelligence Layer

## Purpose

Supabase is the **AI intelligence layer** for SupplyMind. It does **not** replace the operational database (PostgreSQL/SQLite for users + CSV analytics for supply-chain facts).

| Layer | Technology | Role |
|-------|------------|------|
| Operational | `DATABASE_URL`, CSV `DataStore` | Source of truth for forecasts, inventory, KPIs |
| Intelligence | Supabase Postgres + pgvector | Vectors, RAG, copilot memory, chat history |

## Schema

Migration: `supabase/migrations/20260529000000_intelligence_layer.sql`

| Table | Purpose |
|-------|---------|
| `documents` | Forecast summaries, reports, insights, MLOps events |
| `embeddings` | Chunk vectors (`vector(384)`) linked to documents |
| `conversations` | Copilot session messages |
| `memory` | Long-term agent memory with optional vectors |

RPC functions:

- `match_documents(query_embedding, …)` — semantic search with metadata filters
- `match_memory(query_embedding, …)` — agent memory recall

## Security

- **RLS enabled** on all tables
- **Service role** policies allow backend full access
- **anon/authenticated** denied direct table access (API-only via FastAPI + JWT)
- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to the browser; use `SUPABASE_ANON_KEY` only if you add client-side Supabase later

## Environment

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384
```

## Backend modules

```
backend/knowledge/
  client.py       # Supabase client (service role)
  embeddings.py   # Batch embeddings + cache
  ingestion.py    # documents + embeddings writes
  search.py       # match_documents / match_memory
  hooks.py        # Async ingestion from operational APIs
```

## Ingestion triggers (non-blocking)

Operational endpoints unchanged; hooks index knowledge in background:

| Event | Hook |
|-------|------|
| `POST /forecast/predict` | `on_forecast_generated` |
| `GET /inventory/optimize` | `on_inventory_recommendations` |
| `POST /insights/generate` | `on_insight_generated` |
| `GET /reports/download` | `on_report_generated` |
| `GET /mlops/metrics` | `on_mlops_snapshot` |

## Setup

1. Create a Supabase project and enable **pgvector**
2. Run the migration (SQL editor or `supabase db push`)
3. Add env vars to `.env`
4. Verify: `GET /api/v1/health` → `supabase_connected: true`

## API surface

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/knowledge/status` | Configuration health |
| `POST /api/v1/knowledge/ingest` | Manual document ingest |
| `POST /api/v1/knowledge/search` | Semantic search |
| `POST /api/v1/rag/query` | Grounded RAG Q&A |
| `POST /api/v1/copilot/chat` | SupplyMind Copilot |
