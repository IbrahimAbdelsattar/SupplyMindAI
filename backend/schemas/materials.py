from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class RawMaterialBalance(BaseModel):
    material_id: str
    material_name: str
    on_hand: int | None = None
    updated_at: datetime | None = None


class UpdateRawMaterialBalance(BaseModel):
    on_hand: int = Field(strict=True, ge=0, le=2_147_483_647)


class MaterialRequirement(RawMaterialBalance):
    quantity_per_unit: int = Field(gt=0)
    required: int
    to_buy: int | None = None
    remaining: int | None = None
    first_shortage_period: str | None = None


class MonthlyMaterialDemand(BaseModel):
    period: str
    predicted_demand: float


class MaterialPlan(BaseModel):
    product_id: str
    horizon_days: int
    forecast_units: int
    monthly_demand: list[MonthlyMaterialDemand]
    materials: list[MaterialRequirement]


class ProductionMaterial(MaterialRequirement):
    supplier_name: str | None = None
    lead_time_days: int | None = None
    purchase_cost: Decimal | None = None


class ProductionPhase(BaseModel):
    first_day: int
    last_day: int
    units: int


class ProductionPlan(BaseModel):
    product_id: str
    target_units: int
    daily_capacity: int | None
    capacity_history_through: str | None = None
    deadline_days: int | None = None
    completion_days: int | None = None
    new_material_spend: Decimal | None = None
    full_purchase_cost: Decimal | None = None
    materials: list[ProductionMaterial]
    phases: list[ProductionPhase]
