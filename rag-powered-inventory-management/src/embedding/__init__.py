"""Embedding package for SentenceTransformers-based inventory chunk embeddings."""

from .embedder import (
    build_embedding_model,
    embed_inventory_chunks,
    embed_records,
    load_jsonl_records,
)

__all__ = [
    "build_embedding_model",
    "embed_inventory_chunks",
    "embed_records",
    "load_jsonl_records",
]
