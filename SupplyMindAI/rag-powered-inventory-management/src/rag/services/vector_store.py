"""Chroma-backed vector retrieval for the inventory RAG app."""

from __future__ import annotations

import logging
from typing import Any, Dict, Iterator, List, Sequence

import chromadb
from sentence_transformers import SentenceTransformer

from ..core.config import Settings
from ..data.documents import RagDocument


LOGGER = logging.getLogger(__name__)

COLLECTION_SCHEMA_VERSION = "inventory_rag_jsonl_v1"


def _batched(items: Sequence[RagDocument], batch_size: int) -> Iterator[Sequence[RagDocument]]:
    for start in range(0, len(items), batch_size):
        yield items[start : start + batch_size]


class InventoryVectorStore:
    def __init__(self, *, settings: Settings) -> None:
        self.settings = settings
        self.client = chromadb.PersistentClient(path=str(settings.chroma_dir))
        self._collection = None
        self._embedding_model: SentenceTransformer | None = None

    @property
    def embedding_model(self) -> SentenceTransformer:
        if self._embedding_model is None:
            self._embedding_model = SentenceTransformer(self.settings.embedding_model)
        return self._embedding_model

    def ensure_collection(self, documents: Sequence[RagDocument], force_rebuild: bool = False):
        if force_rebuild:
            return self.rebuild_collection(documents)

        if self._collection is not None and self._is_valid_collection(self._collection):
            return self._collection

        collection = self._get_existing_collection()
        if collection is not None and self._is_valid_collection(collection) and collection.count() > 0:
            self._collection = collection
            return collection

        if not self.settings.bootstrap_chroma_on_startup:
            raise RuntimeError(
                "A clean Chroma collection was not found. Run scripts/refresh_chroma.py to build it."
            )

        LOGGER.info(
            "Bootstrapping Chroma collection '%s' from %s",
            self.settings.chroma_collection_name,
            self.settings.all_docs_path,
        )
        return self.rebuild_collection(documents)

    def rebuild_collection(self, documents: Sequence[RagDocument]):
        try:
            self.client.delete_collection(self.settings.chroma_collection_name)
        except Exception:
            pass

        collection = self.client.get_or_create_collection(
            name=self.settings.chroma_collection_name,
            metadata={
                "source_format": COLLECTION_SCHEMA_VERSION,
                "embedding_model": self.settings.embedding_model,
                "document_count": len(documents),
            },
        )

        total = len(documents)
        batch_size = max(1, self.settings.rebuild_batch_size)
        for batch_index, batch in enumerate(_batched(documents, batch_size), start=1):
            texts = [doc.text for doc in batch]
            embeddings = self.embedding_model.encode(
                texts,
                batch_size=min(batch_size, len(batch)),
                normalize_embeddings=True,
                show_progress_bar=False,
            ).tolist()

            collection.add(
                ids=[doc.id for doc in batch],
                documents=texts,
                metadatas=[doc.chroma_metadata() for doc in batch],
                embeddings=embeddings,
            )

            end = min(batch_index * batch_size, total)
            if batch_index == 1 or end == total or batch_index % 10 == 0:
                LOGGER.info("Indexed %s/%s documents into Chroma", end, total)

        self._collection = collection
        return collection

    def query(
        self,
        *,
        question: str,
        documents: Sequence[RagDocument],
        selected_sku: str | None,
        limit: int,
    ) -> List[Dict[str, Any]]:
        collection = self.ensure_collection(documents)
        query_embedding = self.embedding_model.encode(
            [question],
            normalize_embeddings=True,
            show_progress_bar=False,
        )[0].tolist()

        merged_results: List[Dict[str, Any]] = []
        if selected_sku:
            merged_results.extend(
                self._query_collection(
                    collection=collection,
                    query_embedding=query_embedding,
                    n_results=min(2, limit),
                    where={"product_id": selected_sku},
                )
            )

        merged_results.extend(
            self._query_collection(
                collection=collection,
                query_embedding=query_embedding,
                n_results=max(limit, 3),
                where=None,
            )
        )

        deduplicated: List[Dict[str, Any]] = []
        seen_ids: set[str] = set()
        for result in merged_results:
            result_id = str(result["id"])
            if result_id in seen_ids:
                continue
            seen_ids.add(result_id)
            deduplicated.append(result)
            if len(deduplicated) >= limit:
                break

        return deduplicated

    def _query_collection(
        self,
        *,
        collection,
        query_embedding: List[float],
        n_results: int,
        where: Dict[str, Any] | None,
    ) -> List[Dict[str, Any]]:
        if n_results <= 0:
            return []

        raw = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"],
        )

        ids = raw.get("ids", [[]])[0]
        documents = raw.get("documents", [[]])[0]
        metadatas = raw.get("metadatas", [[]])[0]
        distances = raw.get("distances", [[]])[0]

        return [
            {
                "id": doc_id,
                "document": document,
                "metadata": metadata or {},
                "distance": distance,
            }
            for doc_id, document, metadata, distance in zip(ids, documents, metadatas, distances)
        ]

    def _get_existing_collection(self):
        try:
            return self.client.get_collection(self.settings.chroma_collection_name)
        except Exception:
            return None

    @staticmethod
    def _is_valid_collection(collection) -> bool:
        metadata = collection.metadata or {}
        return metadata.get("source_format") == COLLECTION_SCHEMA_VERSION
