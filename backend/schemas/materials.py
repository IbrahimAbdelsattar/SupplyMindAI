from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator


class BomCatalogImport(BaseModel):
    csv: str = Field(min_length=1, max_length=250_000)


class BomProduct(BaseModel):
    product_id: str
    product_name: str


class BomCatalogSummary(BaseModel):
    version: str | None
    products: list[BomProduct]


class RawMaterialBalance(BaseModel):
    material_id: str
    material_name: str
    on_hand: int | None = None
    updated_at: datetime | None = None


class UpdateRawMaterialBalance(BaseModel):
    on_hand: int = Field(strict=True, ge=0, le=2_147_483_647)


class MaterialSupplierQuote(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    supplier_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    unit_price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    lead_time_days: int = Field(strict=True, ge=0, le=2_147_483_647)


class RawMaterialInventoryEntry(RawMaterialBalance):
    quote: MaterialSupplierQuote | None = None


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
    deadline_days: int | None = None
    completion_days: int | None = None
    new_material_spend: Decimal | None = None
    full_purchase_cost: Decimal | None = None
    materials: list[ProductionMaterial]
    phases: list[ProductionPhase]


class OptimizationTarget(BaseModel):
    product_id: str = Field(min_length=1, max_length=80)
    units: int = Field(strict=True, ge=1, le=100_000)
    due_day: int = Field(strict=True, ge=1, le=60)
    minutes_per_unit: int = Field(strict=True, ge=1, le=1440)
    priority: int = Field(strict=True, ge=1, le=10)


class ProductionOptimizationRequest(BaseModel):
    targets: list[OptimizationTarget] = Field(min_length=1, max_length=12)
    daily_minutes: int = Field(strict=True, ge=0, le=1440)
    extra_daily_minutes: int | None = Field(default=None, strict=True, ge=1, le=1440)
    budget_egp: Decimal | None = Field(default=None, ge=0, max_digits=11, decimal_places=2)
    strict_targets: bool = False

    @model_validator(mode="after")
    def validate_scenario(self):
        if len({target.product_id for target in self.targets}) != len(self.targets):
            raise ValueError("Enter one target per product")
        if self.daily_minutes + (self.extra_daily_minutes or 0) > 1440:
            raise ValueError("Total daily capacity cannot exceed 24 hours")
        return self


class OptimizedTarget(BaseModel):
    product_id: str
    due_day: int
    units: int
    missed_units: int


class OptimizedBuild(BaseModel):
    day: int
    product_id: str
    units: int
    line_minutes: int


class OptimizedOrder(BaseModel):
    material_id: str
    supplier_name: str
    order_day: int
    arrival_day: int
    units: int
    cost_egp: Decimal


class ProjectedMaterialBalance(BaseModel):
    material_id: str
    day: int
    on_hand: int


class OptimizedScenario(BaseModel):
    status: Literal["optimal", "feasible", "infeasible", "no_solution"]
    daily_minutes: int
    gap: float | None = None
    gap_objective: Literal["service", "cost"] | None = None
    weighted_missed_units: int | None = None
    spend_egp: Decimal | None = None
    targets: list[OptimizedTarget] = Field(default_factory=list)
    builds: list[OptimizedBuild] = Field(default_factory=list)
    orders: list[OptimizedOrder] = Field(default_factory=list)
    balances: list[ProjectedMaterialBalance] = Field(default_factory=list)


class ProductionOptimizationResult(BaseModel):
    materials: dict[str, str]
    missing_stock: list[str]
    missing_quotes: list[str]
    baseline: OptimizedScenario | None = None
    comparison: OptimizedScenario | None = None
