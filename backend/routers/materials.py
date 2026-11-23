import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from backend import db as database
from backend.auth.dependencies import require_permission
from backend.auth.rbac import Permission
from backend.db import BomCatalog, RawMaterialQuote, RawMaterialStock, get_db
from backend.schemas.materials import (
    BomCatalogImport,
    BomCatalogSummary,
    MaterialPlan,
    MaterialSupplierQuote,
    ProductionOptimizationRequest,
    ProductionOptimizationResult,
    ProductionPlan,
    RawMaterialBalance,
    RawMaterialInventoryEntry,
    UpdateRawMaterialBalance,
)
from backend.services.bom_catalog import (
    load_bom_catalog,
    load_default_bom_catalog,
    parse_bom_catalog,
    summarize_bom_catalog,
)
from backend.services.material_planning import build_material_plan, raw_material_balances
from backend.services.monthly_forecast import ForecastUnavailable, monthly_predictions
from backend.services.production_optimization import optimize_production
from backend.services.production_planning import build_production_plan, raw_material_quotes

router = APIRouter()
logger = logging.getLogger(__name__)


def get_material_db(db: Session = Depends(get_db)) -> Session:
    if database.using_postgres_fallback:
        raise HTTPException(status_code=503, detail="The shared inventory database is unavailable")
    return db


@router.get("/bom-catalog", dependencies=[Depends(require_permission(Permission.VIEW_INVENTORY))])
def get_bom_catalog(db: Session = Depends(get_material_db)) -> BomCatalogSummary:
    return summarize_bom_catalog(load_bom_catalog(db))


@router.put("/bom-catalog", dependencies=[Depends(require_permission(Permission.MANAGE_INVENTORY))])
def save_bom_catalog(payload: BomCatalogImport, db: Session = Depends(get_material_db)) -> BomCatalogSummary:
    try:
        catalog = parse_bom_catalog(payload.csv)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    insert = postgres_insert if db.get_bind().dialect.name == "postgresql" else sqlite_insert
    values = {"version": catalog.version, "products": catalog.products,
              "materials": catalog.materials, "recipes": catalog.recipes}
    stmt = insert(BomCatalog).values(id=1, **values)
    db.execute(stmt.on_conflict_do_update(index_elements=[BomCatalog.id], set_=values))
    db.commit()
    return summarize_bom_catalog(catalog)


@router.post("/bom-catalog/load-default", dependencies=[Depends(require_permission(Permission.MANAGE_INVENTORY))])
def load_default_bom_catalog_endpoint(db: Session = Depends(get_material_db)) -> BomCatalogSummary:
    try:
        catalog = load_default_bom_catalog()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load default BOM CSV: {exc}") from exc
    insert = postgres_insert if db.get_bind().dialect.name == "postgresql" else sqlite_insert
    values = {"version": catalog.version, "products": catalog.products,
              "materials": catalog.materials, "recipes": catalog.recipes}
    stmt = insert(BomCatalog).values(id=1, **values)
    db.execute(stmt.on_conflict_do_update(index_elements=[BomCatalog.id], set_=values))
    db.commit()
    return summarize_bom_catalog(catalog)


@router.get(
    "/raw-materials",
    dependencies=[Depends(require_permission(Permission.VIEW_INVENTORY))],
)
def list_raw_materials(db: Session = Depends(get_material_db)) -> list[RawMaterialInventoryEntry]:
    balances = raw_material_balances(db, load_bom_catalog(db).materials)
    quotes = raw_material_quotes(db, list(balances))
    return [
        RawMaterialInventoryEntry(**balance.model_dump(), quote=quotes.get(material_id))
        for material_id, balance in balances.items()
    ]


@router.put(
    "/raw-materials/{material_id}",
    dependencies=[Depends(require_permission(Permission.MANAGE_INVENTORY))],
)
def update_raw_material(
    material_id: str,
    payload: UpdateRawMaterialBalance,
    db: Session = Depends(get_material_db),
) -> RawMaterialBalance:
    material_name = load_bom_catalog(db).materials.get(material_id)
    if material_name is None:
        raise HTTPException(status_code=404, detail="Raw material not found")

    updated_at = datetime.now(timezone.utc)
    _upsert_material(db, RawMaterialStock, material_id, {"on_hand": payload.on_hand, "updated_at": updated_at})
    return RawMaterialBalance(
        material_id=material_id, material_name=material_name, on_hand=payload.on_hand, updated_at=updated_at
    )


@router.put(
    "/raw-materials/{material_id}/quote",
    dependencies=[Depends(require_permission(Permission.MANAGE_INVENTORY))],
)
def save_raw_material_quote(
    material_id: str, payload: MaterialSupplierQuote, db: Session = Depends(get_material_db)
) -> MaterialSupplierQuote:
    if material_id not in load_bom_catalog(db).materials:
        raise HTTPException(status_code=404, detail="Raw material not found")
    _upsert_material(db, RawMaterialQuote, material_id, payload.model_dump())
    return payload


def _upsert_material(
    db: Session, model: type[RawMaterialStock] | type[RawMaterialQuote], material_id: str, values: dict
) -> None:
    insert = postgres_insert if db.get_bind().dialect.name == "postgresql" else sqlite_insert
    statement = insert(model).values(material_id=material_id, **values)
    db.execute(statement.on_conflict_do_update(index_elements=[model.material_id], set_=values))
    db.commit()


@router.get(
    "/material-plan",
    dependencies=[Depends(require_permission(Permission.GENERATE_FORECASTS))],
)
def plan_materials(product_id: str, horizon_days: int = 30, db: Session = Depends(get_material_db)) -> MaterialPlan:
    if horizon_days not in {30, 90, 180}:
        raise HTTPException(status_code=422, detail="Select a one-, three-, or six-month horizon")
    quantities, catalog = product_materials(load_bom_catalog(db), product_id)

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
    db: Session = Depends(get_material_db),
) -> ProductionPlan:
    quantities, catalog = product_materials(load_bom_catalog(db), product_id)
    balances = raw_material_balances(db, catalog)
    quotes = raw_material_quotes(db, list(quantities))
    return build_production_plan(product_id, target_units, daily_capacity, deadline_days, quantities, balances, quotes)


@router.post("/production-plan/optimize", dependencies=[Depends(require_permission(Permission.GENERATE_FORECASTS))])
def optimize_production_plan(
    payload: ProductionOptimizationRequest,
    db: Session = Depends(get_material_db),
) -> ProductionOptimizationResult:
    saved_catalog = load_bom_catalog(db)
    recipes, catalog = {}, {}
    for target in payload.targets:
        recipe, names = product_materials(saved_catalog, target.product_id)
        recipes[target.product_id] = recipe
        catalog.update(names)
    balances = raw_material_balances(db, catalog)
    quotes = raw_material_quotes(db, list(catalog))
    stock = {material_id: item.on_hand for material_id, item in balances.items() if item.on_hand is not None}
    result = ProductionOptimizationResult(
        materials=catalog,
        missing_stock=[material_id for material_id in catalog if material_id not in stock],
        missing_quotes=[material_id for material_id in catalog if material_id not in quotes],
    )
    if result.missing_stock:
        return result

    try:
        result.baseline = optimize_production(payload, payload.daily_minutes, recipes, stock, quotes)
        if payload.extra_daily_minutes is not None:
            result.comparison = optimize_production(
                payload, payload.daily_minutes + payload.extra_daily_minutes, recipes, stock, quotes,
            )
    except RuntimeError as exc:
        logger.exception("Production optimization failed")
        raise HTTPException(status_code=503, detail="Production optimizer unavailable") from exc
    return result


def product_materials(catalog: BomCatalog, product_id: str) -> tuple[dict[str, int], dict[str, str]]:
    quantities = catalog.recipes.get(product_id)
    if quantities is None:
        raise HTTPException(status_code=404, detail="Product has no saved operational bill of materials")
    return quantities, {material_id: catalog.materials[material_id] for material_id in quantities}
