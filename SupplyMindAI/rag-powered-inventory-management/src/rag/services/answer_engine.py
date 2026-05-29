"""Low-latency answer shortcuts for common inventory questions."""

from __future__ import annotations

import re
from typing import Any, Dict


HISTORICAL_KEYWORDS = ("trend", "history", "historical", "monthly", "month", "compare", "comparison")
METRIC_KEYWORDS = ("stock", "units", "status", "coverage", "demand", "active", "inactive")
LIST_KEYWORDS = ("which", "what", "list", "show", "give", "name")
AVG_STOCK_RE = re.compile(r"Average stock:\s*([\d.]+)\s+units\.", flags=re.IGNORECASE)
AVG_DEMAND_RE = re.compile(r"Average daily demand:\s*([\d.]+)\s+units\.", flags=re.IGNORECASE)
DOMINANT_STATUS_RE = re.compile(r"Dominant stock status:\s*([A-Za-z]+)\.", flags=re.IGNORECASE)


class FastAnswerEngine:
    def __init__(
        self,
        inventory_payload: Dict[str, Any],
        monthly_documents_by_sku: Dict[str, list[Dict[str, Any]]],
    ) -> None:
        self.inventory_payload = inventory_payload
        self.summary = inventory_payload["summary"]
        self.items = inventory_payload["items"]
        self.items_by_sku = {item["sku"]: item for item in self.items}
        self.monthly_documents_by_sku = monthly_documents_by_sku
        self.items_by_status = {
            "critical": [item for item in self.items if item["stock_status"] == "Critical"],
            "low": [item for item in self.items if item["stock_status"] == "Low"],
            "healthy": [item for item in self.items if item["stock_status"] == "Healthy"],
        }

    def answer(self, question: str, selected_sku: str | None) -> str | None:
        lower_question = " ".join(question.lower().split())

        if selected_sku and selected_sku in self.items_by_sku:
            item_answer = self._answer_for_item(lower_question, self.items_by_sku[selected_sku])
            if item_answer:
                return item_answer

        return self._answer_for_snapshot(lower_question)

    def _answer_for_item(self, question: str, item: Dict[str, Any]) -> str | None:
        if any(keyword in question for keyword in HISTORICAL_KEYWORDS):
            monthly_answer = self._answer_for_monthly_trend(item["sku"], item["name"])
            if monthly_answer:
                return monthly_answer

        if any(keyword in question for keyword in HISTORICAL_KEYWORDS):
            return None

        wants_metric = any(keyword in question for keyword in METRIC_KEYWORDS)
        wants_summary = any(keyword in question for keyword in ("summary", "overview", "tell me about"))

        if "coverage" in question:
            return (
                f"As of {item['last_updated']}, {item['sku']} ({item['name']}) has coverage of "
                f"{item['coverage_label']}."
            )

        if "demand" in question:
            return (
                f"As of {item['last_updated']}, {item['sku']} ({item['name']}) has an average daily demand "
                f"of {item['average_daily_demand']:.2f} units."
            )

        if "status" in question or any(status in question for status in ("critical", "low", "healthy")):
            return (
                f"As of {item['last_updated']}, {item['sku']} ({item['name']}) is "
                f"**{item['stock_status']}**."
            )

        if "active" in question or "inactive" in question:
            state = "active" if item["active"] else "inactive"
            return f"As of {item['last_updated']}, {item['sku']} ({item['name']}) is {state}."

        if "stock" in question or "units" in question or wants_summary or wants_metric:
            return (
                f"As of {item['last_updated']}, {item['sku']} ({item['name']}) has **{item['stock']} units** "
                f"in stock, status **{item['stock_status']}**, average daily demand "
                f"{item['average_daily_demand']:.2f} units, and coverage {item['coverage_label']}."
            )

        return None

    def _answer_for_monthly_trend(self, sku: str, product_name: str) -> str | None:
        monthly_docs = self.monthly_documents_by_sku.get(sku, [])
        if len(monthly_docs) < 1:
            return None

        parsed = [self._parse_monthly_document(doc) for doc in monthly_docs]
        parsed = [item for item in parsed if item is not None]
        if not parsed:
            return None

        parsed.sort(key=lambda item: item["year_month"])
        first = parsed[0]
        last = parsed[-1]
        lowest = min(parsed, key=lambda item: item["avg_stock"])
        highest = max(parsed, key=lambda item: item["avg_stock"])
        demand_values = {round(item["avg_demand"], 2) for item in parsed}

        if len(demand_values) == 1:
            demand_text = f"Average daily demand stayed at {last['avg_demand']:.2f} units."
        else:
            demand_text = (
                f"Average daily demand ranged from {min(demand_values):.2f} to "
                f"{max(demand_values):.2f} units."
            )

        return (
            f"Monthly trend for {sku} ({product_name}) from {first['year_month']} to {last['year_month']}: "
            f"average stock moved from {first['avg_stock']:.2f} to {last['avg_stock']:.2f} units. "
            f"Lowest average stock was {lowest['avg_stock']:.2f} in {lowest['year_month']}; "
            f"highest was {highest['avg_stock']:.2f} in {highest['year_month']}. "
            f"The latest monthly dominant status is **{last['dominant_status']}**. "
            f"{demand_text}"
        )

    def _parse_monthly_document(self, document: Dict[str, Any]) -> Dict[str, Any] | None:
        text = str(document["text"])
        year_month = str(document["metadata"].get("year_month") or document["metadata"].get("date") or "")
        avg_stock_match = AVG_STOCK_RE.search(text)
        avg_demand_match = AVG_DEMAND_RE.search(text)
        dominant_status_match = DOMINANT_STATUS_RE.search(text)

        if not year_month or not avg_stock_match or not avg_demand_match or not dominant_status_match:
            return None

        return {
            "year_month": year_month,
            "avg_stock": float(avg_stock_match.group(1)),
            "avg_demand": float(avg_demand_match.group(1)),
            "dominant_status": dominant_status_match.group(1),
        }

    def _answer_for_snapshot(self, question: str) -> str | None:
        for status, items in self.items_by_status.items():
            if status not in question:
                continue

            if "how many" in question:
                return (
                    f"As of {self.summary['as_of']}, there are **{len(items)} {status} products**."
                )

            if any(keyword in question for keyword in LIST_KEYWORDS) or "products" in question:
                if not items:
                    return f"As of {self.summary['as_of']}, there are no {status} products."

                product_list = ", ".join(f"{item['sku']} ({item['name']})" for item in items)
                return (
                    f"The {status} products in the latest snapshot ({self.summary['as_of']}) are: "
                    f"{product_list}."
                )

        if "total units" in question or "total stock" in question:
            return (
                f"As of {self.summary['as_of']}, total stock across all products is "
                f"**{self.summary['total_units']} units**."
            )

        if "inactive" in question and "how many" in question:
            return (
                f"As of {self.summary['as_of']}, there are **{self.summary['inactive_products']} inactive products**."
            )

        if "active" in question and "how many" in question:
            return (
                f"As of {self.summary['as_of']}, there are **{self.summary['active_products']} active products**."
            )

        if "total products" in question or ("how many" in question and "products" in question and "critical" not in question and "low" not in question and "healthy" not in question and "active" not in question and "inactive" not in question):
            return (
                f"As of {self.summary['as_of']}, the latest snapshot contains **{self.summary['total_products']} products**."
            )

        if "summary" in question or "overview" in question:
            return (
                f"Latest snapshot: {self.summary['as_of']}. "
                f"Products: {self.summary['total_products']}, active: {self.summary['active_products']}, "
                f"inactive: {self.summary['inactive_products']}, total units: {self.summary['total_units']}, "
                f"critical: {self.summary['critical_products']}, low: {self.summary['low_products']}, "
                f"healthy: {self.summary['healthy_products']}."
            )

        if "as of" in question or "latest snapshot" in question or "snapshot date" in question:
            return f"The latest inventory snapshot is **{self.summary['as_of']}**."

        return None
