"""FastAPI application wiring for the inventory RAG backend."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ..core.config import load_settings
from ..services.rag_service import InventoryRagService
from .schemas import ChatRequest, ChatResponse


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

SETTINGS = load_settings()
SERVICE: InventoryRagService | None = None


def _get_service() -> InventoryRagService:
    if SERVICE is None:
        raise RuntimeError("Inventory RAG service is not initialized.")
    return SERVICE


@asynccontextmanager
async def lifespan(_: FastAPI):
    global SERVICE
    SERVICE = InventoryRagService(SETTINGS)
    SERVICE.warm_up()
    try:
        yield
    finally:
        if SERVICE is not None:
            SERVICE.close()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Inventory RAG Backend",
        version="1.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:8080",
            "http://localhost:8080",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    def health_check() -> dict[str, str]:
        return {
            "status": "ok",
            "model": SETTINGS.openrouter_model,
            "embedding_model": SETTINGS.embedding_model,
            "collection": SETTINGS.chroma_collection_name,
        }

    @app.get("/api/inventory")
    def inventory() -> dict:
        return _get_service().get_inventory_payload()

    @app.post("/api/chat", response_model=ChatResponse)
    def chat(payload: ChatRequest) -> ChatResponse:
        try:
            result = _get_service().ask(payload.question, payload.selected_sku)
            return ChatResponse(**result)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    return app


app = create_app()


def run() -> None:
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
