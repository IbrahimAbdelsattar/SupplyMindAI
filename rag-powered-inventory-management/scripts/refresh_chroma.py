"""Rebuild the clean Chroma collection from inventory JSONL documents."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.rag.core.config import load_settings
from src.rag.data.documents import load_rag_documents
from src.rag.services.vector_store import InventoryVectorStore


def main() -> None:
    parser = argparse.ArgumentParser(description="Rebuild the clean inventory Chroma collection.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Delete and rebuild the collection even if it already exists.",
    )
    args = parser.parse_args()

    settings = load_settings()
    documents = load_rag_documents(settings.all_docs_path)
    vector_store = InventoryVectorStore(settings=settings)

    if args.force:
        vector_store.rebuild_collection(documents)
    else:
        vector_store.ensure_collection(documents, force_rebuild=False)

    print(
        f"chroma_collection_ready: {settings.chroma_collection_name} "
        f"({len(documents)} documents, model={settings.embedding_model})"
    )


if __name__ == "__main__":
    main()
