from collections import defaultdict
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db import RawMaterialQuote
from backend.schemas.materials import (
    MaterialSupplierQuote, ProductionMaterial, ProductionPhase, ProductionPlan, RawMaterialBalance,
)


def raw_material_quotes(db: Session, material_ids: list[str]) -> dict[str, MaterialSupplierQuote]:
    quotes = db.scalars(select(RawMaterialQuote).where(RawMaterialQuote.material_id.in_(material_ids)))
    return {quote.material_id: MaterialSupplierQuote.model_validate(quote) for quote in quotes}


def build_production_plan(
    product_id: str,
    target: int,
    daily_capacity: int | None,
    deadline_days: int | None,
    quantities: dict[str, int],
    balances: dict[str, RawMaterialBalance],
    quotes: dict[str, MaterialSupplierQuote],
) -> ProductionPlan:
    materials = []
    full_purchase_cost: Decimal | None = Decimal(0)

    for material_id, quantity in quantities.items():
        balance = balances[material_id]
        quote = quotes.get(material_id)
        required = quantity * target
        on_hand = balance.on_hand
        to_buy = max(0, required - on_hand) if on_hand is not None else None
        if full_purchase_cost is not None:
            full_purchase_cost = None if quote is None else full_purchase_cost + required * quote.unit_price
        cost = Decimal(0) if to_buy == 0 else None
        if quote is not None and to_buy is not None:
            cost = to_buy * quote.unit_price

        materials.append(
            ProductionMaterial(
                **balance.model_dump(),
                quantity_per_unit=quantity,
                required=required,
                to_buy=to_buy,
                remaining=max(0, on_hand - required) if on_hand is not None else None,
                supplier_name=quote.supplier_name if quote else None,
                lead_time_days=quote.lead_time_days if quote else None,
                purchase_cost=cost,
            )
        )

    new_spend = None
    if all(material.purchase_cost is not None for material in materials):
        new_spend = sum((material.purchase_cost for material in materials), Decimal(0))
    phases = _earliest_schedule(target, daily_capacity, materials) if daily_capacity else []
    return ProductionPlan(
        product_id=product_id,
        target_units=target,
        daily_capacity=daily_capacity,
        deadline_days=deadline_days,
        completion_days=phases[-1].last_day if phases else None,
        new_material_spend=new_spend,
        full_purchase_cost=full_purchase_cost,
        materials=materials,
        phases=phases,
    )


def _earliest_schedule(
    target: int, daily_capacity: int, materials: list[ProductionMaterial]
) -> list[ProductionPhase]:
    """Schedule the maximum feasible cumulative output between material arrivals."""
    if any(m.on_hand is None or (m.to_buy and m.lead_time_days is None) for m in materials):
        return []

    available = {material.material_id: material.on_hand for material in materials}
    arrivals: dict[int, list[ProductionMaterial]] = defaultdict(list)
    for material in materials:
        if material.to_buy:
            arrivals[material.lead_time_days].append(material)

    phases = []
    completed = 0
    arrival_days = sorted({0, *arrivals})
    for index, day in enumerate(arrival_days):
        for material in arrivals[day]:
            available[material.material_id] += material.to_buy
        material_limit = min(available[m.material_id] // m.quantity_per_unit for m in materials)
        units = min(target, material_limit) - completed
        if index + 1 < len(arrival_days):
            units = min(units, daily_capacity * (arrival_days[index + 1] - day))
        if units > 0:
            batches, remainder = divmod(units, daily_capacity)
            phases.append(ProductionPhase(first_day=day + 1, last_day=day + batches + bool(remainder), units=units))
            completed += units
    return phases
