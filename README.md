# 🚀 SupplyMind AI  
### AI-Powered Demand Forecasting & Inventory Optimization Platform  

![Azure](https://img.shields.io/badge/Cloud-Microsoft%20Azure-blue)
![Python](https://img.shields.io/badge/Python-3.10+-brightgreen)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green)
![React](https://img.shields.io/badge/Frontend-React-blue)
![License](https://img.shields.io/badge/License-Academic-lightgrey)

---

## 👥 Team Members

- **Ibrahim Abdelsttar Abdelgawad**  
  *Team Leader – Deployment*

- **Kenzi Walid Sorour Hosny**  
  *LLM*

- **Rahma Shaaban Elhusseiny Shaaban**  
  *Data Analysis*

- **Karim Ayman Abdelgaber Deif**  
  *Modeling*

- **Ali El Shaarawy**  
  *MLOps*

- **Ali Ehab Massad Abdelghany**  
  *RAG*

---


## 📌 Overview

**SupplyMind AI** is an enterprise-grade SaaS platform designed to optimize supply chain operations through advanced demand forecasting, inventory optimization, explainable AI insights, and production-level MLOps monitoring.

The platform combines machine learning models, optimization algorithms, and intelligent monitoring systems to help businesses reduce stockouts, minimize overstock, optimize working capital, and improve operational efficiency.

---

## 🎯 Problem Statement

Modern businesses face critical supply chain challenges:

- Inaccurate demand forecasting  
- Excess inventory or frequent stockouts  
- Poor visibility into operational risks  
- Lack of explainability in AI decisions  
- Manual and reactive inventory planning  

SupplyMind AI addresses these challenges using data-driven predictive intelligence and automated optimization systems.

---

## 🔥 Core Features

### 1️⃣ Demand Forecasting Engine
- Multi-horizon forecasting (7 / 14 / 30+ days)
- Confidence intervals (probabilistic forecasting)
- Seasonality-aware modeling
- Promotion-aware forecasting
- Product-level and store-level predictions
- Continuous model retraining

---

### 2️⃣ Inventory Optimization Engine
- Reorder point calculation
- Safety stock estimation
- Optimal reorder quantity recommendations
- Lead time-aware planning
- Cost savings estimation
- AI-powered product-level recommendations

---

### 3️⃣ AI Insights & Explainability
- Feature importance analysis
- Demand factor contribution breakdown
- Seasonal pattern detection
- Promotion impact analysis
- Correlation discovery
- Actionable business insights

---

### 4️⃣ Intelligent Alert System
- Stock-out risk detection
- Overstock risk monitoring
- Demand spike alerts
- Real-time notifications

---

### 5️⃣ MLOps & Monitoring
- Model performance tracking
- Automated retraining triggers
- Data drift monitoring
- Inference latency monitoring
- Model version control
- Retraining history tracking

---

### 6️⃣ Reporting & Exports
- Weekly & monthly AI-generated reports
- Executive summaries
- CSV / PDF exports
- Scheduled reports

---

## 🏗️ System Architecture
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

# ☁️ Azure Cloud Infrastructure

| Component | Azure Service |
|------------|---------------|
| Data Ingestion | Azure Data Factory |
| Storage | Azure Data Lake / Blob Storage |
| Database | Azure PostgreSQL |
| ML Training | Azure Machine Learning |
| Model Registry | MLflow (Azure ML) |
| Deployment | Azure Kubernetes Service (AKS) |
| Monitoring | Azure Monitor |
| CI/CD | GitHub Actions + Azure DevOps |

---

## ⚙️ Technical Stack

### Machine Learning
- Python
- Scikit-learn
- XGBoost
- Time-Series Models (ARIMA / LSTM / Prophet)
- SHAP (Explainability)

### Backend
- FastAPI / Django
- REST APIs

### Frontend
- React (Dashboard Interface)

### Database
- PostgreSQL

### MLOps
- Model versioning
- Drift detection
- Automated retraining pipeline
- Performance monitoring

---

## 🔄 AI Pipeline

1. Data ingestion
2. Data cleaning & preprocessing
3. Feature engineering
4. Model training
5. Model evaluation
6. Deployment
7. Drift detection
8. Automated retraining

---

## 📊 Business Impact

SupplyMind AI enables organizations to:

- Reduce stock-out risk  
- Minimize excess inventory  
- Improve forecast accuracy  
- Optimize operational costs  
- Enhance supply chain resilience  
- Make explainable, data-driven decisions  

---

## 🚀 Future Improvements

- Multi-warehouse optimization
- Advanced anomaly detection
- Real-time streaming forecasts
- API integrations with ERP systems
- Advanced LLM-powered analytics assistant
- Scenario simulation engine

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


## 📌 Vision

To become the intelligence layer behind modern supply chain operations by combining forecasting, optimization, explainability, and MLOps into one unified AI-powered decision platform.

---

## 📄 License

This project is developed for academic and research purposes.
# Demand-Forecasting-Inventory-Optimization-Engine
