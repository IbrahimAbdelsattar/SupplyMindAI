from collections import defaultdict
from decimal import Decimal, InvalidOperation

import pandas as pd

from backend.globals import STORE
from backend.schemas.materials import ProductionMaterial, ProductionPhase, ProductionPlan, RawMaterialBalance


def build_production_plan(
    product_id: str,
    target: int,
    daily_capacity: int | None,
    deadline_days: int | None,
    quantities: dict[str, int],
    balances: dict[str, RawMaterialBalance],
) -> ProductionPlan:
    history_through = None
    if daily_capacity is None:
        daily_capacity, history_through = _historical_capacity(product_id)

    catalog = STORE.raw_materials().drop_duplicates("material_id", keep="last")
    try:
        suppliers = STORE.suppliers().drop_duplicates("supplier_id", keep="last").set_index("supplier_id")
    except FileNotFoundError:
        suppliers = pd.DataFrame()
    supplier_details = suppliers.to_dict("index")
    materials = []
    full_purchase_cost: Decimal | None = Decimal(0)

    for row in catalog[catalog["material_id"].isin(quantities)].to_dict("records"):
        material_id = row["material_id"]
        balance = balances[material_id]
        required = quantities[material_id] * target
        on_hand = balance.on_hand
        to_buy = max(0, required - on_hand) if on_hand is not None else None
        price = _nonnegative_decimal(row.get("unit_cost"))
        if full_purchase_cost is not None:
            full_purchase_cost = None if price is None else full_purchase_cost + required * price
        cost = Decimal(0) if to_buy == 0 else None
        if price is not None and to_buy is not None:
            cost = to_buy * price

        supplier = supplier_details.get(row.get("supplier_id"), {})
        supplier_name = supplier.get("supplier_name")
        lead = _nonnegative_decimal(supplier.get("lead_time_days"))
        materials.append(
            ProductionMaterial(
                **balance.model_dump(),
                quantity_per_unit=quantities[material_id],
                required=required,
                to_buy=to_buy,
                remaining=max(0, on_hand - required) if on_hand is not None else None,
                supplier_name=supplier_name if pd.notna(supplier_name) else None,
                lead_time_days=int(lead) if lead is not None and lead == lead.to_integral_value() else None,
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
        capacity_history_through=history_through,
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


def _historical_capacity(product_id: str) -> tuple[int | None, str | None]:
    try:
        schedule = STORE.production_schedule()
    except FileNotFoundError:
        return None, None
    history = schedule.loc[schedule["product_id"] == product_id, ["date", "actual"]].copy()
    history["actual"] = pd.to_numeric(history["actual"], errors="coerce")
    history = history[history["actual"].between(0, 2_147_483_647)].dropna(subset=["date"])
    recent = history.groupby("date")["actual"].sum().sort_index().tail(28)
    if recent.empty:
        return None, None
    capacity = int(recent.mean())
    return capacity or None, recent.index[-1].date().isoformat()


def _nonnegative_decimal(value: object) -> Decimal | None:
    try:
        number = Decimal(str(value))
    except InvalidOperation:
        return None
    return number if number.is_finite() and number >= 0 else None
