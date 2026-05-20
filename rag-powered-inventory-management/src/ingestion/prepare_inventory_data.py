"""Prepare inventory CSV data for RAG ingestion.

This script converts row-based inventory snapshots into:
1. Daily fact documents
2. Monthly summary documents
3. Pipeline page records shaped like {"text", "source", "page"}

It is designed to be imported from a notebook or run as a script.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd


REQUIRED_COLUMNS = {
    "date",
    "product_id",
    "stock",
    "product_name",
    "category",
    "type",
    "is_active",
    "avg_daily_demand",
    "stock_status",
}


def _safe_text(value: Any, fallback: str = "unknown") -> str:
    if pd.isna(value):
        return fallback
    text = str(value).strip()
    return text if text else fallback


def _format_bool(value: Any) -> str:
    return "yes" if bool(value) else "no"


def _format_float(value: Any, digits: int = 2, fallback: str = "not available") -> str:
    if pd.isna(value):
        return fallback
    return f"{float(value):.{digits}f}"


def load_inventory_csv(input_csv: str | Path) -> pd.DataFrame:
    df = pd.read_csv(input_csv)
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")

    df = df.copy()
    date_series = pd.to_datetime(df["date"], errors="raise")
    df["date"] = date_series.dt.strftime("%Y-%m-%d")
    df["year"] = date_series.dt.year.astype(int)
    df["month"] = date_series.dt.month.astype(int)
    df["year_month"] = date_series.dt.to_period("M").astype(str)

    for col in ["product_id", "product_name", "category", "type", "stock_status"]:
        df[col] = df[col].astype(str).str.strip()

    if "coverage_days_display" not in df.columns:
        df["coverage_days_display"] = ""
    if "coverage_days_reason" not in df.columns:
        if "coverage_days_missing_reason" in df.columns:
            df["coverage_days_reason"] = df["coverage_days_missing_reason"]
        else:
            df["coverage_days_reason"] = ""

    df["coverage_days_display"] = df["coverage_days_display"].fillna("").astype(str).str.strip()
    df["coverage_days_reason"] = df["coverage_days_reason"].fillna("").astype(str).str.strip()
    df["stock"] = df["stock"].fillna(0).astype(int)
    df["avg_daily_demand"] = pd.to_numeric(df["avg_daily_demand"], errors="coerce")
    if "coverage_days" in df.columns:
        df["coverage_days"] = pd.to_numeric(df["coverage_days"], errors="coerce")

    return df


def build_daily_text(row: pd.Series) -> str:
    coverage_display = row.get("coverage_days_display", "")
    if not coverage_display:
        raw_coverage = row.get("coverage_days")
        coverage_display = (
            f"{_format_float(raw_coverage)} days"
            if not pd.isna(raw_coverage)
            else "not available"
        )

    coverage_reason = _safe_text(
        row.get("coverage_days_reason", ""),
        fallback="no coverage explanation provided",
    )

    return (
        f"Inventory snapshot on {row['date']}. "
        f"Product {row['product_name']} ({row['product_id']}) in category {row['category']} "
        f"and type {row['type']}. "
        f"Active status: {_format_bool(row['is_active'])}. "
        f"Stock on hand: {int(row['stock'])} units. "
        f"Average daily demand: {_format_float(row['avg_daily_demand'])} units. "
        f"Coverage days: {coverage_display}. "
        f"Stock status: {row['stock_status']}. "
        f"Coverage note: {coverage_reason}."
    )


def build_daily_documents(df: pd.DataFrame) -> List[Dict[str, Any]]:
    documents: List[Dict[str, Any]] = []

    for row in df.to_dict(orient="records"):
        record = pd.Series(row)
        doc_id = f"daily__{record['product_id']}__{record['date']}"
        documents.append(
            {
                "id": doc_id,
                "doc_type": "daily_fact",
                "granularity": "day",
                "text": build_daily_text(record),
                "metadata": {
                    "product_id": record["product_id"],
                    "product_name": record["product_name"],
                    "category": record["category"],
                    "type": record["type"],
                    "date": record["date"],
                    "year": int(record["year"]),
                    "month": int(record["month"]),
                    "year_month": record["year_month"],
                    "is_active": bool(record["is_active"]),
                    "stock_status": record["stock_status"],
                },
            }
        )

    return documents


def _status_count_text(group: pd.DataFrame, status: str) -> str:
    return str(int((group["stock_status"] == status).sum()))


def build_monthly_summary_documents(df: pd.DataFrame) -> List[Dict[str, Any]]:
    group_cols = [
        "year_month",
        "year",
        "month",
        "product_id",
        "product_name",
        "category",
        "type",
    ]
    documents: List[Dict[str, Any]] = []

    for keys, group in df.groupby(group_cols, sort=True):
        year_month, year, month, product_id, product_name, category, product_type = keys
        active_days = int(group["is_active"].sum())
        total_days = int(len(group))
        avg_stock = round(float(group["stock"].mean()), 2)
        min_stock = int(group["stock"].min())
        max_stock = int(group["stock"].max())
        avg_demand = round(float(group["avg_daily_demand"].mean()), 2)

        if "coverage_days" in group.columns and group["coverage_days"].notna().any():
            median_coverage = round(float(group["coverage_days"].dropna().median()), 2)
            coverage_summary = f"Median coverage days: {median_coverage}."
        else:
            coverage_summary = "Coverage days were not available for this period."

        dominant_status = group["stock_status"].mode().iat[0]
        critical_days = _status_count_text(group, "Critical")
        low_days = _status_count_text(group, "Low")
        healthy_days = _status_count_text(group, "Healthy")

        text = (
            f"Monthly inventory summary for {product_name} ({product_id}) in {year_month}. "
            f"Category: {category}. Type: {product_type}. "
            f"Product was active on {active_days} out of {total_days} days. "
            f"Average stock: {avg_stock} units. Minimum stock: {min_stock} units. "
            f"Maximum stock: {max_stock} units. Average daily demand: {avg_demand} units. "
            f"Dominant stock status: {dominant_status}. "
            f"Critical days: {critical_days}. Low days: {low_days}. Healthy days: {healthy_days}. "
            f"{coverage_summary}"
        )

        documents.append(
            {
                "id": f"monthly__{product_id}__{year_month}",
                "doc_type": "monthly_summary",
                "granularity": "month",
                "text": text,
                "metadata": {
                    "product_id": product_id,
                    "product_name": product_name,
                    "category": category,
                    "type": product_type,
                    "date": year_month,
                    "year": int(year),
                    "month": int(month),
                    "year_month": year_month,
                    "stock_status": dominant_status,
                },
            }
        )

    return documents


def build_pipeline_pages(documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    pages: List[Dict[str, Any]] = []
    for doc in documents:
        pages.append(
            {
                "page": 1,
                "source": doc["id"],
                "text": doc["text"],
                "doc_type": doc["doc_type"],
                "granularity": doc["granularity"],
                "metadata": doc["metadata"],
            }
        )
    return pages


def _write_jsonl(records: List[Dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=True) + "\n")


def prepare_inventory_rag(input_csv: str | Path, output_dir: str | Path) -> Dict[str, Path]:
    df = load_inventory_csv(input_csv)
    daily_docs = build_daily_documents(df)
    monthly_docs = build_monthly_summary_documents(df)
    all_docs = daily_docs + monthly_docs
    pipeline_pages = build_pipeline_pages(all_docs)

    output_dir = Path(output_dir)
    outputs = {
        "daily_docs": output_dir / "inventory_rag_daily_docs.jsonl",
        "monthly_docs": output_dir / "inventory_rag_monthly_docs.jsonl",
        "all_docs": output_dir / "inventory_rag_all_docs.jsonl",
        "pipeline_pages": output_dir / "inventory_rag_pipeline_pages.jsonl",
    }

    _write_jsonl(daily_docs, outputs["daily_docs"])
    _write_jsonl(monthly_docs, outputs["monthly_docs"])
    _write_jsonl(all_docs, outputs["all_docs"])
    _write_jsonl(pipeline_pages, outputs["pipeline_pages"])
    return outputs


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare inventory CSV data for RAG ingestion.")
    parser.add_argument(
        "--input",
        default="data/raw/inventory_enriched_rag_ready.csv",
        help="Path to the input CSV file.",
    )
    parser.add_argument(
        "--output-dir",
        default="data/processed",
        help="Directory where JSONL artifacts will be written.",
    )
    args = parser.parse_args()

    outputs = prepare_inventory_rag(args.input, args.output_dir)
    for name, path in outputs.items():
        print(f"{name}: {path}")


if __name__ == "__main__":
    main()
