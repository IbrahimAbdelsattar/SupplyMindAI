from datetime import datetime

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
