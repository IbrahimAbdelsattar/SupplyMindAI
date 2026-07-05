# SupplyMind AI Deployment Guide

This document outlines the deployment process for the SupplyMind AI platform. The platform is fully containerized using Docker and Docker Compose.

---

## Core Infrastructure Stack

The system consists of the following containerized services:

* **Frontend**: A React/Vite SPA styled with a neumorphic design system and served via Nginx.
* **Backend**: A FastAPI Python application encapsulating:
  * The **AI Orchestrator Layer** (routing user intents, filtering RAG context, and scoping memory).
  * The XGBoost demand forecasting inference pipeline.
  * In-memory cosine similarity search (database-backed vectors).
* **Database**: PostgreSQL 16 for relational logs, user accounts, and knowledge document structures.
* **Cache & Broker**: Redis 7 for API caching and task queues.

---

## Deployment Configuration & Environment Variables

Make sure to populate your `.env` file before booting the containers. Crucial AI Orchestrator parameters include:

```ini
# LLM configuration (All agents share this key but run on isolated model configs)
OPENROUTER_API_KEY=sk-or-xxxx...
LLM_MODEL=nvidia/nemotron-3-super-120b-a12b:free

# Intent routing threshold
INTENT_CONFIDENCE_THRESHOLD=0.70

# Database
DATABASE_URL=postgresql://user:password@db:5432/supplymind

# Observability
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_xxxx...
LANGCHAIN_PROJECT=supplymind-orchestrator
```

---

## Booting the Stack

### Production Mode
To deploy the application in production:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Nginx maps the frontend to port `8080` (or the mapped public HTTP port) and routes `/api/*` proxies to the FastAPI service.
