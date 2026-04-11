# SupplyMind AI — Complete Analysis & Implementation Plan

> **Document Version:** 1.0  
> **Date:** 2026-04-11  
> **Prepared for:** 6-member engineering team  
> **Timeline:** 8 weeks (4 sprints × 2 weeks)

---

# PROJECT STATE REPORT

## Annotated Directory Tree

```
supplymind-ai/
├── .git/                           # Git repository metadata
├── .gitignore                      # Standard Vite/Node ignores
├── .qodo/                          # Qodo AI config (auto-generated)
├── README.md                       # Project overview, architecture diagram, tech stack
├── bom.csv                         # Bill of Materials: product→raw material mapping (40 rows)
├── contracts.csv                   # B2B contracts: client, product, qty, price (25 rows)
├── inventory.csv                   # Daily inventory levels per product (23,753 rows, 2020–2025)
├── production_schedule.csv         # Daily production: planned/actual/utilization (23,753 rows)
├── products.csv                    # Product catalog: 13 products, categories, price ranges
├── raw_materials.csv               # 6 raw materials with costs and supplier links
├── sales_daily.csv                 # Sales transactions: 15,001 rows (2020–2024)
├── suppliers.csv                   # 8 suppliers with reliability scores and lead times
├── bun.lock / bun.lockb            # Bun package manager lockfiles
├── package.json                    # Vite + React + shadcn/ui + Recharts + Framer Motion
├── package-lock.json               # npm lockfile
├── components.json                 # shadcn/ui configuration
├── eslint.config.js                # ESLint flat config
├── index.html                      # Vite entry HTML
├── postcss.config.js               # PostCSS with Tailwind
├── tailwind.config.ts              # Tailwind v3 + custom design tokens + animations
├── tsconfig.json                   # TypeScript project references
├── tsconfig.app.json               # App-level TS config
├── tsconfig.node.json              # Node-level TS config
├── vite.config.ts                  # Vite dev server on :8080, path aliases
├── vitest.config.ts                # Vitest test runner config
├── public/
│   ├── placeholder.svg             # Default placeholder image
│   └── robots.txt                  # SEO robots config
└── src/
    ├── App.tsx                     # Root component: routing, providers
    ├── App.css                     # Minimal global styles
    ├── index.css                   # CSS variables, dark/light theme tokens
    ├── main.tsx                    # React DOM entry point
    ├── vite-env.d.ts               # Vite type declarations
    ├── contexts/
    │   ├── AuthContext.tsx          # Mock auth with manager/analyst roles
    │   └── ThemeContext.tsx         # Dark/light theme toggle with localStorage
    ├── hooks/
    │   ├── use-mobile.tsx           # Mobile breakpoint detection hook
    │   └── use-toast.ts            # Toast notification hook
    ├── lib/
    │   ├── mockData.ts             # ALL mock data: KPIs, alerts, products, stores, chatbot
    │   └── utils.ts                # cn() utility for class merging
    ├── pages/
    │   ├── Index.tsx               # Landing page (hero, features, metrics, use cases)
    │   ├── Login.tsx               # Auth page with demo access + credential tabs
    │   ├── Dashboard.tsx           # Main dashboard: KPIs, demand chart, heatmap, alerts
    │   ├── Forecasting.tsx         # Forecast visualization with parameters + CSV export
    │   ├── Inventory.tsx           # Inventory optimization: recommendations, comparison
    │   ├── AIInsights.tsx          # AI insights: factor weights, key patterns
    │   ├── MLOps.tsx               # MLOps: accuracy trend, drift, retraining, resources
    │   ├── Reports.tsx             # Report list with download stubs
    │   ├── Settings.tsx            # User preferences, theme, notifications, region
    │   └── NotFound.tsx            # 404 page
    ├── components/
    │   ├── NavLink.tsx             # Navigation link component
    │   ├── chatbot/
    │   │   └── AIChatbot.tsx       # Floating chatbot with hardcoded responses
    │   ├── dashboard/
    │   │   ├── AlertsPanel.tsx     # Alert cards with dismiss functionality
    │   │   ├── DashboardHeader.tsx # Header with search, date range, notifications
    │   │   ├── DashboardSidebar.tsx# Collapsible sidebar with mobile sheet
    │   │   ├── DemandChart.tsx     # Composed line/area chart with Recharts
    │   │   ├── HeatmapChart.tsx    # Product×Store demand heatmap grid
    │   │   └── KPICard.tsx         # Animated KPI display card
    │   ├── landing/
    │   │   ├── FeaturesSection.tsx # Feature cards grid
    │   │   ├── Footer.tsx          # Site footer
    │   │   ├── HeroSection.tsx     # Hero with CTA and animated stats
    │   │   ├── LandingNavbar.tsx   # Landing page navigation
    │   │   ├── MetricsSection.tsx  # Animated metrics display
    │   │   └── UseCasesSection.tsx # Use case cards
    │   └── ui/                    # 50 shadcn/ui primitive components
    │       ├── accordion.tsx ... tooltip.tsx
    │       └── animated-counter.tsx # Custom animated number counter
    └── test/
        ├── setup.ts               # Vitest setup with jest-dom
        └── example.test.ts        # Single placeholder test
```

## Per-Module Status Table

| Module / Layer | Status | Details |
|---|---|---|
| **Frontend — Landing Page** | ✅ Complete | Hero, features, metrics, use cases, footer — fully implemented |
| **Frontend — Login/Auth** | ⚠️ Partial | Mock-only auth, no real JWT, no API calls, no registration |
| **Frontend — Dashboard** | ⚠️ Partial | UI complete but uses 100% mock data from `mockData.ts` |
| **Frontend — Forecasting** | ⚠️ Partial | UI/charts done, but data is randomly generated (`generateDemandData`) |
| **Frontend — Inventory** | ⚠️ Partial | UI done, but uses 3 hardcoded product recommendations |
| **Frontend — AI Insights** | ⚠️ Partial | Static insights array, no LLM integration, no SHAP values |
| **Frontend — MLOps** | ⚠️ Partial | Static metrics, no real model tracking or drift detection |
| **Frontend — Reports** | ⚠️ Partial | Report list UI done, download buttons are stubs (`console.log`) |
| **Frontend — Settings** | ⚠️ Partial | UI complete, settings not persisted anywhere |
| **Frontend — Chatbot** | ⚠️ Partial | Keyword-matching only, no LLM, hardcoded 4 responses |
| **Backend (FastAPI)** | ❌ Missing | No backend exists at all |
| **Database (PostgreSQL)** | ❌ Missing | No schema, no connection, no ORM |
| **ML Pipeline** | ❌ Missing | No model training code, no feature engineering scripts |
| **Model Artifacts** | ❌ Missing | No trained models, no MLflow integration |
| **LLM Integration** | ❌ Missing | No LLM client, no prompt templates, no reasoning pipeline |
| **RAG System** | ❌ Missing | No vector store, no embedding pipeline, no retrieval |
| **MLOps Pipeline** | ❌ Missing | No drift detection, no retraining automation |
| **Docker / Deployment** | ❌ Missing | No Dockerfiles, no docker-compose, no k8s manifests |
| **CI/CD** | ❌ Missing | No GitHub Actions workflows |
| **Azure Infrastructure** | ❌ Missing | No IaC (Bicep/Terraform), no cloud provisioning |
| **Tests** | ❌ Missing | Only 1 placeholder test (`2 + 2 = 4`) |
| **CSV Datasets** | ✅ Complete | 7 CSV files with real domain data (industrial equipment mfg) |

## Critical Gaps

1. **No backend at all** — The entire application is a frontend-only mockup
2. **No database** — No PostgreSQL schema, no data persistence
3. **No ML models** — No training code, no model artifacts, no inference
4. **No LLM integration** — Chatbot uses keyword matching with 4 hardcoded responses
5. **No RAG system** — No vector store, no document embedding
6. **No MLOps** — No drift detection, no retraining, no model registry
7. **No real authentication** — Mock user objects, no JWT, no API auth
8. **No API layer** — Frontend has zero fetch/axios calls to any backend
9. **No deployment infra** — No Docker, no CI/CD, no Azure IaC
10. **Frontend uses only mock data** — Every chart, KPI, and table is hardcoded

## External Services, APIs & Credentials Required

| Service | Purpose | Credentials Needed |
|---|---|---|
| **Azure Subscription** | All cloud infrastructure | Subscription ID, tenant, service principal |
| **Azure PostgreSQL Flexible Server** | Primary database | Connection string, admin creds |
| **Azure Blob Storage / Data Lake** | CSV storage, model artifacts | Storage account key or SAS token |
| **Azure Machine Learning** | MLflow tracking, model registry | Workspace config, API key |
| **Azure Kubernetes Service (AKS)** | Production deployment | kubeconfig, cluster credentials |
| **Azure Container Registry (ACR)** | Docker image hosting | Registry URL, access token |
| **Azure Key Vault** | Secrets management | Key Vault URI, access policy |
| **Azure Monitor / App Insights** | Observability | Instrumentation key |
| **OpenAI API (GPT-4o)** | LLM for AI insights & chat | API key |
| **GitHub** | Source control, CI/CD | PAT for Actions, repo access |
| **SMTP / SendGrid** (optional) | Report email delivery | API key |

---

# QUICK START FOR EACH MEMBER

## Member 1 — Data Engineer / Analyst
```bash
# 1. Clone repo, install frontend deps
git clone <repo-url> && cd supplymind-ai
npm install

# 2. Set up Python environment for data pipeline
python -m venv .venv && .venv\Scripts\activate
pip install pandas numpy scikit-learn great-expectations sqlalchemy psycopg2-binary

# 3. Start with: explore the 7 CSV files, document schemas, create preprocessing scripts
# 4. First deliverable: data ingestion pipeline that loads CSVs → feature-ready DataFrames
```

## Member 2 — ML Engineer / Modeler
```bash
# 1. Set up ML environment
python -m venv .venv && .venv\Scripts\activate
pip install xgboost torch tensorflow scikit-learn shap mlflow pandas numpy matplotlib

# 2. Start with: implement BaseModel abstract class and XGBoost baseline
# 3. First deliverable: trained XGBoost model with evaluation metrics logged to local MLflow
```

## Member 3 — LLM / AI Insights Engineer
```bash
# 1. Set up LLM environment
python -m venv .venv && .venv\Scripts\activate
pip install openai langchain chromadb fastapi uvicorn

# 2. Start with: create LLM client wrapper and prompt templates
# 3. First deliverable: /insights/generate endpoint that takes SHAP values + forecast → text
```

## Member 4 — Inventory / RAG Engineer
```bash
# 1. Set up RAG environment
python -m venv .venv && .venv\Scripts\activate
pip install langchain chromadb openai sentence-transformers fastapi uvicorn pandas numpy scipy

# 2. Start with: implement EOQ/ROP/safety stock functions using formulas
# 3. First deliverable: working inventory optimization with CSV data + /inventory endpoints
```

## Member 5 — MLOps Engineer
```bash
# 1. Set up MLOps environment
python -m venv .venv && .venv\Scripts\activate
pip install mlflow evidently scikit-learn fastapi uvicorn pandas numpy

# 2. Start with: MLflow tracking server setup + Evidently drift report
# 3. First deliverable: drift detection script + /mlops/drift endpoint
```

## Member 6 — Azure / Backend / Integration Lead
```bash
# 1. Set up backend
python -m venv .venv && .venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy psycopg2-binary alembic python-jose passlib bcrypt python-dotenv

# 2. Start with: FastAPI app factory + PostgreSQL models + JWT auth
# 3. Install Docker Desktop, create docker-compose.yml with postgres + backend + frontend
# 4. First deliverable: running FastAPI on :8000 with auth and DB connected
```

---

# STEP 1 — TEAM STRUCTURE & OWNERSHIP MAP

## Visual Ownership Matrix

```mermaid
graph TD
    M1["Member 1<br/>Data Engineer"] --> Data["Data Pipeline<br/>Feature Store<br/>Dashboard Pages"]
    M2["Member 2<br/>ML Engineer"] --> Models["XGBoost/LSTM/GRU/TFT<br/>Training & Evaluation<br/>Model Artifacts"]
    M3["Member 3<br/>LLM Engineer"] --> LLM["AI Insights Page<br/>LLM Reasoning<br/>Report Generation"]
    M4["Member 4<br/>RAG Engineer"] --> RAG["Inventory Page<br/>RAG System<br/>Alert Engine"]
    M5["Member 5<br/>MLOps Engineer"] --> MLOps["MLOps Page<br/>Drift Detection<br/>Retraining Pipeline"]
    M6["Member 6<br/>Backend Lead"] --> Infra["FastAPI Backend<br/>PostgreSQL DB<br/>Azure + Docker + CI/CD"]

    M1 -->|clean data| M2
    M2 -->|model outputs + SHAP| M3
    M2 -->|forecasts| M4
    M2 -->|model artifacts| M5
    M3 -->|endpoint integration| M6
    M4 -->|endpoint integration| M6
    M5 -->|endpoint integration| M6
```

## File Ownership Map

| File/Directory | Owner |
|---|---|
| `data/`, `ml_pipeline/feature_engineering/` | Member 1 |
| `src/pages/Dashboard.tsx`, `src/components/dashboard/` | Member 1 |
| `ml_pipeline/training/`, `ml_pipeline/evaluation/`, `ml_pipeline/models/` | Member 2 |
| `src/pages/AIInsights.tsx`, `rag/insights/`, `backend/routers/insights.py` | Member 3 |
| `src/pages/Inventory.tsx`, `rag/inventory/`, `backend/routers/inventory.py`, `backend/routers/alerts.py` | Member 4 |
| `src/pages/MLOps.tsx`, `mlops/`, `backend/routers/mlops.py` | Member 5 |
| `backend/` (core), `deployment/`, `.github/`, `backend/routers/auth.py`, `backend/routers/data.py` | Member 6 |
| `src/pages/Login.tsx`, `src/pages/Settings.tsx`, `src/pages/Reports.tsx` | Member 6 (shared) |
| `src/pages/Forecasting.tsx` | Member 2 (data binding), Member 6 (API integration) |

---

# STEP 2 — DETAILED IMPLEMENTATION PLAN

---

## MEMBER 1 — Data Engineer / Analyst

### A. Environment Setup

```txt
Python 3.10+
pandas==2.2.0
numpy==1.26.4
scikit-learn==1.4.0
great-expectations==0.18.0
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
pyarrow==15.0.0
matplotlib==3.8.3
seaborn==0.13.2
pydantic==2.6.0
```

**Azure Resources:** Azure Blob Storage container `supplymind-data` for raw/processed data.

### B. Data Contracts

**Input (raw CSVs):**

| File | Columns | Types |
|---|---|---|
| `products.csv` | product_id, product_name, category, type, size, min_price, max_price | str, str, str, str, str, int, int |
| `sales_daily.csv` | sale_id, date, product_id, contract_id, qty, price, revenue | int, date, str, str, int, int, int |
| `inventory.csv` | date, product_id, stock | date, str, int |
| `production_schedule.csv` | date, product_id, planned, actual, utilization, delay | date, str, int, int, float, int |
| `suppliers.csv` | supplier_id, supplier_name, region, reliability, lead_time_days | str, str, str, float, int |
| `contracts.csv` | contract_id, client, product_id, start, end, monthly_qty, price | str, str, str, date, date, int, int |
| `raw_materials.csv` | material_id, material_name, unit_cost, supplier_id | str, str, int, str |
| `bom.csv` | product_id, material_id, qty | str, str, int |

**Output (for Member 2):**

```python
# features_daily.parquet
columns = [
    'date',              # datetime
    'product_id',        # str
    'sales_qty',         # int — daily aggregated sales
    'sales_revenue',     # float — daily revenue
    'stock_level',       # int — inventory at date
    'production_actual', # int — actual production
    'utilization',       # float — production utilization
    'lag_1', 'lag_7', 'lag_14', 'lag_30',  # sales lag features
    'rolling_mean_7', 'rolling_mean_14', 'rolling_mean_30',  # moving averages
    'rolling_std_7',     # volatility
    'day_of_week',       # int 0–6
    'month',             # int 1–12
    'is_weekend',        # bool
    'quarter',           # int 1–4
    'week_of_year',      # int 1–52
    'price_mean',        # float — avg price
    'supplier_reliability', # float — supplier score
    'lead_time',         # int — supplier lead time in days
]
```

### C. Implementation Tasks

| ID | Task | Files | Complexity | Depends On |
|---|---|---|---|---|
| M1-T1 | Create data ingestion script to load all CSVs | `data/ingest.py` | Low | — |
| M1-T2 | Build preprocessing pipeline (cleaning, type casting, outlier handling, missing values) | `ml_pipeline/feature_engineering/preprocess.py` | Medium | M1-T1 |
| M1-T3 | Implement feature engineering (lags, rolling windows, time features, joins) | `ml_pipeline/feature_engineering/features.py` | High | M1-T2 |
| M1-T4 | Create data validation with Great Expectations | `data/validation/expectations.py` | Medium | M1-T2 |
| M1-T5 | Design and create PostgreSQL tables for raw and processed data | `backend/db/models/data_models.py` | Medium | M6-T1 |
| M1-T6 | Build Dashboard page with real API data binding | `src/pages/Dashboard.tsx` (modify) | Medium | M6-T3 |
| M1-T7 | Create Sales Analytics dashboard components | `src/components/dashboard/SalesAnalytics.tsx` | Medium | M1-T6 |
| M1-T8 | Build Data Quality Monitor page | `src/pages/DataQuality.tsx` | Medium | M1-T4 |
| M1-T9 | Upload processed data pipelines to Azure Blob | `data/upload_azure.py` | Low | M6-T8 |
| M1-T10 | Create automated data quality checks as cron job | `data/quality_cron.py` | Medium | M1-T4 |

### D. API Endpoints Owned

| Method | Path | Request | Response | Description |
|---|---|---|---|---|
| GET | `/api/v1/data/products` | — | `Product[]` | List all products |
| GET | `/api/v1/data/sales?product_id=&start=&end=` | Query params | `SaleRecord[]` | Sales data filtered |
| GET | `/api/v1/data/inventory?product_id=&date=` | Query params | `InventoryRecord[]` | Stock levels |
| GET | `/api/v1/data/kpis?period=` | Query params | `KPIResponse` | Aggregated KPI metrics |
| GET | `/api/v1/data/quality/report` | — | `QualityReport` | Latest data quality results |
| POST | `/api/v1/data/ingest` | `{ source: "csv" \| "api" }` | `{ status, records_processed }` | Trigger data refresh |

### E. Frontend Page Spec

**Dashboard page** (`/dashboard`):
- Data: `/api/v1/data/kpis`, `/api/v1/data/sales`, `/api/v1/data/inventory`
- Components: KPICard (4), DemandChart, HeatmapChart, AlertsPanel
- State: React Query for data fetching, local state for filters
- Loading: Skeleton loaders for each card/chart

**Data Quality page** (`/data-quality`):
- Data: `/api/v1/data/quality/report`
- Components: Quality score cards, validation rule status table, trend chart
- State: React Query
- Loading: Full-page skeleton

### F. Testing Plan

- Unit: Test preprocessing functions (null handling, type casting)
- Unit: Test feature engineering (correct lag/rolling calculations)
- Integration: Test data ingestion end-to-end with sample CSV
- Validation: Compare generated features against manual calculations for 10 rows

### G. Known Risks & Mitigation

| Risk | Mitigation |
|---|---|
| CSV data has inconsistencies | Great Expectations validation with strict schema |
| Large dataset processing time | Use Parquet format, chunked processing |
| Feature store not available when Member 2 needs it | Deliver feature schema + sample data in Sprint 1 |

---

## MEMBER 2 — ML Engineer / Modeler

### A. Environment Setup

```txt
Python 3.10+
torch==2.2.0
xgboost==2.0.3
scikit-learn==1.4.0
shap==0.45.0
mlflow==2.10.0
pandas==2.2.0
numpy==1.26.4
matplotlib==3.8.3
prophet==1.1.5
optuna==3.5.0  # hyperparameter tuning
statsmodels==0.14.1
```

**Azure Resources:** Azure ML Workspace for MLflow tracking and model registry.

### B. Data Contracts

**Input (from Member 1):**
- `features_daily.parquet` — Feature-engineered dataset (schema above)

**Output (for Member 3, Member 4, Member 5):**

```python
# Forecast output schema
{
    "product_id": str,
    "date": str,          # ISO date
    "horizon": int,       # 7, 14, or 30
    "forecast": float,    # point prediction
    "lower_bound": float, # 10th percentile
    "upper_bound": float, # 90th percentile
    "model_name": str,    # "xgboost" | "lstm" | "gru" | "tft"
    "model_version": str,
    "shap_values": {      # top 10 feature importances
        "feature_name": float
    }
}
```

### C. Implementation Tasks

| ID | Task | Files | Complexity | Depends On |
|---|---|---|---|---|
| M2-T1 | Create BaseModel abstract class (fit, predict, evaluate, save, load) | `ml_pipeline/models/base_model.py` | Low | — |
| M2-T2 | Implement XGBoost model with hyperparameter tuning | `ml_pipeline/models/xgboost_model.py` | Medium | M2-T1, M1-T3 |
| M2-T3 | Implement LSTM model (PyTorch) | `ml_pipeline/models/lstm_model.py` | High | M2-T1, M1-T3 |
| M2-T4 | Implement GRU model (PyTorch) | `ml_pipeline/models/gru_model.py` | Medium | M2-T3 |
| M2-T5 | Implement Temporal Fusion Transformer | `ml_pipeline/models/tft_model.py` | High | M2-T1 |
| M2-T6 | Implement Prophet baseline | `ml_pipeline/models/prophet_model.py` | Low | M2-T1 |
| M2-T7 | Build multi-horizon forecasting (7/14/30 day) | `ml_pipeline/training/multi_horizon.py` | Medium | M2-T2 |
| M2-T8 | Implement confidence intervals (quantile regression) | `ml_pipeline/training/quantile.py` | Medium | M2-T2 |
| M2-T9 | SHAP value extraction for all models | `ml_pipeline/evaluation/shap_analysis.py` | Medium | M2-T2 |
| M2-T10 | Model evaluation framework (RMSE, MAPE, WAPE, coverage) | `ml_pipeline/evaluation/metrics.py` | Medium | M2-T2 |
| M2-T11 | Training script with MLflow logging | `ml_pipeline/training/train.py` | Medium | M2-T2, M5-T1 |
| M2-T12 | Model selection: best model per product | `ml_pipeline/evaluation/model_selector.py` | Medium | M2-T10 |
| M2-T13 | Inference endpoint integration | `backend/services/forecast_service.py` | Medium | M2-T11, M6-T3 |
| M2-T14 | Update Forecasting.tsx to use real API | `src/pages/Forecasting.tsx` (modify) | Medium | M6-T3 |

### D. API Endpoints Owned

| Method | Path | Request | Response | Description |
|---|---|---|---|---|
| POST | `/api/v1/forecast/predict` | `{ product_id, horizon, model? }` | `ForecastResult` | Generate forecast |
| GET | `/api/v1/forecast/models` | — | `ModelInfo[]` | List available models |
| GET | `/api/v1/forecast/history?product_id=` | Query params | `ForecastResult[]` | Past forecasts |
| POST | `/api/v1/forecast/evaluate` | `{ model_name, test_period }` | `EvaluationMetrics` | Evaluate model |

### E. Frontend Page Spec

**Forecasting page** (`/forecasting`) — modify existing:
- Replace `generateDemandData()` with API call to `/api/v1/forecast/predict`
- Add model selector dropdown (XGBoost, LSTM, GRU, TFT, Prophet)
- Display real SHAP values below chart
- State: React Query mutations for predict, queries for history

### F. Testing Plan

- Unit: Test each model's fit/predict/evaluate interface
- Unit: Test metric calculations (RMSE, MAPE, WAPE) against known values
- Integration: Train XGBoost on full dataset, verify MAPE < 15%
- Backtesting: Walk-forward validation on last 90 days

### G. Known Risks & Mitigation

| Risk | Mitigation |
|---|---|
| LSTM training slow on CPU | Use GPU if available; fallback to smaller architecture |
| TFT complexity | Start with pytorch-forecasting library wrapper |
| Overfitting on small product categories | Cross-validation per product; regularization tuning |
| Feature data not ready | Use synthetic data matching the schema to unblock |

---

## MEMBER 3 — LLM / AI Insights Engineer

### A. Environment Setup

```txt
Python 3.10+
openai==1.12.0
langchain==0.1.7
langchain-openai==0.0.6
chromadb==0.4.22
fastapi==0.109.0
uvicorn==0.27.0
jinja2==3.1.3  # for report templates
weasyprint==61.2  # PDF generation
pydantic==2.6.0
```

**Azure Resources:** Azure OpenAI Service (GPT-4o deployment) — or OpenAI API key directly.

### B. Data Contracts

**Input (from Member 2):**
- SHAP values per product per forecast
- Forecast results with confidence intervals
- Model evaluation metrics

**Output (for Frontend):**

```python
# Insight response schema
{
    "insights": [
        {
            "title": str,
            "description": str,     # LLM-generated natural language
            "impact": "high" | "medium" | "low",
            "direction": "up" | "down" | "neutral",
            "factor": str,          # driving factor name
            "confidence": float,    # 0–100
        }
    ],
    "executive_summary": str,       # 2-3 paragraph summary
    "recommendations": [str],       # actionable steps
}
```

### C. Implementation Tasks

| ID | Task | Files | Complexity | Depends On |
|---|---|---|---|---|
| M3-T1 | Create LLM client wrapper (OpenAI + fallback) | `rag/insights/llm_client.py` | Low | — |
| M3-T2 | Design system prompts for supply chain reasoning | `rag/insights/prompts/` | Medium | — |
| M3-T3 | Build SHAP-to-text translation pipeline | `rag/insights/shap_interpreter.py` | High | M2-T9 |
| M3-T4 | Create insight generation chain (SHAP + forecast → insights) | `rag/insights/insight_chain.py` | High | M3-T1, M3-T3 |
| M3-T5 | Build AI Insights FastAPI router | `backend/routers/insights.py` | Medium | M3-T4, M6-T1 |
| M3-T6 | Redesign AIInsights.tsx with real data binding | `src/pages/AIInsights.tsx` (modify) | Medium | M3-T5 |
| M3-T7 | Add SHAP feature importance visualization component | `src/components/insights/ShapChart.tsx` | Medium | M3-T6 |
| M3-T8 | Build weekly/monthly report generation | `rag/insights/report_generator.py` | Medium | M3-T4 |
| M3-T9 | Implement PDF export for reports | `rag/insights/pdf_export.py` | Medium | M3-T8 |
| M3-T10 | Connect chatbot to LLM backend (replace mock responses) | `src/components/chatbot/AIChatbot.tsx`, `backend/routers/chat.py` | High | M3-T1, M6-T1 |
| M3-T11 | Build executive summary generation | `rag/insights/executive_summary.py` | Medium | M3-T4 |

### D. API Endpoints Owned

| Method | Path | Request | Response | Description |
|---|---|---|---|---|
| POST | `/api/v1/insights/generate` | `{ product_id, period }` | `InsightResponse` | Generate AI insights |
| GET | `/api/v1/insights/latest?product_id=` | Query params | `InsightResponse` | Cached latest insights |
| POST | `/api/v1/insights/chat` | `{ message, context? }` | `{ response }` | Chat with AI |
| POST | `/api/v1/reports/generate` | `{ type, period, format }` | `{ report_id, url }` | Generate report |
| GET | `/api/v1/reports/{report_id}` | — | Binary (PDF/CSV) | Download report |
| GET | `/api/v1/reports/list` | — | `Report[]` | List available reports |

### E. Frontend Page Spec

**AI Insights page** (`/insights`) — redesign:
- Data: `/api/v1/insights/generate`, `/api/v1/insights/latest`
- Components: ShapChart (bar chart), InsightCard (dynamic), ExecutiveSummary card
- New: SHAP waterfall chart using Recharts
- State: React Query + mutation for generation
- Loading: Streaming text animation for LLM output

**Chat Assistant** (floating overlay):
- Data: `/api/v1/insights/chat` (POST with message)
- Replace hardcoded responses with streaming LLM responses
- Add context mode: business vs technical (already in UI)

### F. Testing Plan

- Unit: Test prompt templates render correctly with sample data
- Unit: Test SHAP-to-text mapping for known feature values
- Integration: Test full chain: SHAP values → LLM → parsed insight
- Manual: Review generated insights for factual accuracy

### G. Known Risks & Mitigation

| Risk | Mitigation |
|---|---|
| LLM hallucination | Ground all prompts with actual data; add fact-checking step |
| OpenAI API rate limits | Implement caching, batch generation |
| Slow response times | Cache insights per product/period; async generation |
| Prompt engineering iterations | Version prompts, A/B test different templates |

---

## MEMBER 4 — Inventory / RAG Engineer

### A. Environment Setup

```txt
Python 3.10+
scipy==1.12.0
pandas==2.2.0
numpy==1.26.4
langchain==0.1.7
langchain-openai==0.0.6
chromadb==0.4.22
sentence-transformers==2.3.1
fastapi==0.109.0
uvicorn==0.27.0
pydantic==2.6.0
```

### B. Data Contracts

**Input:**
- Forecast results from Member 2 (point + probabilistic)
- All CSV datasets for RAG knowledge base
- Product, supplier, inventory current state

**Output:**

```python
# Inventory optimization result
{
    "product_id": str,
    "reorder_point": float,     # ROP = demand_during_lead_time + safety_stock
    "safety_stock": float,      # SS = Z × σ_demand × √lead_time
    "economic_order_qty": float, # EOQ = √(2DS / H)
    "current_stock": int,
    "days_of_supply": float,
    "risk_level": "low" | "medium" | "high" | "critical",
    "cost_savings": float,
    "recommendation": str,      # natural language recommendation
}

# Alert schema
{
    "alert_id": str,
    "type": "stockout" | "overstock" | "demand_spike" | "supply_delay",
    "severity": "info" | "warning" | "critical",
    "product_id": str,
    "message": str,
    "created_at": datetime,
    "acknowledged": bool,
}
```

### C. Implementation Tasks

| ID | Task | Files | Complexity | Depends On |
|---|---|---|---|---|
| M4-T1 | Implement EOQ, ROP, safety stock formulas | `backend/services/inventory_optimizer.py` | Medium | — |
| M4-T2 | Build inventory analysis with real CSV data | `backend/services/inventory_analysis.py` | Medium | M4-T1, M1-T1 |
| M4-T3 | Create RAG embedding pipeline for inventory docs | `rag/inventory/embeddings.py` | High | — |
| M4-T4 | Set up ChromaDB vector store with inventory data | `rag/inventory/vector_store.py` | Medium | M4-T3 |
| M4-T5 | Build retrieval + QA chain for inventory queries | `rag/inventory/retrieval_chain.py` | High | M4-T4 |
| M4-T6 | Implement alert detection engine | `backend/services/alert_engine.py` | High | M4-T1, M2-T7 |
| M4-T7 | Build FastAPI inventory router | `backend/routers/inventory.py` | Medium | M4-T1, M6-T1 |
| M4-T8 | Build FastAPI alerts router | `backend/routers/alerts.py` | Medium | M4-T6, M6-T1 |
| M4-T9 | Redesign Inventory.tsx with real data | `src/pages/Inventory.tsx` (modify) | Medium | M4-T7 |
| M4-T10 | Add real-time alert notification cards | `src/components/alerts/AlertNotification.tsx` | Medium | M4-T8 |
| M4-T11 | Build cost savings projection chart | `src/components/inventory/CostSavingsChart.tsx` | Low | M4-T9 |
| M4-T12 | Integrate probabilistic forecast into optimization | `backend/services/probabilistic_optimizer.py` | High | M4-T1, M2-T8 |

### D. API Endpoints Owned

| Method | Path | Request | Response | Description |
|---|---|---|---|---|
| GET | `/api/v1/inventory/optimize?product_id=` | Query params | `OptimizationResult[]` | Get optimization results |
| POST | `/api/v1/inventory/calculate` | `{ product_id, service_level }` | `OptimizationResult` | Calculate for one product |
| GET | `/api/v1/inventory/status` | — | `InventoryStatus[]` | Current stock status all |
| POST | `/api/v1/inventory/rag/query` | `{ question }` | `{ answer, sources[] }` | RAG inventory Q&A |
| GET | `/api/v1/alerts/active` | — | `Alert[]` | Get active alerts |
| POST | `/api/v1/alerts/acknowledge/{id}` | — | `{ status }` | Acknowledge alert |
| GET | `/api/v1/alerts/history` | — | `Alert[]` | Alert history |

### E. Frontend Page Spec

**Inventory page** (`/inventory`) — redesign:
- Data: `/api/v1/inventory/optimize`, `/api/v1/inventory/status`
- Components: ProductOptimizationCard, ComparisonChart, CostSavingsChart, RAG Q&A panel
- New: Interactive reorder point slider for what-if analysis
- State: React Query for optimization data

### F. Testing Plan

- Unit: Test EOQ, ROP, safety stock formulas with known inputs
- Unit: Test alert detection thresholds
- Integration: Test RAG retrieval accuracy with sample questions
- Validation: Compare EOQ results against textbook examples

### G. Known Risks & Mitigation

| Risk | Mitigation |
|---|---|
| RAG retrieval quality for tabular data | Chunk CSVs as structured summaries, not raw rows |
| Alert fatigue (too many alerts) | Implement configurable thresholds, deduplication |
| EOQ assumptions violated | Add demand variability checks, use probabilistic variant |

---

## MEMBER 5 — MLOps Engineer

### A. Environment Setup

```txt
Python 3.10+
mlflow==2.10.0
evidently==0.4.13
scikit-learn==1.4.0
fastapi==0.109.0
uvicorn==0.27.0
pandas==2.2.0
numpy==1.26.4
apscheduler==3.10.4  # scheduled jobs
pydantic==2.6.0
```

**Azure Resources:** Azure ML Workspace configured for MLflow tracking.

### B. Data Contracts

**Input:**
- Training/inference feature distributions from Member 1
- Model artifacts + metrics from Member 2
- MLflow experiment tracking data

**Output:**

```python
# Drift report schema
{
    "report_date": datetime,
    "features_analyzed": int,
    "drift_detected": bool,
    "drifted_features": [
        {
            "feature": str,
            "drift_score": float,   # p-value or distance
            "status": "healthy" | "warning" | "critical",
            "test_used": str,       # "ks_test" | "psi" | "chi2"
        }
    ],
    "recommendation": "none" | "monitor" | "retrain",
}

# Model performance schema
{
    "model_name": str,
    "version": str,
    "metrics": {
        "rmse": float,
        "mape": float,
        "wape": float,
        "coverage_90": float,
    },
    "inference_latency_ms": float,
    "last_trained": datetime,
    "status": "active" | "degraded" | "retraining",
}
```

### C. Implementation Tasks

| ID | Task | Files | Complexity | Depends On |
|---|---|---|---|---|
| M5-T1 | Set up MLflow tracking server configuration | `mlops/mlflow_config.py` | Medium | — |
| M5-T2 | Build drift detection using Evidently AI | `mlops/drift_detection.py` | High | M1-T3 |
| M5-T3 | Create automated retraining trigger logic | `mlops/retraining_trigger.py` | High | M5-T2, M2-T11 |
| M5-T4 | Build model comparison and promotion pipeline | `mlops/model_promotion.py` | Medium | M5-T3 |
| M5-T5 | Implement inference latency monitoring | `mlops/latency_monitor.py` | Medium | M2-T13 |
| M5-T6 | Build FastAPI MLOps router | `backend/routers/mlops.py` | Medium | M5-T2, M6-T1 |
| M5-T7 | Redesign MLOps.tsx with real API data | `src/pages/MLOps.tsx` (modify) | Medium | M5-T6 |
| M5-T8 | Add drift detection charts | `src/components/mlops/DriftCharts.tsx` | Medium | M5-T7 |
| M5-T9 | Add retraining history timeline | `src/components/mlops/RetrainingTimeline.tsx` | Low | M5-T7 |
| M5-T10 | Build model version control UI | `src/components/mlops/ModelRegistry.tsx` | Medium | M5-T7 |
| M5-T11 | Implement performance degradation alerting | `mlops/performance_alerts.py` | Medium | M5-T5 |
| M5-T12 | Create scheduled drift check cron job | `mlops/scheduled_checks.py` | Medium | M5-T2 |

### D. API Endpoints Owned

| Method | Path | Request | Response | Description |
|---|---|---|---|---|
| GET | `/api/v1/mlops/drift/latest` | — | `DriftReport` | Latest drift report |
| POST | `/api/v1/mlops/drift/run` | — | `DriftReport` | Trigger drift check now |
| GET | `/api/v1/mlops/models` | — | `ModelPerformance[]` | All model statuses |
| GET | `/api/v1/mlops/models/{name}/history` | — | `MetricHistory[]` | Model metric history |
| POST | `/api/v1/mlops/retrain` | `{ model_name, reason }` | `{ job_id, status }` | Trigger retraining |
| GET | `/api/v1/mlops/retraining/history` | — | `RetrainingRecord[]` | Retraining log |
| GET | `/api/v1/mlops/system/resources` | — | `SystemResources` | CPU/Memory/GPU usage |

### E. Frontend Page Spec

**MLOps page** (`/mlops`) — redesign:
- Data: `/api/v1/mlops/models`, `/api/v1/mlops/drift/latest`, `/api/v1/mlops/retraining/history`
- Components: ModelStatusCards, AccuracyTrendChart, DriftHeatmap, RetrainingTimeline, SystemResources
- New: "Retrain Now" button with confirmation dialog
- State: React Query with 30s auto-refresh for real-time data

### F. Testing Plan

- Unit: Test drift detection scoring with synthetic distributions
- Unit: Test retraining trigger conditions
- Integration: End-to-end: inject drift → detect → trigger retrain
- Validation: Verify Evidently reports match expected format

### G. Known Risks & Mitigation

| Risk | Mitigation |
|---|---|
| False positive drift alerts | Use multiple statistical tests, require consensus |
| Retraining loop (continuous retriggering) | Cooldown period between retraining runs |
| MLflow server unavailability | Local fallback tracking, async logging |

---

## MEMBER 6 — Azure / Backend / Integration Lead

### A. Environment Setup

```txt
Python 3.10+
fastapi==0.109.0
uvicorn==0.27.0
sqlalchemy==2.0.25
alembic==1.13.1
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.1
httpx==0.27.0
pydantic-settings==2.1.0
celery==5.3.6  # async tasks
redis==5.0.1
```

**Tools:** Docker Desktop, Azure CLI, kubectl, Terraform/Bicep.

### B. Data Contracts

Responsible for defining and enforcing all API schemas across members.

### C. Implementation Tasks

| ID | Task | Files | Complexity | Depends On |
|---|---|---|---|---|
| M6-T1 | FastAPI application factory with CORS, error handling, logging | `backend/main.py`, `backend/config.py` | Medium | — |
| M6-T2 | PostgreSQL models with SQLAlchemy | `backend/db/models/` | Medium | — |
| M6-T3 | All API routers and endpoint registration | `backend/routers/__init__.py` | Low | M6-T1 |
| M6-T4 | JWT authentication middleware | `backend/auth/jwt.py`, `backend/auth/middleware.py` | Medium | M6-T1 |
| M6-T5 | User management (register, login, roles) | `backend/routers/auth.py` | Medium | M6-T4 |
| M6-T6 | Database migration system with Alembic | `backend/db/migrations/` | Medium | M6-T2 |
| M6-T7 | docker-compose.yml for local dev | `deployment/docker-compose.yml` | Medium | M6-T1, M6-T2 |
| M6-T8 | Dockerfile for backend | `deployment/Dockerfile.backend` | Low | M6-T1 |
| M6-T9 | Dockerfile for frontend | `deployment/Dockerfile.frontend` | Low | — |
| M6-T10 | GitHub Actions CI/CD workflow | `.github/workflows/ci-cd.yml` | High | M6-T8 |
| M6-T11 | Azure Bicep/Terraform infrastructure | `deployment/azure/main.bicep` | High | — |
| M6-T12 | Connect frontend auth to real backend | `src/contexts/AuthContext.tsx` (modify) | Medium | M6-T5 |
| M6-T13 | Create API client service for frontend | `src/lib/api.ts` | Medium | M6-T3 |
| M6-T14 | Integrate all member routers into main app | `backend/main.py` (modify) | Medium | All member routers |
| M6-T15 | Kubernetes manifests for AKS deployment | `deployment/k8s/` | High | M6-T11 |
| M6-T16 | Rate limiting and request validation | `backend/middleware/rate_limit.py` | Medium | M6-T1 |
| M6-T17 | Health check and readiness endpoints | `backend/routers/health.py` | Low | M6-T1 |
| M6-T18 | Update Login.tsx and Settings.tsx for real API | `src/pages/Login.tsx`, `src/pages/Settings.tsx` | Medium | M6-T5, M6-T13 |

### D. API Endpoints Owned

| Method | Path | Request | Response | Description |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | `{ email, password, name, role }` | `{ token, user }` | Register user |
| POST | `/api/v1/auth/login` | `{ email, password }` | `{ access_token, refresh_token }` | Login |
| POST | `/api/v1/auth/refresh` | `{ refresh_token }` | `{ access_token }` | Refresh token |
| GET | `/api/v1/auth/me` | Bearer token | `User` | Current user info |
| GET | `/api/v1/health` | — | `{ status, version, uptime }` | Health check |
| GET | `/api/v1/health/ready` | — | `{ db, mlflow, redis }` | Readiness |

### E. Frontend Page Spec

**Login page** (`/login`) — modify:
- Replace mock auth with real API calls to `/api/v1/auth/login`
- Add JWT storage in httpOnly cookies or localStorage
- Handle token refresh

**Settings page** (`/settings`) — modify:
- Persist settings to `/api/v1/users/settings` 
- Add real profile update

### F. Testing Plan

- Unit: Test JWT token generation and validation
- Unit: Test database model CRUD operations
- Integration: Test full auth flow (register → login → access protected route)
- E2E: Docker compose spin-up test (all services running)
- CI: GitHub Actions workflow runs linter + tests on PR

### G. Known Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Azure provisioning delays | Start Bicep templates in Sprint 1 |
| Docker image size bloat | Multi-stage builds, .dockerignore |
| Database schema migration conflicts | Alembic with branch merging strategy |
| Integrating 5 different routers | Clear API design contract, versioned endpoints |

---

# STEP 3 — PROJECT-WIDE TECHNICAL DECISIONS

## 1. Dataset Strategy

All datasets are already present as CSVs in the project root. The domain is **industrial kitchen/cooling equipment manufacturing** — 13 products across Cooling (fans, exhaust), Kitchen (air fryers, blenders, espresso, sandwich makers), and Industrial (industrial blenders, mixers).

| Dataset | Records | Date Range | Storage Path |
|---|---|---|---|
| `products.csv` | 13 | — | `azure://supplymind-data/raw/products.csv` |
| `sales_daily.csv` | 15,001 | 2020–2024 | `azure://supplymind-data/raw/sales_daily.csv` |
| `inventory.csv` | 23,753 | 2020–2025 | `azure://supplymind-data/raw/inventory.csv` |
| `production_schedule.csv` | 23,753 | 2020–2025 | `azure://supplymind-data/raw/production_schedule.csv` |
| `suppliers.csv` | 8 | — | `azure://supplymind-data/raw/suppliers.csv` |
| `contracts.csv` | 25 | — | `azure://supplymind-data/raw/contracts.csv` |
| `raw_materials.csv` | 6 | — | `azure://supplymind-data/raw/raw_materials.csv` |
| `bom.csv` | 40 | — | `azure://supplymind-data/raw/bom.csv` |

## 2. Feature Engineering Spec

| Feature | Formula / Method | Type |
|---|---|---|
| `sales_qty` | SUM(qty) per (date, product_id) | int |
| `sales_revenue` | SUM(revenue) per (date, product_id) | float |
| `lag_1` through `lag_30` | sales_qty shifted by N days | int |
| `rolling_mean_7`, `_14`, `_30` | Rolling mean of sales_qty | float |
| `rolling_std_7` | Rolling std of sales_qty (7-day) | float |
| `day_of_week` | date.dayofweek (0=Mon, 6=Sun) | int |
| `month`, `quarter`, `week_of_year` | Calendar features | int |
| `is_weekend` | day_of_week ≥ 5 | bool |
| `is_month_start`, `is_month_end` | Calendar boundaries | bool |
| `price_mean` | AVG(price) per product from sales | float |
| `stock_level` | From inventory.csv JOIN | int |
| `production_actual` | From production_schedule.csv JOIN | int |
| `utilization` | From production_schedule.csv JOIN | float |
| `supplier_reliability` | From suppliers.csv via BOM→raw_materials | float |
| `lead_time` | From suppliers.csv | int |

## 3. Model Selection Rationale

| Model | Why | When to Use |
|---|---|---|
| **XGBoost** | Fast, handles tabular features well, interpretable via SHAP | Default baseline; short horizons (7d); products with sufficient history |
| **LSTM** | Captures sequential dependencies in time series | Medium horizons (14d); products with clear temporal patterns |
| **GRU** | Lighter than LSTM, faster training, similar performance | Alternative to LSTM when training speed matters |
| **TFT** | State-of-the-art for multi-horizon with attention mechanism | Long horizons (30d); multi-product forecasting; interpretable attention |
| **Prophet** | Handles seasonality and holidays automatically | Quick baseline; products with strong seasonal patterns |

**Ensemble strategy:** Per-SKU model selection based on validation MAPE. Use weighted average of top-2 models when margin < 2%.

## 4. LLM Choice and Prompt Strategy

**LLM:** GPT-4o via Azure OpenAI Service (first choice) or OpenAI API direct.

**System Prompt Template:**
```
You are a senior supply chain analyst AI assistant for SupplyMind AI platform. 
You analyze demand forecasting data, SHAP feature importance values, and inventory 
metrics to provide actionable business insights.

RULES:
1. Always ground your analysis in the provided data — never fabricate numbers
2. Express insights as specific, quantified statements
3. Provide actionable recommendations with expected impact
4. Use supply chain terminology appropriately
5. When discussing SHAP values, explain what drives demand up/down in business terms

CONTEXT:
Product: {product_name} ({product_id})
Forecast Period: {start_date} to {end_date}
Model Used: {model_name} (accuracy: {accuracy}%)

SHAP Feature Importances (top 10):
{shap_values_formatted}

Forecast Summary:
- Average predicted demand: {avg_forecast}
- Trend direction: {trend}
- Confidence interval width: {ci_width}
```

**RAG Strategy:** Chunk CSV datasets as structured text summaries per product, not raw rows. Each chunk ~500 tokens describing a product's historical trends, supplier info, and inventory patterns.

## 5. Vector Store Choice

**Recommendation: ChromaDB** (local) → **Azure AI Search** (production)

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| ChromaDB | Free, local, easy setup, Python-native | No managed cloud service | ✅ Dev/staging |
| Azure AI Search | Managed, hybrid search, Azure-native | Cost, more setup | ✅ Production |
| FAISS | Very fast, Facebook-maintained | No persistence management | ❌ |
| Pinecone | Managed, scalable | External vendor, cost | ❌ |

## 6. MLOps Tooling

- **Experiment Tracking:** MLflow on Azure ML
- **Drift Detection:** Evidently AI (open source, generates HTML reports + JSON)
- **Retraining Trigger:** Custom logic: if PSI > 0.2 on any top-5 feature OR MAPE regression > 5%, trigger retrain
- **Model Registry:** MLflow Model Registry with stages: None → Staging → Production → Archived

## 7. Database Schema (PostgreSQL DDL)

```sql
-- Users and Auth
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'analyst')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE products (
    product_id VARCHAR(20) PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    type VARCHAR(50),
    size VARCHAR(20),
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2)
);

-- Daily Sales (aggregated)
CREATE TABLE sales_daily (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    product_id VARCHAR(20) REFERENCES products(product_id),
    total_qty INTEGER NOT NULL,
    total_revenue DECIMAL(15,2) NOT NULL,
    avg_price DECIMAL(10,2),
    UNIQUE(date, product_id)
);
CREATE INDEX idx_sales_daily_date ON sales_daily(date);
CREATE INDEX idx_sales_daily_product ON sales_daily(product_id);

-- Inventory
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    product_id VARCHAR(20) REFERENCES products(product_id),
    stock_level INTEGER NOT NULL,
    UNIQUE(date, product_id)
);

-- Forecasts
CREATE TABLE forecasts (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(20) REFERENCES products(product_id),
    forecast_date DATE NOT NULL,
    target_date DATE NOT NULL,
    horizon INTEGER NOT NULL,
    forecast_value DECIMAL(10,2) NOT NULL,
    lower_bound DECIMAL(10,2),
    upper_bound DECIMAL(10,2),
    model_name VARCHAR(50) NOT NULL,
    model_version VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_forecasts_product ON forecasts(product_id);
CREATE INDEX idx_forecasts_target ON forecasts(target_date);

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(30) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    product_id VARCHAR(20) REFERENCES products(product_id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Model Runs
CREATE TABLE model_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(50) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    mlflow_run_id VARCHAR(50),
    rmse DECIMAL(10,4),
    mape DECIMAL(10,4),
    wape DECIMAL(10,4),
    coverage_90 DECIMAL(5,4),
    training_duration_seconds INTEGER,
    trigger VARCHAR(30) NOT NULL,  -- 'scheduled' | 'drift_detected' | 'manual'
    status VARCHAR(20) NOT NULL,   -- 'running' | 'completed' | 'failed'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Drift Reports
CREATE TABLE drift_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date TIMESTAMP DEFAULT NOW(),
    features_analyzed INTEGER NOT NULL,
    drift_detected BOOLEAN NOT NULL,
    details JSONB NOT NULL,  -- per-feature drift scores
    recommendation VARCHAR(20) NOT NULL
);

-- Generated Reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL,  -- 'weekly' | 'monthly' | 'executive'
    format VARCHAR(10) NOT NULL, -- 'pdf' | 'csv'
    file_path VARCHAR(500),
    generated_by UUID REFERENCES users(id),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Settings
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    theme VARCHAR(10) DEFAULT 'dark',
    notifications JSONB DEFAULT '{}',
    region VARCHAR(20) DEFAULT 'us',
    currency VARCHAR(10) DEFAULT 'usd'
);

-- Suppliers
CREATE TABLE suppliers (
    supplier_id VARCHAR(20) PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    region VARCHAR(50),
    reliability DECIMAL(3,2),
    lead_time_days INTEGER
);
```

## 8. API Design Standards

- **Base URL:** `/api/v1/`
- **Naming:** lowercase, hyphens for multi-word (e.g., `/model-runs`)
- **Pagination:** `?page=1&page_size=20` → response includes `{ items[], total, page, page_size }`
- **Date params:** ISO 8601 format (`2024-01-15`)
- **Error format:**
  ```json
  {
    "error": {
      "code": "RESOURCE_NOT_FOUND",
      "message": "Product with ID 'XYZ' not found",
      "details": {}
    }
  }
  ```
- **Versioning:** URL path (`/api/v1/`, `/api/v2/`)
- **Auth:** Bearer token in `Authorization` header

## 9. Docker and Local Development

```yaml
# docker-compose.yml structure
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: supplymind
      POSTGRES_USER: supplymind
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  backend:
    build: { context: ., dockerfile: deployment/Dockerfile.backend }
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://supplymind:${DB_PASSWORD}@postgres:5432/supplymind
      REDIS_URL: redis://redis:6379
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres, redis]

  frontend:
    build: { context: ., dockerfile: deployment/Dockerfile.frontend }
    ports: ["3000:3000"]
    environment:
      VITE_API_URL: http://localhost:8000/api/v1

  mlflow:
    image: ghcr.io/mlflow/mlflow:latest
    ports: ["5000:5000"]
    command: mlflow server --host 0.0.0.0 --backend-store-uri postgresql://...

volumes:
  pgdata:
```

**Local-only services:** postgres, redis, mlflow, backend, frontend
**Requires Azure:** Blob Storage (can mock with MinIO locally), Azure ML, AKS

## 10. CI/CD Pipeline Stages

```
                    ┌─────────────────────────────────────────────┐
                    │            GitHub Actions Workflow           │
                    └─────────────────────────────────────────────┘
                                        │
              ┌─────────────┬───────────┼───────────┬─────────────┐
              ▼             ▼           ▼           ▼             ▼
          [ Lint ]    [ Unit Test ] [ Build ]  [ Integration ] [ Deploy ]
          eslint       pytest       docker     docker-compose   AKS
          ruff         vitest       build      test suite       kubectl
          mypy
```

**Branch Strategy:**
- `feature/*` → PR to `dev` (runs lint + unit tests)
- `dev` → PR to `staging` (runs full pipeline including integration)
- `staging` → PR to `main` (runs everything + deploys to production)

---

# STEP 4 — SPRINT PLAN

## Sprint 1 — Foundation & Data (Weeks 1–2)

**Goal:** Everyone has their environment, data flows end-to-end, and the first model trains.

| Member | Tasks | Deliverable |
|---|---|---|
| M1 | M1-T1, M1-T2, M1-T3, M1-T4 | Feature-engineered Parquet file ready for Member 2 |
| M2 | M2-T1, M2-T2, M2-T10, M2-T11 | XGBoost model trained, logged to MLflow |
| M3 | M3-T1, M3-T2 | LLM client working, prompt templates drafted |
| M4 | M4-T1, M4-T2 | EOQ/ROP/SS functions working with real data |
| M5 | M5-T1, M5-T2 | MLflow tracking running, Evidently drift report generated |
| M6 | M6-T1, M6-T2, M6-T3, M6-T4, M6-T5, M6-T7 | FastAPI running with auth + PostgreSQL in Docker |

**Demo:** Local docker-compose up → Backend API responds → XGBoost model trains → Drift report generates.

**Integration checkpoints:**
- M1 → M2: Feature Parquet handoff (end of day 5)
- M6: docker-compose shared with all members (day 3)

---

## Sprint 2 — Core Models & APIs (Weeks 3–4)

**Goal:** Forecasting models trained, backend APIs live, basic frontend pages rendering real data.

| Member | Tasks | Deliverable |
|---|---|---|
| M1 | M1-T5, M1-T6, M1-T7 | Dashboard shows real API data, DB tables created |
| M2 | M2-T3, M2-T4, M2-T7, M2-T8, M2-T13, M2-T14 | LSTM + GRU trained, multi-horizon, inference endpoint live |
| M3 | M3-T3, M3-T4, M3-T5 | SHAP-to-text pipeline working, /insights endpoint live |
| M4 | M4-T3, M4-T4, M4-T7, M4-T8, M4-T9 | RAG embedded, inventory/alerts endpoints, Inventory page live |
| M5 | M5-T3, M5-T4, M5-T6, M5-T7 | Retraining trigger, model promotion, MLOps page shows real data |
| M6 | M6-T6, M6-T8, M6-T9, M6-T12, M6-T13 | Alembic migrations, Docker images, frontend auth connected |

**Demo:** Login with real credentials → Dashboard with live data → Forecast 14-day with LSTM → Inventory page with live recs.

**Integration checkpoints:**
- M2 → M3: SHAP values flowing to insight generator (day 3)
- M2 → M4: Forecast data available for inventory optimization (day 5)
- All → M6: All routers registered in main app (day 8)

---

## Sprint 3 — Intelligence Layer (Weeks 5–6)

**Goal:** LLM insights working, RAG inventory Q&A live, MLOps monitoring active, alerts firing.

| Member | Tasks | Deliverable |
|---|---|---|
| M1 | M1-T8, M1-T9, M1-T10 | Data Quality page, Azure upload, automated validation |
| M2 | M2-T5, M2-T6, M2-T9, M2-T12 | TFT model, Prophet, SHAP for all models, model selector |
| M3 | M3-T6, M3-T7, M3-T8, M3-T9, M3-T10 | AI Insights page redesigned, PDF reports, chatbot connected to LLM |
| M4 | M4-T5, M4-T6, M4-T10, M4-T11, M4-T12 | RAG Q&A live, alert engine running, real-time notifications |
| M5 | M5-T5, M5-T8, M5-T9, M5-T10, M5-T11 | Latency monitoring, drift charts, model registry UI |
| M6 | M6-T10, M6-T14, M6-T16, M6-T17 | CI/CD pipeline green, all routers integrated, rate limiting |

**Demo:** Ask chatbot a real question → get LLM response → View AI insights → RAG Q&A → Alerts firing → MLOps drift chart.

**Integration checkpoints:**
- M3 + M4: Both RAG systems working independently (day 3)
- M6: CI/CD pipeline running full test suite (day 5)
- All: Feature freeze for core functionality (day 10)

---

## Sprint 4 — Integration, Polish & Deploy (Weeks 7–8)

**Goal:** Full end-to-end on Azure AKS, all pages complete, CI/CD green, demo-ready.

| Member | Tasks | Deliverable |
|---|---|---|
| M1 | Polish dashboard, visual QA, performance tuning | Production-ready data pipeline + dashboard |
| M2 | Model performance tuning, ensemble finalization | 5+ models in registry, best-per-product selection |
| M3 | M3-T11, chatbot improvements, insight quality tuning | Executive summaries, polished AI output quality |
| M4 | Alert threshold tuning, RAG quality improvements | Battle-tested inventory optimization |
| M5 | M5-T12, monitoring dashboard polish, alerting rules | Automated MLOps pipeline running on schedule |
| M6 | M6-T11, M6-T15, M6-T18, full Azure deployment | AKS cluster running, CI/CD deploying automatically |

**Demo:** Full walkthrough: Landing → Login → Dashboard → Forecast → AI Insights → Inventory → MLOps → Reports (PDF download).

**Integration checkpoints:**
- Day 3: All services running in staging AKS
- Day 5: Full integration testing
- Day 8: Load testing, security review
- Day 10: Production deployment + demo

---

# STEP 5 — FOLDER STRUCTURE

```
supplymind-ai/
│
├── .github/
│   └── workflows/
│       ├── ci.yml                          # Lint + unit tests on PR
│       └── cd.yml                          # Build + deploy on merge to main
│
├── backend/                                # FastAPI application
│   ├── __init__.py
│   ├── main.py                             # App factory, middleware, router registration
│   ├── config.py                           # Pydantic settings from env vars
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── jwt.py                          # Token creation and validation
│   │   ├── middleware.py                   # Auth dependency for routes
│   │   └── password.py                     # bcrypt hashing utilities
│   ├── db/
│   │   ├── __init__.py
│   │   ├── database.py                     # SQLAlchemy engine and session
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py                     # User ORM model
│   │   │   ├── product.py                  # Product, Supplier, BOM models
│   │   │   ├── sales.py                    # Sales and inventory models
│   │   │   ├── forecast.py                 # Forecast result models
│   │   │   ├── alert.py                    # Alert model
│   │   │   ├── model_run.py                # MLOps model run model
│   │   │   └── report.py                   # Generated report model
│   │   └── migrations/
│   │       ├── env.py                      # Alembic environment config
│   │       └── versions/                   # Migration version files
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py                         # Auth endpoints (login, register)
│   │   ├── data.py                         # Data/product/sales endpoints
│   │   ├── forecast.py                     # Forecast endpoints
│   │   ├── inventory.py                    # Inventory optimization endpoints
│   │   ├── alerts.py                       # Alert management endpoints
│   │   ├── insights.py                     # AI insights endpoints
│   │   ├── chat.py                         # Chatbot endpoints
│   │   ├── mlops.py                        # MLOps monitoring endpoints
│   │   ├── reports.py                      # Report generation endpoints
│   │   └── health.py                       # Health check endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── forecast_service.py             # Model inference orchestration
│   │   ├── inventory_optimizer.py          # EOQ, ROP, SS calculations
│   │   ├── inventory_analysis.py           # Inventory analysis with real data
│   │   ├── alert_engine.py                 # Alert detection and management
│   │   └── probabilistic_optimizer.py      # Advanced optimization with uncertainty
│   ├── middleware/
│   │   ├── __init__.py
│   │   └── rate_limit.py                   # Request rate limiting
│   └── schemas/
│       ├── __init__.py
│       ├── auth.py                         # Pydantic schemas for auth
│       ├── data.py                         # Schemas for data endpoints
│       ├── forecast.py                     # Forecast request/response schemas
│       ├── inventory.py                    # Inventory schemas
│       ├── alerts.py                       # Alert schemas
│       ├── insights.py                     # AI insight schemas
│       └── mlops.py                        # MLOps schemas
│
├── ml_pipeline/                            # ML model training and evaluation
│   ├── __init__.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base_model.py                   # Abstract base class for all models
│   │   ├── xgboost_model.py                # XGBoost implementation
│   │   ├── lstm_model.py                   # LSTM implementation (PyTorch)
│   │   ├── gru_model.py                    # GRU implementation (PyTorch)
│   │   ├── tft_model.py                    # Temporal Fusion Transformer
│   │   └── prophet_model.py                # Prophet wrapper
│   ├── feature_engineering/
│   │   ├── __init__.py
│   │   ├── preprocess.py                   # Data cleaning and preprocessing
│   │   └── features.py                     # Feature generation functions
│   ├── training/
│   │   ├── __init__.py
│   │   ├── train.py                        # Main training script with MLflow
│   │   ├── multi_horizon.py                # Multi-horizon training logic
│   │   └── quantile.py                     # Confidence interval estimation
│   └── evaluation/
│       ├── __init__.py
│       ├── metrics.py                      # RMSE, MAPE, WAPE, coverage
│       ├── shap_analysis.py                # SHAP value extraction
│       └── model_selector.py               # Best model per product selection
│
├── rag/                                    # RAG and LLM systems
│   ├── __init__.py
│   ├── insights/
│   │   ├── __init__.py
│   │   ├── llm_client.py                   # LLM wrapper (OpenAI/Azure)
│   │   ├── shap_interpreter.py             # SHAP → text translation
│   │   ├── insight_chain.py                # Full insight generation chain
│   │   ├── executive_summary.py            # Executive summary generation
│   │   ├── report_generator.py             # Weekly/monthly report generation
│   │   ├── pdf_export.py                   # PDF rendering with WeasyPrint
│   │   └── prompts/
│   │       ├── system_prompt.txt           # Main system prompt
│   │       ├── insight_prompt.txt          # Insight generation template
│   │       ├── summary_prompt.txt          # Summary generation template
│   │       └── chat_prompt.txt             # Chat assistant template
│   └── inventory/
│       ├── __init__.py
│       ├── embeddings.py                   # Document embedding pipeline
│       ├── vector_store.py                 # ChromaDB vector store setup
│       └── retrieval_chain.py              # RAG retrieval + QA chain
│
├── mlops/                                  # MLOps tooling
│   ├── __init__.py
│   ├── mlflow_config.py                    # MLflow tracking configuration
│   ├── drift_detection.py                  # Evidently AI drift detection
│   ├── retraining_trigger.py               # Automated retraining logic
│   ├── model_promotion.py                  # Model staging/promotion pipeline
│   ├── latency_monitor.py                  # Inference performance tracking
│   ├── performance_alerts.py               # Model degradation alerting
│   └── scheduled_checks.py                 # Cron job definitions
│
├── data/                                   # Data assets and contracts
│   ├── raw/                                # Original CSV datasets
│   │   ├── products.csv
│   │   ├── sales_daily.csv
│   │   ├── inventory.csv
│   │   ├── production_schedule.csv
│   │   ├── suppliers.csv
│   │   ├── contracts.csv
│   │   ├── raw_materials.csv
│   │   └── bom.csv
│   ├── processed/                          # Feature-engineered outputs
│   │   └── features_daily.parquet
│   ├── schemas/
│   │   ├── input_schema.json               # Expected input data schema
│   │   └── output_schema.json              # Model output data contract
│   ├── validation/
│   │   └── expectations.py                 # Great Expectations validation suite
│   ├── ingest.py                           # Data ingestion script
│   ├── upload_azure.py                     # Azure Blob upload utility
│   └── quality_cron.py                     # Scheduled data quality checks
│
├── deployment/                             # Infrastructure and deployment
│   ├── Dockerfile.backend                  # Python/FastAPI image
│   ├── Dockerfile.frontend                 # Node/Vite build + Nginx serve
│   ├── docker-compose.yml                  # Local development stack
│   ├── docker-compose.prod.yml             # Production overrides
│   ├── k8s/
│   │   ├── namespace.yml                   # Kubernetes namespace
│   │   ├── backend-deployment.yml          # Backend pods
│   │   ├── frontend-deployment.yml         # Frontend pods
│   │   ├── postgres-statefulset.yml        # Database StatefulSet
│   │   ├── redis-deployment.yml            # Redis cache
│   │   ├── ingress.yml                     # Ingress controller rules
│   │   └── secrets.yml                     # Secret references (Key Vault)
│   └── azure/
│       ├── main.bicep                      # Azure infrastructure as code
│       ├── parameters.json                 # Bicep parameters
│       └── deploy.sh                       # Deployment helper script
│
├── tests/                                  # All test files
│   ├── unit/
│   │   ├── test_feature_engineering.py
│   │   ├── test_models.py
│   │   ├── test_inventory_optimizer.py
│   │   ├── test_auth.py
│   │   ├── test_metrics.py
│   │   └── test_drift_detection.py
│   ├── integration/
│   │   ├── test_data_pipeline.py
│   │   ├── test_forecast_endpoint.py
│   │   ├── test_inventory_endpoint.py
│   │   └── test_auth_flow.py
│   └── e2e/
│       └── test_full_workflow.py
│
├── notebooks/                              # Jupyter notebooks
│   ├── 01_eda_sales.ipynb                  # Sales data exploration
│   ├── 02_eda_inventory.ipynb              # Inventory patterns
│   ├── 03_feature_engineering.ipynb        # Feature development
│   ├── 04_model_comparison.ipynb           # Model benchmarking
│   └── 05_shap_analysis.ipynb              # SHAP value exploration
│
├── src/                                    # React frontend (existing + new)
│   ├── (existing structure preserved)
│   ├── lib/
│   │   ├── api.ts                          # API client with auth headers
│   │   ├── mockData.ts                     # (keep for fallback/demo mode)
│   │   └── utils.ts
│   └── components/
│       ├── insights/
│       │   └── ShapChart.tsx               # SHAP waterfall visualization
│       ├── inventory/
│       │   └── CostSavingsChart.tsx         # Cost savings projection
│       ├── mlops/
│       │   ├── DriftCharts.tsx             # Drift visualization
│       │   ├── RetrainingTimeline.tsx       # Retraining history
│       │   └── ModelRegistry.tsx            # Model version UI
│       └── alerts/
│           └── AlertNotification.tsx        # Real-time alert cards
│
├── .env.example                            # Environment variable template
├── pyproject.toml                          # Python project config (ruff, pytest)
├── requirements/
│   ├── base.txt                            # Shared Python dependencies
│   ├── ml.txt                              # ML-specific (Member 2)
│   ├── llm.txt                             # LLM/RAG-specific (Member 3, 4)
│   ├── mlops.txt                           # MLOps-specific (Member 5)
│   └── dev.txt                             # Development tools (pytest, ruff)
├── package.json                            # (existing) Frontend dependencies
└── README.md                               # Updated project documentation
```

---

# STEP 6 — STARTER CODE GENERATION

## Member 1 — Data Ingestion & Preprocessing

### `data/ingest.py`
```python
"""
Data ingestion module for SupplyMind AI.
Loads all CSV datasets and provides unified access.
Owner: Member 1 (Data Engineer)
"""
import pandas as pd
from pathlib import Path
from typing import Dict

DATA_DIR = Path(__file__).parent / "raw"


def load_all_datasets() -> Dict[str, pd.DataFrame]:
    """Load all raw CSV datasets into a dictionary of DataFrames."""
    datasets = {
        "products": pd.read_csv(DATA_DIR / "products.csv"),
        "sales": pd.read_csv(DATA_DIR / "sales_daily.csv", parse_dates=["date"]),
        "inventory": pd.read_csv(DATA_DIR / "inventory.csv", parse_dates=["date"]),
        "production": pd.read_csv(DATA_DIR / "production_schedule.csv", parse_dates=["date"]),
        "suppliers": pd.read_csv(DATA_DIR / "suppliers.csv"),
        "contracts": pd.read_csv(DATA_DIR / "contracts.csv", parse_dates=["start", "end"]),
        "raw_materials": pd.read_csv(DATA_DIR / "raw_materials.csv"),
        "bom": pd.read_csv(DATA_DIR / "bom.csv"),
    }
    return datasets


def validate_dataset(df: pd.DataFrame, name: str) -> Dict:
    """Run basic validation checks on a dataset."""
    report = {
        "name": name,
        "shape": df.shape,
        "null_counts": df.isnull().sum().to_dict(),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "duplicates": int(df.duplicated().sum()),
    }
    return report


if __name__ == "__main__":
    datasets = load_all_datasets()
    for name, df in datasets.items():
        report = validate_dataset(df, name)
        print(f"\n{'='*50}")
        print(f"Dataset: {name}")
        print(f"Shape: {report['shape']}")
        print(f"Duplicates: {report['duplicates']}")
        nulls = {k: v for k, v in report['null_counts'].items() if v > 0}
        print(f"Null columns: {nulls if nulls else 'None'}")
```

### `ml_pipeline/feature_engineering/preprocess.py`
```python
"""
Data preprocessing pipeline.
Cleans and standardizes raw data for feature engineering.
Owner: Member 1 (Data Engineer)
"""
import pandas as pd
import numpy as np
from typing import Tuple


class DataPreprocessor:
    """Cleans and prepares raw datasets for feature engineering."""

    def __init__(self):
        self.product_ids = None

    def clean_sales(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean sales data: remove outliers, handle missing values."""
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        df = df.dropna(subset=["product_id", "qty", "revenue"])
        df = df[df["qty"] > 0]
        df = df[df["revenue"] > 0]
        return df

    def aggregate_daily_sales(self, df: pd.DataFrame) -> pd.DataFrame:
        """Aggregate sales to daily level per product."""
        daily = df.groupby(["date", "product_id"]).agg(
            sales_qty=("qty", "sum"),
            sales_revenue=("revenue", "sum"),
            avg_price=("price", "mean"),
            num_transactions=("sale_id", "count"),
        ).reset_index()
        return daily

    def clean_inventory(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean inventory data."""
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        df = df.dropna(subset=["product_id", "stock"])
        df["stock"] = df["stock"].clip(lower=0)
        return df

    def clean_production(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean production schedule data."""
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        df["utilization"] = df["utilization"].clip(0, 1)
        return df

    def merge_all(
        self,
        daily_sales: pd.DataFrame,
        inventory: pd.DataFrame,
        production: pd.DataFrame,
        suppliers: pd.DataFrame,
        raw_materials: pd.DataFrame,
        bom: pd.DataFrame,
    ) -> pd.DataFrame:
        """Merge all cleaned datasets into a unified DataFrame."""
        # Merge sales + inventory
        merged = pd.merge(
            daily_sales, inventory,
            on=["date", "product_id"], how="left"
        )
        # Merge production
        merged = pd.merge(
            merged,
            production[["date", "product_id", "actual", "utilization"]].rename(
                columns={"actual": "production_actual"}
            ),
            on=["date", "product_id"], how="left"
        )
        # Add supplier info via BOM → raw_materials → suppliers
        supplier_info = (
            bom.merge(raw_materials, on="material_id")
                .merge(suppliers, on="supplier_id")
                .groupby("product_id")
                .agg(
                    supplier_reliability=("reliability", "mean"),
                    lead_time=("lead_time_days", "max"),
                )
                .reset_index()
        )
        merged = pd.merge(merged, supplier_info, on="product_id", how="left")
        return merged
```

### `ml_pipeline/feature_engineering/features.py`
```python
"""
Feature engineering functions for demand forecasting.
Generates lag features, rolling statistics, and calendar features.
Owner: Member 1 (Data Engineer)
"""
import pandas as pd
import numpy as np


def add_lag_features(df: pd.DataFrame, target_col: str = "sales_qty",
                     lags: list = [1, 7, 14, 30]) -> pd.DataFrame:
    """Add lagged values of target column per product."""
    df = df.sort_values(["product_id", "date"])
    for lag in lags:
        df[f"lag_{lag}"] = df.groupby("product_id")[target_col].shift(lag)
    return df


def add_rolling_features(df: pd.DataFrame, target_col: str = "sales_qty",
                         windows: list = [7, 14, 30]) -> pd.DataFrame:
    """Add rolling mean and std features per product."""
    df = df.sort_values(["product_id", "date"])
    for window in windows:
        df[f"rolling_mean_{window}"] = (
            df.groupby("product_id")[target_col]
            .transform(lambda x: x.rolling(window, min_periods=1).mean())
        )
    df["rolling_std_7"] = (
        df.groupby("product_id")[target_col]
        .transform(lambda x: x.rolling(7, min_periods=1).std())
    )
    return df


def add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add calendar-based features from the date column."""
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    df["quarter"] = df["date"].dt.quarter
    df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
    df["is_month_start"] = df["date"].dt.is_month_start.astype(int)
    df["is_month_end"] = df["date"].dt.is_month_end.astype(int)
    return df


def build_feature_set(merged_df: pd.DataFrame) -> pd.DataFrame:
    """Run the full feature engineering pipeline."""
    df = merged_df.copy()
    df = add_lag_features(df)
    df = add_rolling_features(df)
    df = add_calendar_features(df)
    df = df.dropna(subset=["lag_30"])  # Drop rows without enough history
    return df
```

---

## Member 2 — Models & Training

### `ml_pipeline/models/base_model.py`
```python
"""
Abstract base class for all forecasting models.
All models must implement this interface.
Owner: Member 2 (ML Engineer)
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np
from pathlib import Path


class BaseForecaster(ABC):
    """Abstract base class for demand forecasting models."""

    def __init__(self, model_name: str, **kwargs):
        self.model_name = model_name
        self.model = None
        self.is_fitted = False
        self.feature_names = None
        self.params = kwargs

    @abstractmethod
    def fit(self, X_train: pd.DataFrame, y_train: pd.Series,
            X_val: Optional[pd.DataFrame] = None,
            y_val: Optional[pd.Series] = None) -> "BaseForecaster":
        """Train the model on training data."""
        pass

    @abstractmethod
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Generate point predictions."""
        pass

    @abstractmethod
    def predict_interval(self, X: pd.DataFrame,
                         alpha: float = 0.1) -> Dict[str, np.ndarray]:
        """Generate prediction intervals (lower, upper bounds)."""
        pass

    @abstractmethod
    def save(self, path: Path) -> None:
        """Save model artifact to disk."""
        pass

    @abstractmethod
    def load(self, path: Path) -> "BaseForecaster":
        """Load model artifact from disk."""
        pass

    def evaluate(self, y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
        """Compute standard evaluation metrics."""
        from ml_pipeline.evaluation.metrics import compute_metrics
        return compute_metrics(y_true, y_pred)

    def get_feature_importance(self, X: pd.DataFrame) -> Dict[str, float]:
        """Get feature importance (override for SHAP-based models)."""
        return {}
```

### `ml_pipeline/models/xgboost_model.py`
```python
"""
XGBoost forecasting model implementation.
Owner: Member 2 (ML Engineer)
"""
import xgboost as xgb
import numpy as np
import pandas as pd
import shap
import joblib
from pathlib import Path
from typing import Dict, Optional

from ml_pipeline.models.base_model import BaseForecaster


class XGBoostForecaster(BaseForecaster):
    """XGBoost-based demand forecasting model."""

    def __init__(self, **kwargs):
        super().__init__(model_name="xgboost", **kwargs)
        self.default_params = {
            "n_estimators": 500,
            "max_depth": 6,
            "learning_rate": 0.05,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "min_child_weight": 5,
            "reg_alpha": 0.1,
            "reg_lambda": 1.0,
            "random_state": 42,
        }
        self.default_params.update(kwargs)

    def fit(self, X_train: pd.DataFrame, y_train: pd.Series,
            X_val: Optional[pd.DataFrame] = None,
            y_val: Optional[pd.Series] = None) -> "XGBoostForecaster":
        self.feature_names = list(X_train.columns)
        self.model = xgb.XGBRegressor(**self.default_params)

        eval_set = [(X_train, y_train)]
        if X_val is not None and y_val is not None:
            eval_set.append((X_val, y_val))

        self.model.fit(
            X_train, y_train,
            eval_set=eval_set,
            verbose=False,
        )
        self.is_fitted = True
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        assert self.is_fitted, "Model must be fitted before prediction"
        return self.model.predict(X)

    def predict_interval(self, X: pd.DataFrame,
                         alpha: float = 0.1) -> Dict[str, np.ndarray]:
        """Estimate prediction intervals using quantile regression."""
        point = self.predict(X)
        # Simple approach: use residuals std for interval estimation
        # In production, train separate quantile models
        std_estimate = np.std(point) * 0.15  # placeholder
        z = 1.645  # 90% confidence
        return {
            "forecast": point,
            "lower": point - z * std_estimate,
            "upper": point + z * std_estimate,
        }

    def get_feature_importance(self, X: pd.DataFrame) -> Dict[str, float]:
        """Get SHAP-based feature importance."""
        explainer = shap.TreeExplainer(self.model)
        shap_values = explainer.shap_values(X[:100])  # sample for speed
        importance = dict(zip(
            self.feature_names,
            np.abs(shap_values).mean(axis=0)
        ))
        return dict(sorted(importance.items(), key=lambda x: x[1], reverse=True)[:10])

    def save(self, path: Path) -> None:
        path.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, path / "xgboost_model.joblib")
        joblib.dump(self.feature_names, path / "feature_names.joblib")

    def load(self, path: Path) -> "XGBoostForecaster":
        self.model = joblib.load(path / "xgboost_model.joblib")
        self.feature_names = joblib.load(path / "feature_names.joblib")
        self.is_fitted = True
        return self
```

### `ml_pipeline/models/lstm_model.py`
```python
"""
LSTM forecasting model implementation using PyTorch.
Owner: Member 2 (ML Engineer)
"""
import torch
import torch.nn as nn
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Optional, Tuple

from ml_pipeline.models.base_model import BaseForecaster


class LSTMNetwork(nn.Module):
    """PyTorch LSTM network for time series forecasting."""

    def __init__(self, input_size: int, hidden_size: int = 64,
                 num_layers: int = 2, dropout: float = 0.2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout,
        )
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        lstm_out, _ = self.lstm(x)
        out = self.fc(lstm_out[:, -1, :])  # last time step
        return out.squeeze(-1)


class LSTMForecaster(BaseForecaster):
    """LSTM-based demand forecasting model."""

    def __init__(self, sequence_length: int = 14, hidden_size: int = 64,
                 num_layers: int = 2, epochs: int = 50,
                 learning_rate: float = 0.001, batch_size: int = 32, **kwargs):
        super().__init__(model_name="lstm", **kwargs)
        self.sequence_length = sequence_length
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.epochs = epochs
        self.learning_rate = learning_rate
        self.batch_size = batch_size
        self.scaler_X = None
        self.scaler_y = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def _create_sequences(self, X: np.ndarray, y: np.ndarray
                          ) -> Tuple[np.ndarray, np.ndarray]:
        """Create sliding window sequences for LSTM input."""
        X_seq, y_seq = [], []
        for i in range(len(X) - self.sequence_length):
            X_seq.append(X[i:i + self.sequence_length])
            y_seq.append(y[i + self.sequence_length])
        return np.array(X_seq), np.array(y_seq)

    def fit(self, X_train: pd.DataFrame, y_train: pd.Series,
            X_val: Optional[pd.DataFrame] = None,
            y_val: Optional[pd.Series] = None) -> "LSTMForecaster":
        from sklearn.preprocessing import StandardScaler

        self.feature_names = list(X_train.columns)
        self.scaler_X = StandardScaler().fit(X_train)
        self.scaler_y = StandardScaler().fit(y_train.values.reshape(-1, 1))

        X_scaled = self.scaler_X.transform(X_train)
        y_scaled = self.scaler_y.transform(y_train.values.reshape(-1, 1)).flatten()

        X_seq, y_seq = self._create_sequences(X_scaled, y_scaled)

        self.model = LSTMNetwork(
            input_size=X_train.shape[1],
            hidden_size=self.hidden_size,
            num_layers=self.num_layers,
        ).to(self.device)

        optimizer = torch.optim.Adam(self.model.parameters(), lr=self.learning_rate)
        criterion = nn.MSELoss()

        dataset = torch.utils.data.TensorDataset(
            torch.FloatTensor(X_seq), torch.FloatTensor(y_seq)
        )
        loader = torch.utils.data.DataLoader(
            dataset, batch_size=self.batch_size, shuffle=True
        )

        self.model.train()
        for epoch in range(self.epochs):
            total_loss = 0
            for batch_X, batch_y in loader:
                batch_X, batch_y = batch_X.to(self.device), batch_y.to(self.device)
                optimizer.zero_grad()
                pred = self.model(batch_X)
                loss = criterion(pred, batch_y)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()

        self.is_fitted = True
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        assert self.is_fitted, "Model must be fitted before prediction"
        X_scaled = self.scaler_X.transform(X)
        X_seq, _ = self._create_sequences(X_scaled, np.zeros(len(X)))

        self.model.eval()
        with torch.no_grad():
            tensor = torch.FloatTensor(X_seq).to(self.device)
            pred_scaled = self.model(tensor).cpu().numpy()

        return self.scaler_y.inverse_transform(pred_scaled.reshape(-1, 1)).flatten()

    def predict_interval(self, X: pd.DataFrame,
                         alpha: float = 0.1) -> Dict[str, np.ndarray]:
        point = self.predict(X)
        std = np.std(point) * 0.1
        z = 1.645
        return {
            "forecast": point,
            "lower": point - z * std,
            "upper": point + z * std,
        }

    def save(self, path: Path) -> None:
        path.mkdir(parents=True, exist_ok=True)
        torch.save(self.model.state_dict(), path / "lstm_model.pt")

    def load(self, path: Path) -> "LSTMForecaster":
        # Requires knowing input_size — store as metadata
        self.model.load_state_dict(torch.load(path / "lstm_model.pt"))
        self.is_fitted = True
        return self
```

### `ml_pipeline/training/train.py`
```python
"""
Main training script with MLflow logging.
Owner: Member 2 (ML Engineer)
"""
import mlflow
import mlflow.sklearn
import pandas as pd
from pathlib import Path
from sklearn.model_selection import TimeSeriesSplit

from ml_pipeline.models.xgboost_model import XGBoostForecaster
from ml_pipeline.evaluation.metrics import compute_metrics


def train_model(
    features_path: str = "data/processed/features_daily.parquet",
    model_type: str = "xgboost",
    product_id: str = None,
    experiment_name: str = "supplymind-forecasting",
):
    """Train a forecasting model and log to MLflow."""
    mlflow.set_experiment(experiment_name)

    # Load features
    df = pd.read_parquet(features_path)
    if product_id:
        df = df[df["product_id"] == product_id]

    # Time-based split
    df = df.sort_values("date")
    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]

    feature_cols = [c for c in df.columns if c not in ["date", "product_id", "sales_qty"]]
    X_train, y_train = train_df[feature_cols], train_df["sales_qty"]
    X_test, y_test = test_df[feature_cols], test_df["sales_qty"]

    # Train
    with mlflow.start_run(run_name=f"{model_type}_{product_id or 'all'}"):
        if model_type == "xgboost":
            model = XGBoostForecaster()
        else:
            raise ValueError(f"Unknown model type: {model_type}")

        model.fit(X_train, y_train, X_test, y_test)
        predictions = model.predict(X_test)
        metrics = compute_metrics(y_test.values, predictions)

        # Log to MLflow
        mlflow.log_params(model.params if hasattr(model, 'params') else {})
        mlflow.log_metrics(metrics)
        mlflow.log_param("model_type", model_type)
        mlflow.log_param("product_id", product_id or "all")
        mlflow.log_param("train_size", len(X_train))
        mlflow.log_param("test_size", len(X_test))

        # Save model
        model_path = Path(f"models/{model_type}_{product_id or 'all'}")
        model.save(model_path)
        mlflow.log_artifacts(str(model_path))

        print(f"Model: {model_type} | Metrics: {metrics}")
        return model, metrics


if __name__ == "__main__":
    train_model(model_type="xgboost")
```

### `ml_pipeline/evaluation/metrics.py`
```python
"""
Evaluation metrics for forecasting models.
Owner: Member 2 (ML Engineer)
"""
import numpy as np
from typing import Dict


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Compute standard forecasting evaluation metrics."""
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    mask = y_true != 0  # avoid division by zero

    rmse = np.sqrt(np.mean((y_true - y_pred) ** 2))
    mae = np.mean(np.abs(y_true - y_pred))
    mape = np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100
    wape = np.sum(np.abs(y_true - y_pred)) / np.sum(np.abs(y_true)) * 100

    return {
        "rmse": round(float(rmse), 4),
        "mae": round(float(mae), 4),
        "mape": round(float(mape), 4),
        "wape": round(float(wape), 4),
    }


def compute_coverage(y_true: np.ndarray, lower: np.ndarray,
                     upper: np.ndarray) -> float:
    """Compute prediction interval coverage (% of actuals within bounds)."""
    within = np.sum((y_true >= lower) & (y_true <= upper))
    return round(float(within / len(y_true)), 4)
```

---

## Member 3 — LLM Client & Insight Chain

### `rag/insights/llm_client.py`
```python
"""
LLM client wrapper with provider abstraction.
Supports OpenAI, Azure OpenAI, with fallback.
Owner: Member 3 (LLM Engineer)
"""
import os
from typing import Optional
from openai import OpenAI


class LLMClient:
    """Unified LLM client wrapper."""

    def __init__(self, provider: str = "openai", model: str = "gpt-4o"):
        self.provider = provider
        self.model = model
        self._init_client()

    def _init_client(self):
        if self.provider == "openai":
            self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        elif self.provider == "azure":
            from openai import AzureOpenAI
            self.client = AzureOpenAI(
                api_key=os.getenv("AZURE_OPENAI_KEY"),
                api_version="2024-02-01",
                azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            )
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")

    def generate(self, system_prompt: str, user_prompt: str,
                 temperature: float = 0.3, max_tokens: int = 1500) -> str:
        """Generate a completion from the LLM."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content

    def generate_stream(self, system_prompt: str, user_prompt: str,
                        temperature: float = 0.3):
        """Generate streaming completion for real-time chat."""
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            stream=True,
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
```

### `rag/insights/prompts/system_prompt.txt`
```
You are SupplyMind AI, a senior supply chain intelligence analyst. You convert 
quantitative forecasting data and SHAP feature importance values into clear, 
actionable business insights.

RULES:
1. Always cite specific numbers from the provided data
2. Never fabricate or estimate values not given to you
3. Express impacts in business terms (revenue, cost, risk)
4. Provide 3-5 specific, actionable recommendations
5. Rate each insight's impact as HIGH, MEDIUM, or LOW
6. Rate your confidence in each insight from 0-100%

OUTPUT FORMAT:
Respond in valid JSON matching this schema:
{
  "insights": [
    {
      "title": "concise title",
      "description": "2-3 sentence explanation",
      "impact": "high|medium|low",
      "direction": "up|down|neutral",
      "factor": "category name",
      "confidence": 85
    }
  ],
  "executive_summary": "2-3 paragraph business summary",
  "recommendations": ["action 1", "action 2", "action 3"]
}
```

---

## Member 4 — Inventory Optimization

### `backend/services/inventory_optimizer.py`
```python
"""
Inventory optimization functions: EOQ, ROP, Safety Stock.
Owner: Member 4 (Inventory/RAG Engineer)
"""
import numpy as np
from typing import Dict
from scipy import stats


def calculate_eoq(annual_demand: float, ordering_cost: float,
                  holding_cost_per_unit: float) -> float:
    """
    Economic Order Quantity (EOQ) = √(2DS / H)
    D = annual demand, S = ordering cost, H = holding cost per unit per year
    """
    if holding_cost_per_unit <= 0:
        raise ValueError("Holding cost must be positive")
    return np.sqrt((2 * annual_demand * ordering_cost) / holding_cost_per_unit)


def calculate_reorder_point(avg_daily_demand: float, lead_time_days: int,
                            safety_stock: float) -> float:
    """
    Reorder Point (ROP) = (Average Daily Demand × Lead Time) + Safety Stock
    """
    return (avg_daily_demand * lead_time_days) + safety_stock


def calculate_safety_stock(demand_std: float, lead_time_days: int,
                           service_level: float = 0.95) -> float:
    """
    Safety Stock = Z × σ_demand × √(Lead Time)
    Z = Z-score for desired service level (95% → Z ≈ 1.645)
    """
    z_score = stats.norm.ppf(service_level)
    return z_score * demand_std * np.sqrt(lead_time_days)


def calculate_days_of_supply(current_stock: int,
                             avg_daily_demand: float) -> float:
    """Days of Supply = Current Stock / Average Daily Demand"""
    if avg_daily_demand <= 0:
        return float("inf")
    return current_stock / avg_daily_demand


def assess_risk_level(current_stock: int, reorder_point: float,
                      safety_stock: float) -> str:
    """Determine inventory risk level."""
    if current_stock <= safety_stock * 0.5:
        return "critical"
    elif current_stock <= safety_stock:
        return "high"
    elif current_stock <= reorder_point:
        return "medium"
    else:
        return "low"


def optimize_product(
    product_id: str,
    avg_daily_demand: float,
    demand_std: float,
    current_stock: int,
    lead_time_days: int,
    ordering_cost: float = 50.0,
    holding_cost_rate: float = 0.25,
    unit_cost: float = 100.0,
    service_level: float = 0.95,
) -> Dict:
    """Run full optimization for a single product."""
    annual_demand = avg_daily_demand * 365
    holding_cost = unit_cost * holding_cost_rate

    safety_stock = calculate_safety_stock(demand_std, lead_time_days, service_level)
    rop = calculate_reorder_point(avg_daily_demand, lead_time_days, safety_stock)
    eoq = calculate_eoq(annual_demand, ordering_cost, holding_cost)
    dos = calculate_days_of_supply(current_stock, avg_daily_demand)
    risk = assess_risk_level(current_stock, rop, safety_stock)

    # Estimate cost savings from optimization
    current_order_cost = (annual_demand / current_stock) * ordering_cost if current_stock > 0 else 0
    optimal_order_cost = (annual_demand / eoq) * ordering_cost
    cost_savings = max(0, current_order_cost - optimal_order_cost)

    return {
        "product_id": product_id,
        "reorder_point": round(rop, 1),
        "safety_stock": round(safety_stock, 1),
        "economic_order_qty": round(eoq, 1),
        "current_stock": current_stock,
        "days_of_supply": round(dos, 1),
        "risk_level": risk,
        "cost_savings": round(cost_savings, 2),
    }
```

---

## Member 5 — MLOps Drift Detection

### `mlops/drift_detection.py`
```python
"""
Data drift detection using Evidently AI.
Owner: Member 5 (MLOps Engineer)
"""
import pandas as pd
import numpy as np
from typing import Dict, List
from datetime import datetime

try:
    from evidently.report import Report
    from evidently.metric_preset import DataDriftPreset
    EVIDENTLY_AVAILABLE = True
except ImportError:
    EVIDENTLY_AVAILABLE = False


def detect_drift(
    reference_data: pd.DataFrame,
    current_data: pd.DataFrame,
    feature_columns: List[str],
    threshold: float = 0.05,
) -> Dict:
    """
    Detect data drift between reference and current distributions.
    Uses Evidently AI if available, falls back to KS test.
    """
    if EVIDENTLY_AVAILABLE:
        return _evidently_drift(reference_data, current_data, feature_columns)
    else:
        return _manual_drift(reference_data, current_data, feature_columns, threshold)


def _manual_drift(
    reference: pd.DataFrame,
    current: pd.DataFrame,
    features: List[str],
    threshold: float,
) -> Dict:
    """Manual drift detection using Kolmogorov-Smirnov test."""
    from scipy.stats import ks_2samp

    results = []
    drift_detected = False

    for feature in features:
        if feature not in reference.columns or feature not in current.columns:
            continue

        ref_values = reference[feature].dropna()
        cur_values = current[feature].dropna()

        if len(ref_values) == 0 or len(cur_values) == 0:
            continue

        stat, p_value = ks_2samp(ref_values, cur_values)

        status = "healthy"
        if p_value < threshold:
            status = "critical"
            drift_detected = True
        elif p_value < threshold * 5:
            status = "warning"

        results.append({
            "feature": feature,
            "drift_score": round(float(stat), 4),
            "p_value": round(float(p_value), 4),
            "status": status,
            "test_used": "ks_test",
        })

    recommendation = "none"
    critical_count = sum(1 for r in results if r["status"] == "critical")
    if critical_count >= 3:
        recommendation = "retrain"
    elif critical_count >= 1:
        recommendation = "monitor"

    return {
        "report_date": datetime.utcnow().isoformat(),
        "features_analyzed": len(results),
        "drift_detected": drift_detected,
        "drifted_features": results,
        "recommendation": recommendation,
    }


def _evidently_drift(reference, current, features):
    """Use Evidently AI for comprehensive drift detection."""
    report = Report(metrics=[DataDriftPreset()])
    report.run(reference_data=reference[features], current_data=current[features])
    result = report.as_dict()

    drifted = []
    for metric in result.get("metrics", []):
        if "data_drift" in str(metric.get("metric", "")):
            # Parse Evidently output
            pass

    return {
        "report_date": datetime.utcnow().isoformat(),
        "features_analyzed": len(features),
        "drift_detected": False,
        "drifted_features": drifted,
        "recommendation": "none",
    }
```

---

## Member 6 — FastAPI Backend & Infrastructure

### `backend/main.py`
```python
"""
FastAPI application factory.
Central backend for SupplyMind AI platform.
Owner: Member 6 (Backend/Azure Lead)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.config import settings
from backend.db.database import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="SupplyMind AI API",
        description="AI-Powered Demand Forecasting & Inventory Optimization",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    from backend.routers import auth, data, forecast, inventory, alerts
    from backend.routers import insights, chat, mlops, reports, health

    app.include_router(health.router, prefix="/api/v1", tags=["Health"])
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
    app.include_router(data.router, prefix="/api/v1/data", tags=["Data"])
    app.include_router(forecast.router, prefix="/api/v1/forecast", tags=["Forecast"])
    app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Inventory"])
    app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])
    app.include_router(insights.router, prefix="/api/v1/insights", tags=["AI Insights"])
    app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
    app.include_router(mlops.router, prefix="/api/v1/mlops", tags=["MLOps"])
    app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])

    return app


app = create_app()
```

### `backend/config.py`
```python
"""
Application configuration from environment variables.
Owner: Member 6 (Backend/Azure Lead)
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://supplymind:password@localhost:5432/supplymind"

    # Auth
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8080"]

    # OpenAI
    OPENAI_API_KEY: str = ""

    # MLflow
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Azure
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_STORAGE_CONTAINER: str = "supplymind-data"

    class Config:
        env_file = ".env"


settings = Settings()
```

### `backend/auth/jwt.py`
```python
"""
JWT token creation and validation.
Owner: Member 6 (Backend/Azure Lead)
"""
from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
from fastapi import HTTPException, status

from backend.config import settings


def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    ))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: Dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str) -> Dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET,
                             algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
```

### `backend/db/database.py`
```python
"""
SQLAlchemy async database connection.
Owner: Member 6 (Backend/Azure Lead)
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

from backend.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


async def get_db():
    """Dependency for getting database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

### `.github/workflows/ci.yml`
```yaml
name: CI Pipeline

on:
  pull_request:
    branches: [dev, staging, main]
  push:
    branches: [dev]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: supplymind_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.10"

      - name: Install Python dependencies
        run: |
          pip install -r requirements/base.txt
          pip install -r requirements/dev.txt

      - name: Lint Python
        run: ruff check .

      - name: Run Python tests
        run: pytest tests/ -v --tb=short
        env:
          DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/supplymind_test

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install frontend dependencies
        run: npm ci

      - name: Lint frontend
        run: npm run lint

      - name: Run frontend tests
        run: npm run test

  build-images:
    needs: lint-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/dev'
    steps:
      - uses: actions/checkout@v4

      - name: Build backend image
        run: docker build -f deployment/Dockerfile.backend -t supplymind-backend .

      - name: Build frontend image
        run: docker build -f deployment/Dockerfile.frontend -t supplymind-frontend .
```

### `.env.example`
```env
# Database
DATABASE_URL=postgresql+asyncpg://supplymind:password@localhost:5432/supplymind

# Auth
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# OpenAI
OPENAI_API_KEY=sk-...

# MLflow
MLFLOW_TRACKING_URI=http://localhost:5000

# Redis
REDIS_URL=redis://localhost:6379

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER=supplymind-data

# Azure OpenAI (alternative to OpenAI)
AZURE_OPENAI_KEY=
AZURE_OPENAI_ENDPOINT=

# Frontend
VITE_API_URL=http://localhost:8000/api/v1
```

---

> [!IMPORTANT]
> This plan requires user review and approval before execution begins. Key decisions to validate:
> 1. **LLM Provider:** OpenAI direct vs Azure OpenAI — impacts cost and latency
> 2. **Azure Resources:** Team needs an Azure subscription provisioned before Sprint 1
> 3. **Dataset Domain:** The existing CSVs are industrial equipment manufacturing — confirm this is the intended domain
> 4. **Timeline:** 8-week/4-sprint plan — confirm this is feasible given team availability
