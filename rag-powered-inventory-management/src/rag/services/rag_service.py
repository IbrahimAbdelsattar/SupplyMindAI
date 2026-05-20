"""High-level inventory RAG service."""

from __future__ import annotations

import logging
from collections import OrderedDict
from typing import Any, Dict

from ..core.config import Settings
from ..data.documents import RagDocument, build_inventory_payload, load_rag_documents
from .answer_engine import FastAnswerEngine
from .openrouter import OpenRouterClient
from .vector_store import InventoryVectorStore


LOGGER = logging.getLogger(__name__)

LATEST_KEYWORDS = ("latest", "current", "most recent", "newest", "as of")
MONTHLY_KEYWORDS = ("month", "monthly", "trend", "summary", "average")
STATUS_KEYWORDS = ("critical", "low", "healthy")


class InventoryRagService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.documents = load_rag_documents(settings.all_docs_path)
        self.inventory_payload = build_inventory_payload(settings.daily_docs_path)
        self.vector_store = InventoryVectorStore(settings=settings)
        self.openrouter = OpenRouterClient(settings=settings)
        self.monthly_documents_by_sku = self._build_documents_by_sku(doc_type="monthly_summary")
        self.fast_answer_engine = FastAnswerEngine(
            self.inventory_payload,
            monthly_documents_by_sku=self.monthly_documents_by_sku,
        )
        self.latest_daily_docs = self._build_latest_doc_map(doc_type="daily_fact")
        self.latest_monthly_docs = self._build_latest_doc_map(doc_type="monthly_summary")
        self.known_skus = {item["sku"] for item in self.inventory_payload["items"]}
        self.latest_snapshot_summary = self._build_latest_snapshot_summary()
        self.answer_cache: OrderedDict[tuple[str, str | None, str], str] = OrderedDict()

    def warm_up(self) -> None:
        self.vector_store.ensure_collection(self.documents)

    def close(self) -> None:
        self.openrouter.close()

    def get_inventory_payload(self) -> Dict[str, Any]:
        return self.inventory_payload

    def ask(self, question: str, selected_sku: str | None) -> Dict[str, Any]:
        normalized_question = question.strip()
        if not normalized_question:
            raise ValueError("Question cannot be empty.")

        resolved_sku = self._resolve_sku(normalized_question, selected_sku)
        cache_key = (
            normalized_question.lower(),
            resolved_sku,
            self.inventory_payload["summary"]["as_of"],
        )
        cached_answer = self.answer_cache.get(cache_key)
        if cached_answer is not None:
            self.answer_cache.move_to_end(cache_key)
            return {"answer": cached_answer}

        fast_answer = self.fast_answer_engine.answer(normalized_question, resolved_sku)
        if fast_answer is not None:
            self._store_cached_answer(cache_key, fast_answer)
            return {"answer": fast_answer}

        retrieved = self.vector_store.query(
            question=normalized_question,
            documents=self.documents,
            selected_sku=resolved_sku,
            limit=self.settings.query_result_count,
        )
        retrieved = self._merge_with_direct_context(
            question=normalized_question,
            selected_sku=resolved_sku,
            retrieved=retrieved,
        )

        if not retrieved:
            return {"answer": "I could not find relevant inventory records for that question."}

        try:
            answer = self.openrouter.generate_answer(
                question=normalized_question,
                retrieved_documents=retrieved,
                selected_sku=resolved_sku,
            )
        except Exception as exc:  # pragma: no cover - network failures are environment-specific
            LOGGER.warning("Falling back after OpenRouter error: %s", exc)
            answer = (
                "I found matching inventory records, but I could not finish the response right now. "
                "Try a more specific question about stock, status, coverage, or demand."
            )

        self._store_cached_answer(cache_key, answer)
        return {"answer": answer}

    def _store_cached_answer(self, cache_key: tuple[str, str | None, str], answer: str) -> None:
        self.answer_cache[cache_key] = answer
        self.answer_cache.move_to_end(cache_key)
        while len(self.answer_cache) > 256:
            self.answer_cache.popitem(last=False)

    def _build_latest_doc_map(self, *, doc_type: str) -> Dict[str, RagDocument]:
        latest_by_sku: Dict[str, RagDocument] = {}
        for document in self.documents:
            if document.doc_type != doc_type:
                continue

            sku = str(document.metadata.get("product_id", "")).strip()
            date = str(document.metadata.get("date", "")).strip()
            if not sku or not date:
                continue

            current = latest_by_sku.get(sku)
            if current is None or date > str(current.metadata.get("date", "")):
                latest_by_sku[sku] = document

        return latest_by_sku

    def _build_documents_by_sku(self, *, doc_type: str) -> Dict[str, list[Dict[str, Any]]]:
        documents_by_sku: Dict[str, list[Dict[str, Any]]] = {}
        for document in self.documents:
            if document.doc_type != doc_type:
                continue

            sku = str(document.metadata.get("product_id", "")).strip()
            if not sku:
                continue

            documents_by_sku.setdefault(sku, []).append(
                {
                    "id": document.id,
                    "text": document.text,
                    "metadata": document.metadata,
                }
            )

        for sku, docs in documents_by_sku.items():
            docs.sort(key=lambda item: str(item["metadata"].get("year_month", item["metadata"].get("date", ""))))

        return documents_by_sku

    def _resolve_sku(self, question: str, selected_sku: str | None) -> str | None:
        if selected_sku:
            return selected_sku

        upper_question = question.upper()
        for sku in sorted(self.known_skus, key=len, reverse=True):
            if sku and sku.upper() in upper_question:
                return sku
        return None

    def _merge_with_direct_context(
        self,
        *,
        question: str,
        selected_sku: str | None,
        retrieved: list[Dict[str, Any]],
    ) -> list[Dict[str, Any]]:
        direct_context: list[Dict[str, Any]] = []
        lower_question = question.lower()

        if any(keyword in lower_question for keyword in LATEST_KEYWORDS):
            direct_context.append(self.latest_snapshot_summary)

        if selected_sku and any(keyword in lower_question for keyword in LATEST_KEYWORDS):
            latest_daily = self.latest_daily_docs.get(selected_sku)
            if latest_daily is not None:
                direct_context.append(self._document_to_result(latest_daily, distance=0.0))

        if selected_sku and any(keyword in lower_question for keyword in MONTHLY_KEYWORDS):
            latest_monthly = self.latest_monthly_docs.get(selected_sku)
            if latest_monthly is not None:
                direct_context.append(self._document_to_result(latest_monthly, distance=0.0))

        if not selected_sku and any(keyword in lower_question for keyword in LATEST_KEYWORDS):
            direct_context.extend(self._latest_status_context(lower_question))

        merged: list[Dict[str, Any]] = []
        seen_ids: set[str] = set()
        for item in [*direct_context, *retrieved]:
            item_id = str(item["id"])
            if item_id in seen_ids:
                continue
            seen_ids.add(item_id)
            merged.append(item)
            if len(merged) >= max(self.settings.query_result_count, len(direct_context)):
                break

        return merged

    @staticmethod
    def _document_to_result(document: RagDocument, *, distance: float) -> Dict[str, Any]:
        return {
            "id": document.id,
            "document": document.text,
            "metadata": document.chroma_metadata(),
            "distance": distance,
        }

    def _build_latest_snapshot_summary(self) -> Dict[str, Any]:
        summary = self.inventory_payload["summary"]
        items = self.inventory_payload["items"]

        def _describe(status: str) -> str:
            matched = [item for item in items if item["stock_status"].lower() == status.lower()]
            if not matched:
                return f"{status}: none."

            parts = [
                f"{item['sku']} ({item['name']}) - stock {item['stock']} units, coverage {item['coverage_label']}"
                for item in matched
            ]
            return f"{status}: " + "; ".join(parts) + "."

        text = (
            f"Latest inventory snapshot summary for {summary['as_of']}. "
            f"Total products: {summary['total_products']}. "
            f"Active products: {summary['active_products']}. "
            f"Inactive products: {summary['inactive_products']}. "
            f"Total units: {summary['total_units']}. "
            f"Critical products: {summary['critical_products']}. "
            f"Low products: {summary['low_products']}. "
            f"Healthy products: {summary['healthy_products']}. "
            f"{_describe('Critical')} "
            f"{_describe('Low')} "
            f"{_describe('Healthy')}"
        )

        return {
            "id": "latest_snapshot__summary",
            "document": text,
            "metadata": {
                "doc_id": "latest_snapshot__summary",
                "doc_type": "latest_snapshot_summary",
                "granularity": "day",
                "date": summary["as_of"],
            },
            "distance": 0.0,
        }

    def _latest_status_context(self, lower_question: str) -> list[Dict[str, Any]]:
        matched_statuses = [status for status in STATUS_KEYWORDS if status in lower_question]
        if not matched_statuses:
            return []

        results: list[Dict[str, Any]] = []
        for item in self.inventory_payload["items"]:
            if item["stock_status"].lower() not in matched_statuses:
                continue

            latest_doc = self.latest_daily_docs.get(item["sku"])
            if latest_doc is not None:
                results.append(self._document_to_result(latest_doc, distance=0.0))

        return results
