"""Supabase intelligence layer — vectors, RAG, copilot, memory."""

from backend.knowledge.client import is_supabase_available
from backend.knowledge.copilot import copilot_chat
from backend.knowledge.ingestion import ingest_document
from backend.knowledge.rag import rag_query
from backend.knowledge.search import semantic_search

__all__ = [
    "copilot_chat",
    "ingest_document",
    "is_supabase_available",
    "rag_query",
    "semantic_search",
]
