"""Remove records written by earlier releases' built-in sample seed."""

import hashlib
import json

from sqlalchemy import delete, select

from backend.db import ForecastResult, KnowledgeDocument, KnowledgeEmbedding, SessionLocal

_FORECAST_FIELDS = (
    "product_id",
    "period",
    "predicted_demand",
    "confidence_level",
    "demand_trend",
    "current_stock",
    "stock_risk_level",
    "recommended_order_qty",
    "supplier_score",
    "best_supplier",
    "lead_time_days",
    "delay_risk",
    "avg_delay",
    "profit_margin",
    "revenue_forecast",
)
_FORECAST_SIGNATURES = {
    "9bbbf43942d1675d39c3798aebb0599ae920922c7f9bf9064202e4155cd503a4",
    "947153198326e979639081c532314a8d13634b5340d56c903e6d5ecacadd9185",
    "9fb59fdda6e8a19e86f8623b9054904f85e458b7f3ddd6bc94db5d0faf38737e",
    "5a5c485f3eb542eb48f22b5b6a79b9a639500094009819f20d069f921ec03d9b",
    "d6534c278818dbd82467537f4628d25974dff68869fe3fccdb6b927ed1e532c6",
    "6cdb4762972a0f0d5235da17e02283e7bf55809f25a39df2e98c19b2a6cb57d8",
    "2f7334b0d7672f85b0ce8f21680d8a32df3076c8028056ee9526de183b87bb73",
    "c9444c5aeec96c604358cca01d7180f395c4c988ce69237fb9c47cc10e4a0c37",
    "895f8bb10a34a0bca361498e442a78c926b4221c3081afcd5ae7225003600218",
}
_DOCUMENT_FIELDS = ("title", "content", "source_type", "source_id")
_DOCUMENT_SIGNATURES = {
    "1f7198ef8b24b77ab3de14bbfb971398c30b03fbbb5b8d54386b3f9da1580de8",
    "51e8622ecfd17f15a1cbac94a30821712a69a101e0b2a808fca35fa878450ee7",
    "28628017623fb97d7ff1096f6d2e0662b7283e1061666e995577d1c6f3cdca2e",
}


def _signature(row, fields: tuple[str, ...]) -> str:
    payload = {name: getattr(row, name) for name in fields}
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def remove_seeded_samples() -> None:
    """Delete exact seed matches and their embeddings, preserving edited records."""
    with SessionLocal.begin() as db:
        candidates = db.scalars(
            select(ForecastResult)
            .where(ForecastResult.period.in_(("2026-06", "2026-07", "2026-08")))
            .with_for_update()
        )
        for row in candidates:
            if _signature(row, _FORECAST_FIELDS) in _FORECAST_SIGNATURES:
                db.delete(row)

        documents = db.scalars(
            select(KnowledgeDocument)
            .where(
                KnowledgeDocument.user_id.is_(None),
                KnowledgeDocument.source_id.in_(("apex_logistics", "global_logistics", "safety_stock_policy")),
            )
            .with_for_update()
        )
        for document in documents:
            if _signature(document, _DOCUMENT_FIELDS) in _DOCUMENT_SIGNATURES:
                db.execute(delete(KnowledgeEmbedding).where(KnowledgeEmbedding.document_id == document.id))
                db.delete(document)
