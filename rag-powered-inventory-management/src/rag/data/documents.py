"""Load inventory RAG documents and derive structured dashboard records."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List


STOCK_RE = re.compile(r"Stock on hand:\s*([\d,]+)\s+units\.", flags=re.IGNORECASE)
DEMAND_RE = re.compile(r"Average daily demand:\s*([\d.]+)\s+units\.", flags=re.IGNORECASE)
COVERAGE_RE = re.compile(r"Coverage days:\s*(.+?)\.\s+Stock status:", flags=re.IGNORECASE)
STATUS_RE = re.compile(r"Stock status:\s*([A-Za-z]+)\.", flags=re.IGNORECASE)
LEADING_FLOAT_RE = re.compile(r"^([\d.]+)")


@dataclass(frozen=True)
class RagDocument:
    id: str
    text: str
    doc_type: str
    granularity: str
    metadata: Dict[str, Any]

    def chroma_metadata(self) -> Dict[str, str | int | float | bool]:
        metadata: Dict[str, str | int | float | bool] = {
            "doc_id": self.id,
            "doc_type": self.doc_type,
            "granularity": self.granularity,
        }

        for key in (
            "product_id",
            "product_name",
            "category",
            "type",
            "date",
            "year_month",
            "stock_status",
        ):
            value = self.metadata.get(key)
            if isinstance(value, (str, int, float, bool)):
                metadata[key] = value

        for key in ("year", "month", "is_active"):
            value = self.metadata.get(key)
            if isinstance(value, (int, bool)):
                metadata[key] = value

        return metadata


def _iter_jsonl(path: str | Path) -> Iterator[Dict[str, Any]]:
    source_path = Path(path)
    with source_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            raw = line.strip()
            if raw:
                yield json.loads(raw)


def load_rag_documents(path: str | Path) -> List[RagDocument]:
    return [
        RagDocument(
            id=str(record["id"]),
            text=str(record["text"]),
            doc_type=str(record.get("doc_type", "unknown")),
            granularity=str(record.get("granularity", "unknown")),
            metadata=dict(record.get("metadata", {})),
        )
        for record in _iter_jsonl(path)
    ]


def _extract_int(pattern: re.Pattern[str], text: str, default: int = 0) -> int:
    match = pattern.search(text)
    if not match:
        return default
    return int(match.group(1).replace(",", ""))


def _extract_float(pattern: re.Pattern[str], text: str, default: float = 0.0) -> float:
    match = pattern.search(text)
    if not match:
        return default
    return float(match.group(1))


def _extract_text(pattern: re.Pattern[str], text: str, default: str) -> str:
    match = pattern.search(text)
    if not match:
        return default
    return match.group(1).strip()


def _extract_optional_float(text: str) -> float | None:
    match = LEADING_FLOAT_RE.search(text)
    if not match:
        return None
    return float(match.group(1))


def _build_inventory_item(record: Dict[str, Any]) -> Dict[str, Any]:
    metadata = dict(record.get("metadata", {}))
    text = str(record["text"])
    coverage_label = _extract_text(COVERAGE_RE, text, default="not available")

    return {
        "sku": str(metadata.get("product_id", "")),
        "name": str(metadata.get("product_name", "")),
        "category": str(metadata.get("category", "")),
        "product_type": str(metadata.get("type", "")),
        "active": bool(metadata.get("is_active", False)),
        "stock": _extract_int(STOCK_RE, text),
        "average_daily_demand": _extract_float(DEMAND_RE, text),
        "coverage_days": _extract_optional_float(coverage_label),
        "coverage_label": coverage_label,
        "stock_status": str(metadata.get("stock_status") or _extract_text(STATUS_RE, text, default="Unknown")),
        "last_updated": str(metadata.get("date", "")),
        "source_text": text,
    }


def build_inventory_payload(daily_docs_path: str | Path) -> Dict[str, Any]:
    latest_by_sku: Dict[str, Dict[str, Any]] = {}

    for record in _iter_jsonl(daily_docs_path):
        if record.get("doc_type") != "daily_fact":
            continue

        item = _build_inventory_item(record)
        sku = item["sku"]
        if not sku:
            continue

        current = latest_by_sku.get(sku)
        if current is None or item["last_updated"] > current["last_updated"]:
            latest_by_sku[sku] = item

    items = sorted(latest_by_sku.values(), key=lambda item: item["sku"])
    as_of = max((item["last_updated"] for item in items), default="")

    summary = {
        "as_of": as_of,
        "total_products": len(items),
        "active_products": sum(1 for item in items if item["active"]),
        "inactive_products": sum(1 for item in items if not item["active"]),
        "total_units": sum(item["stock"] for item in items),
        "critical_products": sum(1 for item in items if item["stock_status"] == "Critical"),
        "low_products": sum(1 for item in items if item["stock_status"] == "Low"),
        "healthy_products": sum(1 for item in items if item["stock_status"] == "Healthy"),
    }

    return {"summary": summary, "items": items}


def format_context_documents(documents: Iterable[Dict[str, Any]]) -> str:
    sections: List[str] = []
    for index, doc in enumerate(documents, start=1):
        metadata = doc.get("metadata", {})
        header = " | ".join(
            part
            for part in (
                f"sku={metadata.get('product_id', 'n/a')}",
                f"date={metadata.get('date', 'n/a')}",
                f"status={metadata.get('stock_status', 'n/a')}",
            )
            if part
        )
        sections.append(f"[{index}] {header}\n{doc.get('document', '')}")
    return "\n\n".join(sections)
