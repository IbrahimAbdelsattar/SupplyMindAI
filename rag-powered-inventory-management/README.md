# RAG-Powered Inventory Management

This project now includes:

- A FastAPI backend for `/api/inventory` and `/api/chat`
- A Chroma-backed RAG pipeline that uses `sentence-transformers/all-MiniLM-L6-v2`
- A Lovable/Vite frontend in `lovable-page`
- An answer-only chatbot named `Ask Stock Mind`
- A one-command local runner

## Data Sources

The backend uses these files from `data/`:

- `inventory_rag_all_docs.jsonl` for retrieval documents
- `inventory_rag_daily_docs.jsonl` for the latest dashboard snapshot
- `chroma_db/` for the persisted vector store

The OpenRouter API key can be provided in either:

- Environment variable: `OPENROUTER_API_KEY`
- Root secret file: `.txt` with `api_key = ...`

Default model settings:

- Primary model: `google/gemma-4-26b-a4b-it:free`
- Fallback model: `nvidia/nemotron-3-super-120b-a12b:free`

## Backend Layout

The backend is organized like this:

- `src/rag/api/` for FastAPI app wiring and request schemas
- `src/rag/core/` for configuration and environment loading
- `src/rag/data/` for JSONL parsing and inventory payload shaping
- `src/rag/services/` for fast answers, retrieval, and OpenRouter generation

The root `app.py` is now just a thin entrypoint that imports the app from `src/rag/api/`.

## Install

From the project root:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd lovable-page
npm install
cd ..
```

If you prefer, copy `.env.example` to `.env` and fill in any overrides.

## Run

Fastest local workflow:

```bash
python run.py
```

That starts:

- Backend: `http://127.0.0.1:8000`
- Frontend: `http://127.0.0.1:8080`

You can also run them separately:

```bash
python app.py
cd lovable-page
npm run dev
```

## Chroma Refresh

The backend looks for a clean Chroma collection named `inventory_rag_docs` inside `data/chroma_db`.

- If that collection already exists, it is reused.
- If it does not exist, the backend bootstraps it from `data/inventory_rag_all_docs.jsonl` on startup.
- The older `langchain` collection can stay in the same folder, but it is not used by the backend.

To rebuild the clean collection manually:

```bash
python scripts/refresh_chroma.py --force
```

## Existing Preparation Utilities

The original preparation scripts are still available:

- `src/ingestion/prepare_inventory_data.py`
- `src/chunking/chunker.py`
- `src/embedding/embedder.py`

They are useful if you refresh source data later, but the current app can run directly from the JSONL files already in `data/`.
