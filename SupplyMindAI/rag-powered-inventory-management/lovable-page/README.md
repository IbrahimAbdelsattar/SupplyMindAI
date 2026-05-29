# Inventory

Inventory is a Vite + React dashboard backed by a FastAPI RAG service and the Ask Stock Mind chatbot.

## Run the app

From the project root, the easiest option is:

```bash
python run.py
```

That starts both the backend and the frontend.

If you want to run them separately, start the backend from the project root:

```bash
python app.py
```

Start the frontend from `lovable-page`:

```bash
npm install
npm run dev
```

The frontend runs on `http://127.0.0.1:8080` and proxies API requests to `http://127.0.0.1:8000`.
