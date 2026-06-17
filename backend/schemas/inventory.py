from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class InventoryRecommendation(BaseModel):
    sku: str
    name: str
    current_stock: int = 0
    min_stock: float = 0
    max_stock: float = 0
    reorder_point: float = 0
    recommended_order: int = 0
    order_urgency: str = "normal"
    expected_lead_time_days: float = 0
    notes: str = ""


class InventoryItemOut(BaseModel):
    sku: str
    name: str
    category: str
    productType: str = ""
    active: bool = True
    stock: int = 0
    averageDailyDemand: float = 0.0
    coverageDays: float | None = None
    coverageLabel: str = ""
    stockStatus: str = "Healthy"
    lastUpdated: str = ""
    sourceText: str = ""


class InventorySummaryOut(BaseModel):
    asOf: str = ""
    totalProducts: int = 0
    activeProducts: int = 0
    inactiveProducts: int = 0
    totalUnits: int = 0
    criticalProducts: int = 0
    lowProducts: int = 0
    healthyProducts: int = 0
