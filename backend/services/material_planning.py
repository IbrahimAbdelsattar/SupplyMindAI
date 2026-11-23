from datetime import timezone
from decimal import Decimal
from math import ceil

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db import RawMaterialStock
from backend.schemas.forecast import MonthlyPrediction
from backend.schemas.materials import (
    MaterialPlan,
    MaterialRequirement,
    MonthlyMaterialDemand,
    RawMaterialBalance,
)


def raw_material_balances(db: Session, catalog: dict[str, str]) -> dict[str, RawMaterialBalance]:
    balances = {
        material_id: RawMaterialBalance(material_id=material_id, material_name=name)
        for material_id, name in catalog.items()
    }
    for row in db.scalars(select(RawMaterialStock).where(RawMaterialStock.material_id.in_(list(catalog)))):
        balance = balances[row.material_id]
        balance.on_hand = row.on_hand
        balance.updated_at = row.updated_at.replace(tzinfo=timezone.utc) if row.updated_at.tzinfo is None else row.updated_at
    return balances


def build_material_plan(
    product_id: str,
    horizon_days: int,
    forecast: list[MonthlyPrediction],
    bill_of_materials: dict[str, int],
    balances: dict[str, RawMaterialBalance],
) -> MaterialPlan:
    cumulative_units = Decimal(0)
    cumulative_by_period: dict[str, int] = {}
    monthly_demand = []
    for prediction in forecast:
        cumulative_units += Decimal(str(prediction.predicted_demand))
        cumulative_by_period[prediction.period] = ceil(cumulative_units)
        monthly_demand.append(
            MonthlyMaterialDemand(period=prediction.period, predicted_demand=prediction.predicted_demand)
        )

    forecast_units = ceil(cumulative_units)
    materials = []
    for material_id, quantity in bill_of_materials.items():
        balance = balances[material_id]
        required = forecast_units * quantity
        to_buy = remaining = first_shortage_period = None
        if balance.on_hand is not None:
            to_buy = max(0, required - balance.on_hand)
            remaining = max(0, balance.on_hand - required)
            first_shortage_period = next(
                (period for period, units in cumulative_by_period.items() if units * quantity > balance.on_hand),
                None,
            )
        materials.append(
            MaterialRequirement(
                **balance.model_dump(),
                quantity_per_unit=quantity,
                required=required,
                to_buy=to_buy,
                remaining=remaining,
                first_shortage_period=first_shortage_period,
            )
        )
    return MaterialPlan(
        product_id=product_id,
        horizon_days=horizon_days,
        forecast_units=forecast_units,
        monthly_demand=monthly_demand,
        materials=materials,
    )
