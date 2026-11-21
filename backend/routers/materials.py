import logging
from datetime import datetime, timezone
from typing import Annotated

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from backend.auth.dependencies import require_permission
from backend.auth.rbac import Permission
from backend.db import RawMaterialStock, get_db
from backend.globals import STORE
from backend.schemas.materials import MaterialPlan, ProductionPlan, RawMaterialBalance, UpdateRawMaterialBalance
from backend.services.material_planning import build_material_plan, material_catalog, raw_material_balances
from backend.services.monthly_forecast import ForecastUnavailable, monthly_predictions
from backend.services.production_planning import build_production_plan

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get(
    "/raw-materials",
    dependencies=[Depends(require_permission(Permission.VIEW_INVENTORY))],
)
def list_raw_materials(db: Session = Depends(get_db)) -> list[RawMaterialBalance]:
    return list(raw_material_balances(db, material_catalog()).values())


@router.put(
    "/raw-materials/{material_id}",
    dependencies=[Depends(require_permission(Permission.MANAGE_INVENTORY))],
)
def update_raw_material(
    material_id: str,
    payload: UpdateRawMaterialBalance,
    db: Session = Depends(get_db),
) -> RawMaterialBalance:
    material_name = material_catalog().get(material_id)
    if material_name is None:
        raise HTTPException(status_code=404, detail="Raw material not found")

    updated_at = datetime.now(timezone.utc)
    insert = postgres_insert if db.get_bind().dialect.name == "postgresql" else sqlite_insert
    statement = insert(RawMaterialStock).values(
        material_id=material_id, on_hand=payload.on_hand, updated_at=updated_at
    )
    db.execute(
        statement.on_conflict_do_update(
            index_elements=[RawMaterialStock.material_id],
            set_={"on_hand": statement.excluded.on_hand, "updated_at": statement.excluded.updated_at},
        )
    )
    db.commit()
    return RawMaterialBalance(
        material_id=material_id, material_name=material_name, on_hand=payload.on_hand, updated_at=updated_at
    )


@router.get(
    "/material-plan",
    dependencies=[Depends(require_permission(Permission.GENERATE_FORECASTS))],
)
def plan_materials(product_id: str, horizon_days: int = 30, db: Session = Depends(get_db)) -> MaterialPlan:
    if horizon_days not in {30, 90, 180}:
        raise HTTPException(status_code=422, detail="Select a one-, three-, or six-month horizon")
    quantities, catalog = product_materials(product_id)

    try:
        forecast = monthly_predictions(product_id, horizon_days // 30)
    except ForecastUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return build_material_plan(product_id, horizon_days, forecast, quantities, raw_material_balances(db, catalog))


@router.get("/production-plan", dependencies=[Depends(require_permission(Permission.GENERATE_FORECASTS))])
def plan_production(
    product_id: str,
    target_units: Annotated[int, Query(gt=0, le=2_147_483_647)],
    daily_capacity: Annotated[int | None, Query(gt=0, le=2_147_483_647)] = None,
    deadline_days: Annotated[int | None, Query(gt=0, le=2_147_483_647)] = None,
    db: Session = Depends(get_db),
) -> ProductionPlan:
    quantities, catalog = product_materials(product_id)
    balances = raw_material_balances(db, catalog)
    return build_production_plan(product_id, target_units, daily_capacity, deadline_days, quantities, balances)


def product_materials(product_id: str) -> tuple[dict[str, int], dict[str, str]]:
    if product_id not in STORE.products()["product_id"].values:
        raise HTTPException(status_code=404, detail="Product not found")

    bom = STORE.bom()
    components = bom.loc[bom["product_id"] == product_id, ["material_id", "qty"]].copy()
    if components.empty:
        raise HTTPException(status_code=404, detail="Product has no bill of materials")

    catalog = material_catalog()
    components["qty"] = pd.to_numeric(components["qty"], errors="coerce")
    quantities = {}
    for material_id, quantity in components.itertuples(index=False, name=None):
        if material_id not in catalog or pd.isna(quantity) or not float(quantity).is_integer() or quantity <= 0:
            logger.error("Invalid BOM entry for %s and %s", product_id, material_id)
            raise HTTPException(status_code=503, detail="Bill of materials is incomplete")
        quantities[material_id] = quantities.get(material_id, 0) + int(quantity)

    return quantities, {material_id: catalog[material_id] for material_id in quantities}
