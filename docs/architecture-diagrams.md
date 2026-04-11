# SupplyMind AI Diagrams

This document combines:

- the implemented frontend in `src/`
- the real business datasets in `data/*.csv`
- the planned backend, ML, RAG, MLOps, and infrastructure layers from `plans/implementation_plan.md`

`Current` means already present in the repo today. `Planned` means defined in the implementation plan but not yet implemented in this codebase.

## 1. Full Project Architecture
![alt text](Gemini_Generated_Image_f8d28mf8d28mf8d2.png)
```mermaid
flowchart LR
    user[Manager / Analyst User]

    subgraph FE["Frontend SPA (Current)"]
        app[React + Vite + React Router]
        providers[Providers\nQueryClientProvider\nAuthProvider\nThemeProvider]
        pages[Pages\nLanding, Login, Dashboard,\nForecasting, Inventory,\nAI Insights, Reports,\nMLOps, Settings]
        shared[Shared UI\nDashboardSidebar\nDashboardHeader\nCharts\nAIChatbot]
        mock[mockData.ts + local component state]

        app --> providers --> pages --> shared
        pages -. current data source .-> mock
    end

    subgraph API["Application Backend (Planned)"]
        gateway[FastAPI App /api/v1]
        auth[Auth Router + JWT]
        dataSvc[Data Router]
        forecastSvc[Forecast Service]
        inventorySvc[Inventory + Alert Services]
        insightSvc[Insights + Chat Services]
        mlopsSvc[MLOps + Reports Services]
        cache[(Redis)]

        gateway --> auth
        gateway --> dataSvc
        gateway --> forecastSvc
        gateway --> inventorySvc
        gateway --> insightSvc
        gateway --> mlopsSvc
        gateway <--> cache
    end

    subgraph DATA["Data and ML Platform (Planned)"]
        raw[Local CSVs / Azure Blob Storage\nproducts, sales, inventory,\nproduction, suppliers,\ncontracts, raw_materials, bom]
        ingest[Ingestion + Validation\npandas + Great Expectations]
        features[Feature Engineering\nfeatures_daily.parquet]
        postgres[(PostgreSQL)]
        training[Training Pipeline\nXGBoost / LSTM / TFT]
        registry[MLflow Tracking + Model Registry]
        drift[Drift Detection + Retraining]
        optimizer[Inventory Optimizer\nEOQ / ROP / Safety Stock]
        vector[(ChromaDB / Azure AI Search)]

        raw --> ingest --> features
        ingest --> postgres
        features --> postgres
        features --> training --> registry
        features --> drift
        raw --> vector
        optimizer --> postgres
    end

    subgraph EXT["External / Infrastructure (Planned)"]
        llm[OpenAI / Azure OpenAI]
        monitor[Azure Monitor / App Insights]
        deploy[Docker + GitHub Actions + AKS]
    end

    user --> app
    pages -. planned API integration .-> gateway

    dataSvc <--> postgres
    auth <--> postgres
    forecastSvc --> postgres
    forecastSvc --> registry
    inventorySvc --> postgres
    inventorySvc --> optimizer
    inventorySvc --> vector
    inventorySvc --> forecastSvc
    insightSvc --> postgres
    insightSvc --> forecastSvc
    insightSvc --> llm
    mlopsSvc --> registry
    mlopsSvc --> drift
    mlopsSvc --> postgres

    deploy --> app
    deploy --> gateway
    monitor --> gateway
    monitor --> registry
```

## 2. ER Diagram
![alt text](<ChatGPT Image 11 أبريل 2026، 04_48_30 م.png>)
Notes:

- `PRODUCTS`, `SALES_DAILY`, `INVENTORY`, `PRODUCTION_SCHEDULE`, `SUPPLIERS`, `CONTRACTS`, `RAW_MATERIALS`, and `BOM` come from the current CSV data.
- `USERS`, `USER_SETTINGS`, `FORECASTS`, `ALERTS`, `MODEL_RUNS`, `DRIFT_REPORTS`, and `REPORTS` come from the implementation plan DDL.
- The `MODEL_RUNS -> FORECASTS` relationship is logical rather than an explicit foreign key in the current plan.

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email
        string password_hash
        string name
        string role
        datetime created_at
    }

    USER_SETTINGS {
        uuid user_id PK, FK
        string theme
        json notifications
        string region
        string currency
    }

    PRODUCTS {
        string product_id PK
        string product_name
        string category
        string type
        string size
        decimal min_price
        decimal max_price
    }

    SALES_DAILY {
        int sale_id PK
        date date
        string product_id FK
        string contract_id FK
        int qty
        decimal price
        decimal revenue
    }

    INVENTORY {
        int id PK
        date date
        string product_id FK
        int stock_level
    }

    PRODUCTION_SCHEDULE {
        int id PK
        date date
        string product_id FK
        int planned
        int actual
        float utilization
        int delay
    }

    CONTRACTS {
        string contract_id PK
        string client
        string product_id FK
        date start
        date end
        int monthly_qty
        decimal price
    }

    SUPPLIERS {
        string supplier_id PK
        string supplier_name
        string region
        float reliability
        int lead_time_days
    }

    RAW_MATERIALS {
        string material_id PK
        string material_name
        decimal unit_cost
        string supplier_id FK
    }

    BOM {
        string product_id FK
        string material_id FK
        int qty
    }

    FORECASTS {
        int id PK
        string product_id FK
        date forecast_date
        date target_date
        int horizon
        decimal forecast_value
        decimal lower_bound
        decimal upper_bound
        string model_name
        string model_version
    }

    ALERTS {
        uuid id PK
        string type
        string severity
        string product_id FK
        uuid acknowledged_by FK
        string title
        string message
        boolean acknowledged
        datetime created_at
    }

    MODEL_RUNS {
        uuid id PK
        string model_name
        string model_version
        string mlflow_run_id
        decimal rmse
        decimal mape
        decimal wape
        string trigger
        string status
        datetime created_at
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
![alt text](<ChatGPT Image 11 أبريل 2026، 04_48_29 م.png>)
This sequence models the target end-to-end user flow for the core product experience: forecast generation, inventory optimization, and AI insight retrieval from the frontend.

```mermaid
sequenceDiagram
    actor U as User
    participant FE as React Frontend
    participant AUTH as Auth API
    participant API as FastAPI Gateway
    participant DB as PostgreSQL
    participant FC as Forecast Service
    participant MR as MLflow Registry
    participant INV as Inventory Service
    participant VS as Vector Store
    participant AI as Insights Service
    participant LLM as OpenAI / Azure OpenAI

    U->>FE: Sign in and open product view
    FE->>AUTH: POST /api/v1/auth/login
    AUTH->>DB: Validate user + role
    DB-->>AUTH: User record
    AUTH-->>FE: JWT + profile

    U->>FE: Select product and horizon

    par Forecast request
        FE->>API: POST /api/v1/forecast/predict
        API->>FC: Build prediction request
        FC->>DB: Load product history and engineered features
        DB-->>FC: Sales / inventory / production context
        FC->>MR: Resolve production model version
        MR-->>FC: Model metadata / artifact location
        FC-->>API: Forecast + confidence interval + feature importance
        API-->>FE: Forecast payload
    and Inventory optimization
        FE->>API: GET /api/v1/inventory/optimize?product_id=...
        API->>INV: Start optimization
        INV->>DB: Load stock, BOM, supplier lead times
        DB-->>INV: Inventory + supplier context
        INV->>FC: Request forecast horizon for demand input
        FC-->>INV: Forecast demand series
        INV->>VS: Retrieve product and inventory knowledge context
        VS-->>INV: Ranked supporting documents
        INV-->>API: EOQ + reorder point + safety stock + alerts
        API-->>FE: Optimization result
    and AI insight generation
        FE->>API: POST /api/v1/insights/generate
        API->>AI: Generate business explanation
        AI->>DB: Read latest forecast/business context
        DB-->>AI: Structured context
        AI->>LLM: Prompt with forecast + SHAP + inventory context
        LLM-->>AI: JSON insights + recommendations
        AI-->>API: Insight response
        API-->>FE: Insight cards + executive summary
    end

    FE-->>U: Render charts, recommendations, alerts, and narrative insights
```
