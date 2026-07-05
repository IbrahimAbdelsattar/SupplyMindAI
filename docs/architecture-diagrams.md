# SupplyMind AI Diagrams

This document combines:
- the implemented frontend in `frontend/src/`
- the real business datasets in `data/*.csv`
- the fully implemented backend, ML, RAG, MLOps, and infrastructure layers
- the `plans/implementation_plan.md` future roadmap

> **Status Key:** All layers below are **Current** (implemented in the repo). Future roadmap items are noted separately.

## 1. Full Project Architecture

```mermaid
flowchart LR
    user[Manager / Analyst User]

    subgraph FE["Frontend SPA (Current)"]
        app[React + Vite + React Router]
        providers[Providers\nQueryClientProvider\nClerkProvider\nThemeProvider\nCurrencyProvider\nDateRangeProvider]
        pages[Pages\nLanding, Login, Dashboard,\nForecasting, Inventory,\nAI Insights, Reports,\nMLOps, Settings, 404]
        shared[Shared UI\nDashboardSidebar\nDashboardHeader\nCharts (Recharts)\nAIChatbot\nLanguageSwitcher]
        i18n[i18n\nEN / AR + RTL\n12 namespaces]
        apiClient[API Layer\n@tanstack/react-query\nsrc/lib/api.ts\nsrc/lib/knowledgeApi.ts]

        app --> providers --> pages --> shared
        pages --> apiClient
        i18n -.- pages
    end

    subgraph API["Application Backend (Current)"]
        gateway[FastAPI App /api/v1]
        auth[Security Router + JWT\nClerk Token Validation]
        dataSvc[Data Router]
        forecastSvc[Forecast Service\nML Adapter + Intelligence]
        inventorySvc[Inventory + RAG + Alert Services]
        insightSvc[Insights + Chat + Copilot Services]
        mlopsSvc[MLOps + Reports Services]
        settingsSvc[Settings + Storage Services]
        cache[(Redis)]
        guardrails[AI Guardrails\nInput, Output, RAG,\nForecast, Agent,\nTenant, Rate Limiter]

        gateway --> auth
        gateway --> dataSvc
        gateway --> forecastSvc
        gateway --> inventorySvc
        gateway --> insightSvc
        gateway --> mlopsSvc
        gateway --> settingsSvc
        gateway --> guardrails
        gateway <--> cache
    end

    subgraph DATA["Data and ML Platform (Current)"]
        raw[CSV Datasets\nproducts, sales, inventory,\nproduction, suppliers,\ncontracts, raw_materials, bom]
        postgres[(PostgreSQL / Supabase)]
        training[Training Pipeline\nXGBoost / scikit-learn]
        registry[MLflow Tracking + Model Registry]
        drift[Drift Detection + Retraining]
        optimizer[Inventory Optimizer\nEOQ / ROP / Safety Stock]
        vector[(ChromaDB Vector Store)]
        embeddings[sentence-transformers\nall-MiniLM-L6-v2]
        agentGraph[LangGraph Agents\nSupervisor, Forecasting,\nInventory, MLOps, RAG]
        llmClient[LLM Client\nOpenAI / OpenRouter / NVIDIA]

        raw --> postgres
        raw --> training --> registry
        training --> drift
        vector --> embeddings
        agentGraph --> vector
        agentGraph --> llmClient
        optimizer --> postgres
    end

    subgraph INFRA["Infrastructure (Current)"]
        docker[Docker + Docker Compose]
        nginx[Nginx Reverse Proxy\n+ API Gateway]
        langsmith[LangSmith Tracing]
        otel[OpenTelemetry Collector]
        prom[Prometheus Metrics]
        ci[GitHub Actions CI/CD]
    end

    user --> app
    apiClient <--> gateway

    dataSvc <--> postgres
    auth --> postgres
    forecastSvc --> postgres
    forecastSvc --> registry
    forecastSvc --> agentGraph
    inventorySvc --> postgres
    inventorySvc --> optimizer
    inventorySvc --> vector
    inventorySvc --> forecastSvc
    insightSvc --> postgres
    insightSvc --> forecastSvc
    insightSvc --> llmClient
    insightSvc --> agentGraph
    mlopsSvc --> registry
    mlopsSvc --> drift
    mlopsSvc --> postgres
    settingsSvc --> postgres

    docker --> app
    docker --> gateway
    docker --> postgres
    nginx --> app
    nginx --> gateway
    langsmith --> gateway
    otel --> gateway
    prom --> gateway
    ci --> docker
```

## 2. ER Diagram

The database schema reflects the business domain with products, sales, inventory, production, suppliers, contracts, raw materials, bills of materials, users, forecasts, alerts, model runs, drift reports, and system reports.

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email
        string name
        string role
        datetime created_at
        json preferences
        json clerk_metadata
    }

    PRODUCTS {
        string product_id PK
        string product_name
        string category
        string type
        decimal unit_price
        decimal unit_cost
    }

    SALES_DAILY {
        uuid id PK
        string product_id FK
        date date
        int units_sold
        decimal revenue
        string contract_id FK
    }

    INVENTORY {
        uuid id PK
        string product_id FK
        date snapshot_date
        int stock_on_hand
        int reorder_point
        int safety_stock
        int lead_time_days
        string status
    }

    PRODUCTION_SCHEDULE {
        uuid id PK
        string product_id FK
        date planned_date
        int quantity
        string status
    }

    SUPPLIERS {
        string supplier_id PK
        string supplier_name
        string contact_info
        decimal reliability_score
    }

    CONTRACTS {
        string contract_id PK
        string product_id FK
        string supplier_id FK
        date start_date
        date end_date
        decimal contract_value
    }

    RAW_MATERIALS {
        string material_id PK
        string supplier_id FK
        string material_name
        decimal unit_cost
        int lead_time_days
    }

    BOM {
        uuid id PK
        string product_id FK
        string material_id FK
        decimal quantity_per_unit
    }

    FORECASTS {
        uuid id PK
        string product_id FK
        uuid model_run_id FK
        date forecast_date
        int horizon_days
        json predictions
        json confidence_intervals
        decimal accuracy
        datetime created_at
    }

    MODEL_RUNS {
        uuid id PK
        string model_name
        string model_version
        string status
        decimal accuracy
        datetime trained_at
        string artifact_path
        json hyperparameters
    }

    ALERTS {
        uuid id PK
        string product_id FK
        uuid user_id FK
        string type
        string severity
        string message
        boolean acknowledged
        datetime created_at
    }

    USER_SETTINGS {
        uuid user_id PK, FK
        string theme
        string currency
        json notifications
        json display_preferences
        datetime updated_at
    }

    DRIFT_REPORTS {
        uuid id PK
        datetime report_date
        int features_analyzed
        boolean drift_detected
        json details
        string recommendation
    }

    REPORTS {
        uuid id PK
        string title
        string type
        string format
        string file_path
        uuid generated_by FK
        string status
        datetime created_at
    }

    USERS ||--|| USER_SETTINGS : has
    USERS ||--o{ ALERTS : acknowledges
    USERS ||--o{ REPORTS : generates

    PRODUCTS ||--o{ SALES_DAILY : sold_in
    PRODUCTS ||--o{ INVENTORY : stocked_as
    PRODUCTS ||--o{ PRODUCTION_SCHEDULE : produced_as
    PRODUCTS ||--o{ CONTRACTS : contracted_as
    PRODUCTS ||--o{ BOM : composed_of
    PRODUCTS ||--o{ FORECASTS : predicted_for
    PRODUCTS ||--o{ ALERTS : triggers

    CONTRACTS ||--o{ SALES_DAILY : fulfilled_by
    SUPPLIERS ||--o{ RAW_MATERIALS : supplies
    RAW_MATERIALS ||--o{ BOM : used_in

    MODEL_RUNS ||--o{ FORECASTS : generates
```

## 3. Sequence Diagram

This sequence models the end‑to‑end user flow for the core product experience: forecast generation, inventory optimization, AI insight retrieval, and copilot interaction.

```mermaid
sequenceDiagram
    actor U as User
    participant FE as React Frontend
    participant CLERK as Clerk Auth
    participant API as FastAPI Gateway
    participant DB as PostgreSQL
    participant FC as Forecast Service
    participant MR as MLflow Registry
    participant INV as Inventory Service
    participant VS as ChromaDB Vector Store
    participant AI as Insights / Copilot Service
    participant LLM as OpenRouter / OpenAI
    participant LS as LangSmith

    U->>FE: Access application
    FE->>CLERK: Sign in / Sign up
    CLERK-->>FE: JWT + user profile
    FE->>API: Requests with Bearer JWT

    U->>FE: Select product and forecast horizon

    par Forecast request
        FE->>API: POST /api/v1/forecast/predict
        API->>FC: Build prediction request
        FC->>DB: Load product history and features
        DB-->>FC: Sales / inventory context
        FC->>MR: Resolve production model version
        MR-->>FC: Model metadata / artifact
        FC-->>API: Forecast + confidence intervals
        API-->>FE: Forecast payload
        LS-->>LS: Trace prediction run
    end

    and Inventory optimization
        FE->>API: GET /api/v1/inventory/optimize
        API->>INV: Start optimization
        INV->>DB: Load stock, BOM, supplier data
        DB-->>INV: Inventory context
        INV->>FC: Request demand forecast
        FC-->>INV: Forecast demand series
        INV->>VS: Query knowledge context
        VS-->>INV: Ranked documents
        INV-->>API: EOQ + reorder point + safety stock
        API-->>FE: Optimization result
    end

    and AI insight generation
        FE->>API: POST /api/v1/insights/generate
        API->>AI: Generate business explanation
        AI->>DB: Read latest context
        DB-->>AI: Structured data
        AI->>LLM: Prompt with forecast + SHAP + inventory
        LLM-->>AI: Insights + recommendations
        AI->>API: Insight response
        API->>FE: Insight cards + summary
    end

    and Copilot chat
        FE->>API: POST /api/v1/copilot/chat
        API->>AI: Route to LangGraph agent
        AI->>VS: Retrieve knowledge context
        AI->>LLM: Generate grounded answer
        LLM-->>AI: Response
        AI->>API: Answer + sources
        API->>FE: Chat response
    end

    FE->>U: Render charts, recommendations, insights, and chat
```

---

### What was fixed
* Removed stray `\r` characters that appeared in the raw view.  
* Normalized heading levels (`#`, `##`).  
* Added a closing newline at the end of the file.  
* Kept all original Mermaid diagrams and textual explanations intact.

If you need any further tweaks (e.g., changing wording, adding/removing sections), just let me know!
