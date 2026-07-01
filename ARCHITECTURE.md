# SupplyMindAI Architecture

## Overview

SupplyMindAI is an AI-powered **demand forecasting and inventory optimization platform**. It combines ML-based demand forecasting, RAG-powered inventory insights, and LLM-based copilot/chat into a single full-stack application.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite 6, Tailwind CSS, shadcn/ui |
| **Backend** | Python 3.12+, FastAPI, Uvicorn |
| **ORM / DB** | SQLAlchemy 2.0, PostgreSQL (Supabase) |
| **Auth** | Demo mode (hardcoded admin user, no real auth) |
| **ML** | scikit-learn pipeline (gradient boosting) + pandas |
| **RAG** | ChromaDB + sentence-transformers (`all-MiniLM-L6-v2`) |
| **LLM** | OpenAI-compatible API (OpenAI / OpenRouter / NVIDIA) |
| **Charts** | Recharts |
| **Animation** | Framer Motion |
| **State** | React Query + Context API |

---

## Project Structure

```
SupplyMindAI/
├── backend/                    # Python FastAPI backend
│   ├── main.py                 # App entry, middleware, router mounting
│   ├── globals.py              # Shared global state (DataStore, ML_MODEL, etc.)
│   ├── bootstrap.py            # Startup: init ML model, RAG service
│   ├── db.py                   # SQLAlchemy engine, models, session
│   ├── dependencies.py         # FastAPI dependency injection
│   ├── ml_adapter.py           # DemandForecastService (scikit-learn)
│   ├── analytics.py            # Business analytics helpers
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile / .prod      # Container images
│   ├── alembic.ini             # DB migration config
│   │
│   ├── routers/                # 17 API route modules
│   │   ├── knowledge.py        # RAG / knowledge base CRUD
│   │   ├── forecast.py         # Demand forecasting endpoints
│   │   ├── forecast_intelligence.py
│   │   ├── forecast_insights.py
│   │   ├── inventory.py        # Inventory management
│   │   ├── inventory_rag.py    # RAG-powered inventory search
│   │   ├── data.py             # CSV data management
│   │   ├── reports.py          # Report generation
│   │   ├── alerts.py           # Alert management
│   │   ├── security.py         # Auth & access control
│   │   ├── chat.py             # Chat endpoint
│   │   ├── copilot.py          # AI copilot
│   │   ├── insights.py         # Business insights
│   │   ├── mlops.py            # ML pipeline management
│   │   ├── settings.py         # User settings
│   │   ├── storage.py          # File storage
│   │   └── __init__.py
│   │
│   ├── knowledge/              # RAG & knowledge system
│   │   ├── client.py           # Knowledge API client
│   │   ├── config.py           # RAG configuration
│   │   ├── copilot.py          # Copilot integration
│   │   ├── embeddings.py       # Embedding generation
│   │   ├── hooks.py            # Webhook handlers
│   │   ├── ingestion.py        # Document ingestion pipeline
│   │   ├── langsmith_tracing.py
│   │   ├── memory.py           # Conversation memory
│   │   ├── rag.py              # RAG query engine
│   │   ├── search.py           # Hybrid search (vector + keyword)
│   │   ├── storage.py          # Document storage
│   │   └── stream.py           # Streaming responses
│   │
│   ├── llm/                    # LLM integration
│   │   ├── client.py           # OpenAI-compatible LLM client
│   │   ├── context_builder.py  # Prompt context assembly
│   │   ├── executive_prompts.py
│   │   └── forecast_reasoning.py
│   │
│   ├── guardrails/             # AI guardrails & safety
│   │   ├── middleware.py       # FastAPI middleware
│   │   ├── config.py
│   │   ├── monitor.py
│   │   ├── models.py
│   │   ├── input_guardrails.py
│   │   ├── output_guardrails.py
│   │   ├── rag_guardrails.py
│   │   ├── forecast_guardrails.py
│   │   ├── agent_guardrails.py
│   │   ├── tenant_guardrails.py
│   │   ├── rate_limiter.py
│   │   ├── deepeval_integration.py
│   │   ├── nemo_policies.py
│   │   └── red_team.py
│   │
│   ├── agents/                 # LangGraph agents
│   │   ├── graph.py            # Agent graph definition
│   │   ├── nodes.py            # Graph nodes
│   │   ├── state.py            # Agent state
│   │   └── copilot_graph.py    # Copilot agent graph
│   │
│   ├── services/               # Business service layer
│   │   ├── rag_service.py
│   │   ├── copilot_service.py
│   │   ├── forecast_intelligence_service.py
│   │   ├── forecast_reasoning_service.py
│   │   ├── forecast_persistence.py
│   │   └── langsmith_tracing_service.py
│   │
│   ├── tools/                  # Agent tools
│   ├── schemas/                # Pydantic schemas
│   ├── migrations/             # Alembic migrations
│   ├── integrations/           # External integrations
│   └── tests/                  # Backend tests
│
├── src/                        # React frontend
│   ├── App.tsx                 # Root: providers, router, lazy pages
│   ├── main.tsx                # Vite entry point
│   ├── pages/                  # 14 route-level pages
│   │   ├── Index.tsx           # Landing page (public)
│   │   ├── Login.tsx           # Sign in (public)
│   │   ├── SignUp.tsx
│   │   ├── FactorOne.tsx          (deleted — no longer used)
│   │   ├── ClerkLoginCatchAll.tsx  (deleted — no longer used)
│   │   ├── Dashboard.tsx       # Main dashboard (protected)
│   │   ├── Forecasting.tsx     # Demand forecasting
│   │   ├── Inventory.tsx       # Inventory management
│   │   ├── AIInsights.tsx      # AI-powered insights
│   │   ├── Reports.tsx         # Reports & analytics
│   │   ├── MLOps.tsx           # ML pipeline view
│   │   ├── Security.tsx        # Security config
│   │   ├── Settings.tsx        # User settings
│   │   └── NotFound.tsx        # 404 page
│   │
│   ├── components/             # Reusable components
│   │   ├── ui/                 # shadcn/ui primitives (30+)
│   │   ├── dashboard/          # Dashboard widgets
│   │   ├── landing/            # Landing page sections
│   │   ├── inventory/          # Inventory components
│   │   ├── ai/                 # AI-related components
│   │   ├── chatbot/            # Chat bot components
│   │   ├── mlops/              # MLOps components
│   │   ├── brand/              # Brand assets
│   │   ├── language/           # i18n components
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── NavLink.tsx
│   │
│   ├── contexts/               # React contexts
│   │   ├── ThemeContext.tsx     # Dark/light mode
│   │   ├── CurrencyContext.tsx  # Currency preference
│   │   └── DateRangeContext.tsx # Global date range
│   │
│   ├── hooks/                  # Custom hooks
│   ├── lib/                    # Utilities & animation constants
│   ├── services/               # API client functions
│   └── types/                  # TypeScript type definitions
│
├── data/                       # CSV data warehouse
│   ├── products.csv
│   ├── sales_daily.csv
│   ├── inventory.csv
│   ├── suppliers.csv
│   ├── raw_materials.csv
│   ├── bom.csv
│   ├── recommendations.csv
│   ├── demand_forecasts.csv
│   ├── contracts.csv
│   ├── production_schedule.csv
│   ├── enriched data/          # Enriched/transformed CSVs
│   └── ...
│
├── rag-powered-inventory-management/   # Submodule: RAG system
│   └── src/
│       ├── rag/
│       │   ├── core/           # ChromaDB, embeddings, config
│       │   └── services/       # InventoryRagService
│
├── ml_platform/models/         # ML model artifacts
│   ├── demand_model_pipeline.pkl
│   └── future_forecast.csv
│
├── .env                        # Environment configuration
├── AGENTS.md                   # Agent guidelines
├── vite.config.ts              # Vite config + API proxy
├── tailwind.config.ts
└── tsconfig.json
```

---

## Backend Architecture

### Startup Flow (`main.py` → `bootstrap.py`)

1. **Load environment** (.env via dotenv)
2. **Create FastAPI app** with CORS + TrustedHost + Guardrails middleware
3. **Mount 17 routers** (9 loaded directly + 8 via dynamic import)
4. **On startup event**: run DB migrations, create tables, init ML model, init RAG service (lazy), init Forecast Intelligence

### Core Data Flow

```
Client (React) → Vite Proxy (/api/*) → FastAPI
  → Router → Service/Dependency
    → DataStore (CSV cache) or PostgreSQL (SQLAlchemy)
    → ML Model (sklearn pipeline)
    → RAG Service (ChromaDB + embeddings)
    → LLM Client (OpenAI-compatible)
```

### Global State (`backend/globals.py`)

- **`STORE`**: `DataStore` — singleton that lazy-loads and caches CSV datasets into pandas DataFrames
- **`ML_MODEL`**: `DemandForecastService` — scikit-learn pipeline for demand prediction
- **`FORECAST_INTELLIGENCE`**: `ForecastIntelligenceService` — CSV-based forecast enrichment

### Database Models (`backend/db.py`)

| Table | Purpose |
|-------|---------|
| `users` | Local user accounts |

| `forecast_results` | Persisted demand forecast outputs |
| `knowledge_documents` | RAG document store |
| `knowledge_embeddings` | Vector embeddings for RAG |
| `conversations` | Chat/copilot history |
| `agent_memory` | Long-term agent memory store |
| `user_settings` | Per-user settings JSON blob |

### Router Map (17 routers)

| Prefix | Router | Purpose |
|--------|--------|---------|
| `/api/v1/knowledge` | `knowledge.py` | RAG knowledge base CRUD |
| `/api/v1/forecast` | `forecast.py` | Demand forecasting |
| `/api/v1/forecast-intelligence` | `forecast_intelligence.py` | Forecast intelligence |
| `/api/v1/forecast-insights` | `forecast_insights.py` | LLM forecast reasoning |
| `/api/v1/inventory` | `inventory.py` | Inventory CRUD |
| `/api/v1/inventory-rag` | `inventory_rag.py` | RAG inventory search |
| `/api/v1/data` | `data.py` | CSV data management |
| `/api/v1/reports` | `reports.py` | Report generation |
| `/api/v1/alerts` | `alerts.py` | Alert management |
| `/api/v1/security` | `security.py` | Auth & access control |
| `/api/v1/chat` | `chat.py` | Chat endpoint |
| `/api/v1/copilot` | `copilot.py` | AI copilot |
| `/api/v1/insights` | `insights.py` | Business insights |
| `/api/v1/mlops` | `mlops.py` | ML pipeline mgmt |
| `/api/v1/settings` | `settings.py` | User settings |
| `/api/v1/storage` | `storage.py` | File storage |
| `/api/v1` | `forecast_intelligence.py` | FI endpoints |

### AI Guardrails System

The guardrails system is a comprehensive safety layer implemented as **FastAPI middleware** with separate policy modules:

- **Input Guardrails**: Sanitize and validate user prompts/queries
- **Output Guardrails**: Filter and constrain LLM responses
- **Auth Guardrails**: Verify identity and permissions
- **RAG Guardrails**: Ensure RAG responses stay grounded in documents
- **Forecast Guardrails**: Validate forecast reasoning and confidence bounds
- **Agent Guardrails**: Constrain LangGraph agent behavior
- **Tenant Guardrails**: Multi-tenant data isolation
- **Rate Limiter**: Per-user/per-IP request throttling
- **DeepEval Integration**: LLM-as-judge for response quality
- **Red Team**: Adversarial testing hooks

---

## Frontend Architecture

### Routing & Auth

- **All routes** are publicly accessible (no auth guards).
- `ProtectedRoute` and `PublicOnlyRoute` have been removed.
- The app operates in demo mode with a single hardcoded admin user.

### State Management

| State | Solution |
|-------|----------|
| Server state | `@tanstack/react-query` (QueryClient) |
| Theme | `ThemeContext` (dark/light mode) |
| Auth | Demo mode (hardcoded admin user, no auth) |
| Currency | `CurrencyContext` |
| Date range | `DateRangeContext` |

### Styling

- **Tailwind CSS** v3 with shadcn/ui components (30+ Radix primitives)
- **Neumorphism design system** with light/dark mode
- **Framer Motion** for animations (Emil Design engineering principles)
- Fully responsive, mobile-first

---

## Key Integration Points
### Auth (Demo Mode)

- Clerk has been removed from both frontend and backend.
- The backend uses a static demo admin user for all operations.
- All frontend routes are publicly accessible — no login/signup required.

### ML Pipeline
- Training: scikit-learn pipeline stored as `.pkl` in `ml_platform/models/`
- Inference: `DemandForecastService` loads pipeline, predicts from CSV data
- Persistence: Forecast results stored in `forecast_results` table

### RAG Pipeline
- Vector DB: ChromaDB (local, persistent)
- Embeddings: sentence-transformers `all-MiniLM-L6-v2`
- Retrieval: Hybrid search (vector similarity + keyword BM25)
- Documents: Ingested from JSONL via `ingestion.py`

### LLM Integration
- Provider-agnostic: OpenAI, OpenRouter, NVIDIA NIM
- Usage: Chat, copilot, forecast reasoning, RAG summarization
- Tracing: LangSmith (optional, env flag)

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | LLM API key |
| `OPENAI_BASE_URL` | LLM base URL (OpenAI / OpenRouter / NVIDIA) |
| `OPENAI_MODEL` | Model name (e.g. `gpt-4o-mini`) |

| `ALLOWED_ORIGINS` | CORS origins |
| `ALLOWED_HOSTS` | Trusted hosts |
| `ENVIRONMENT` | `development` or `production` |
| `RAG_WARM_UP_ON_STARTUP` | Pre-load RAG service |
| `MODEL_PATH` | Path to ML pipeline pickle |
| `FORECAST_CSV_PATH` | Path to forecast CSV |
| `LANGCHAIN_TRACING_V2` | Enable LangSmith tracing |

---

## Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8081

# Frontend
npm install
npm run dev        # Vite on :5173, proxies /api to :8081

# Build
npm run build
```
