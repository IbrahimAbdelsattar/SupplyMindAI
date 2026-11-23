from datetime import date, datetime, timezone
from decimal import Decimal

import pandas as pd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


class FixedDate(date):
    @classmethod
    def today(cls):
        return cls(2026, 11, 21)


class ForecastStub:
    def predict(self, product_id, n_months, *, start_period):
        assert str(start_period) == "2026-12"
        demand = [2000, 1000, 200, 0, 0, 0] if product_id == "FAN_STD" else [400] * 6
        return pd.DataFrame(
            {
                "period": [str(start_period + index) for index in range(n_months)],
                "predicted_demand": demand[:n_months],
            }
        )


def test_optimizer_shares_stock_and_handles_lead_time_capacity_and_budget(material_client):
    client, headers = material_client
    manager, analyst = headers["manager"], headers["analyst"]
    stock_path = "/api/v1/inventory/raw-materials"
    solve_path = "/api/v1/inventory/production-plan/optimize"
    targets = [
        {"product_id": "FAN_STD", "units": 10, "due_day": 2, "minutes_per_unit": 6, "priority": 10},
        {"product_id": "EX_FLAT", "units": 10, "due_day": 2, "minutes_per_unit": 6, "priority": 1},
    ]
    payload = {"targets": targets, "daily_minutes": 60, "extra_daily_minutes": 60}

    assert client.post(solve_path, headers=headers["viewer"], json=payload).status_code == 403
    missing = client.post(solve_path, headers=analyst, json=payload).raise_for_status().json()
    assert missing["baseline"] is None
    assert set(missing["missing_stock"]) == {"RM_PLASTIC", "RM_STEEL", "RM_HEATER", "RM_PACK"}
    for material, count in {"RM_PLASTIC": 40, "RM_STEEL": 40, "RM_HEATER": 20, "RM_PACK": 10}.items():
        client.put(f"{stock_path}/{material}", headers=manager, json={"on_hand": count}).raise_for_status()

    def solve(**overrides):
        return client.post(solve_path, headers=analyst, json={**payload, **overrides}).raise_for_status().json()

    result = solve()
    plan = result["baseline"]
    assert plan["status"] == "optimal"
    assert [t["missed_units"] for t in plan["targets"]] == [0, 10]
    assert min(row["on_hand"] for row in plan["balances"]) == 0
    assert plan["orders"] == []
    assert result["comparison"]["daily_minutes"] == 120
    assert solve(strict_targets=True)["baseline"]["status"] == "infeasible"
    reversed_targets = [{**t, "priority": 11 - t["priority"]} for t in targets]
    assert [t["missed_units"] for t in solve(targets=reversed_targets)["baseline"]["targets"]] == [10, 0]

    quote_path = f"{stock_path}/RM_STEEL/quote"
    quote = {"supplier_name": "Steel supplier", "unit_price": "2.00", "lead_time_days": 2}
    client.put(quote_path, headers=manager, json=quote).raise_for_status()
    assert solve(strict_targets=True)["baseline"]["status"] == "infeasible"
    client.put(quote_path, headers=manager, json={**quote, "lead_time_days": 1}).raise_for_status()

    budget = solve(budget_egp="16.00")["baseline"]
    assert [t["missed_units"] for t in budget["targets"]] == [0, 8]
    assert Decimal(budget["spend_egp"]) == Decimal("16.00")

    result = solve(daily_minutes=30, strict_targets=True)
    assert result["baseline"]["status"] == "infeasible"
    comparison = result["comparison"]
    assert comparison["status"] == "optimal"
    assert [t["missed_units"] for t in comparison["targets"]] == [0, 0]
    assert comparison["orders"] == [{
        "material_id": "RM_STEEL", "supplier_name": "Steel supplier",
        "order_day": 1, "arrival_day": 2, "units": 40, "cost_egp": "80.00",
    }]
    assert sum(b["units"] for b in comparison["builds"] if b["day"] == 1) <= 10
    for day in (1, 2):
        assert sum(b["line_minutes"] for b in comparison["builds"] if b["day"] == day) <= 90
    assert all(row["on_hand"] >= 0 for row in comparison["balances"])
    assert client.get(solve_path, headers=analyst).status_code == 405
    materials = client.get(stock_path, headers=analyst).raise_for_status().json()
    assert next(m for m in materials if m["material_id"] == "RM_STEEL")["on_hand"] == 40


@pytest.fixture
def material_client(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "local-test-material-planning-signing-key")
    from backend import db
    from backend.auth.tokens import create_access_token
    from backend.routers import forecasting, inventory_domain
    from backend.services import monthly_forecast

    engine = create_engine(
        "sqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    session = sessionmaker(bind=engine)
    monkeypatch.setattr(db, "SessionLocal", session)
    monkeypatch.setattr(db, "using_postgres_fallback", False)
    db.Base.metadata.create_all(engine)
    monkeypatch.setattr(monthly_forecast, "date", FixedDate)
    monkeypatch.setattr(monthly_forecast, "load_ml_model", ForecastStub)
    headers = {}
    with session.begin() as connection:
        for role in ("manager", "analyst", "viewer"):
            user = db.User(
                id=role,
                name=role,
                email=f"{role}@supplymind.tech",
                role=role,
                created_at=datetime.now(timezone.utc),
            )
            connection.add(user)
            headers[role] = {"Authorization": f"Bearer {create_access_token(user)}"}

    app = FastAPI()
    app.include_router(forecasting.router)
    app.include_router(inventory_domain.router)
    with TestClient(app) as client:
        yield client, headers
    engine.dispose()


def test_plan_uses_forecast_and_current_raw_inventory(material_client):
    client, headers = material_client
    planner = headers["analyst"]
    manager = headers["manager"]
    plan_path = "/api/v1/inventory/material-plan"
    stock_path = "/api/v1/inventory/raw-materials"
    parameters = {"product_id": "FAN_STD", "horizon_days": 30}

    plan = client.get(plan_path, headers=planner, params=parameters).raise_for_status().json()
    components = {item["material_id"]: item for item in plan["materials"]}
    assert plan["forecast_units"] == 2000
    assert {key: item["required"] for key, item in components.items()} == {
        "RM_PLASTIC": 8000, "RM_STEEL": 8000, "RM_HEATER": 2000,
    }
    assert all(item["on_hand"] is None and item["to_buy"] is None for item in components.values())

    for material, count in [("RM_PLASTIC", 7000), ("RM_STEEL", 0), ("RM_HEATER", 6500)]:
        response = client.put(f"{stock_path}/{material}", headers=manager, json={"on_hand": count})
        assert response.raise_for_status().json()["on_hand"] == count

    plan = client.get(plan_path, headers=planner, params=parameters).raise_for_status().json()
    components = {item["material_id"]: item for item in plan["materials"]}
    assert components["RM_PLASTIC"]["to_buy"] == 1000
    assert components["RM_STEEL"]["to_buy"] == 8000
    assert components["RM_HEATER"]["to_buy"] == 0
    assert components["RM_HEATER"]["remaining"] == 4500
    client.put(f"{stock_path}/RM_PLASTIC", headers=manager, json={"on_hand": 9000}).raise_for_status()

    one_month = client.get(plan_path, headers=planner, params=parameters).raise_for_status().json()
    plastic = next(item for item in one_month["materials"] if item["material_id"] == "RM_PLASTIC")
    assert plastic["to_buy"] == 0
    assert plastic["remaining"] == 1000
    assert plastic["first_shortage_period"] is None

    parameters["horizon_days"] = 180
    six_months = client.get(plan_path, headers=planner, params=parameters).raise_for_status().json()
    assert six_months["forecast_units"] == 3200
    plastic = next(item for item in six_months["materials"] if item["material_id"] == "RM_PLASTIC")
    assert plastic["to_buy"] == 3800
    assert plastic["first_shortage_period"] == "2027-01"
    forecast = client.post("/api/v1/forecast/predict", headers=planner, json=parameters).raise_for_status().json()
    assert all(month["confidence_level"] is None and month["demand_trend"] is None for month in forecast["monthly_summary"])
    assert six_months["monthly_demand"] == [
        {key: month[key] for key in ("period", "predicted_demand")}
        for month in forecast["monthly_summary"]
    ]
    future = [point for point in forecast["series"] if point["actual"] is None]
    assert future[0]["date"] == "2026-12-01"
    assert {point["forecast"] for point in future if point["date"].startswith("2026-12")} == {64.52}
    assert all(point["lower"] is None and point["upper"] is None for point in future)
    assert all(point["forecast"] is None for point in forecast["series"] if point["actual"] is not None)

    another_product = client.get(
        plan_path, headers=planner, params={"product_id": "AF_5", "horizon_days": 90}
    ).raise_for_status().json()
    assert another_product["forecast_units"] == 1200
    assert {item["material_id"] for item in another_product["materials"]} == {"RM_COPPER", "RM_BOARD", "RM_PLASTIC"}


def test_material_access_and_validation(material_client):
    client, headers = material_client
    stock_path = "/api/v1/inventory/raw-materials"
    plan_path = "/api/v1/inventory/material-plan"
    parameters = {"product_id": "FAN_STD"}

    assert client.get(stock_path).status_code == 401
    assert client.get(stock_path, headers=headers["viewer"]).status_code == 200
    assert client.get(plan_path, params=parameters, headers=headers["viewer"]).status_code == 403
    assert client.get(plan_path, params={"product_id": "unknown"}, headers=headers["analyst"]).status_code == 404
    assert client.get(plan_path, params={**parameters, "horizon_days": 60}, headers=headers["analyst"]).status_code == 422
    assert client.put(
        f"{stock_path}/RM_PLASTIC", json={"on_hand": 10}, headers=headers["analyst"]
    ).status_code == 403
    assert client.put(
        f"{stock_path}/unknown", json={"on_hand": 10}, headers=headers["manager"]
    ).status_code == 404
    for count in [-1, 0.5, True, "0", 2_147_483_648]:
        assert client.put(
            f"{stock_path}/RM_PLASTIC", json={"on_hand": count}, headers=headers["manager"]
        ).status_code == 422


def test_production_plan_minimizes_new_purchases_and_finishes_as_early_as_possible(material_client):
    client, headers = material_client
    path = "/api/v1/inventory/production-plan"
    params = {"product_id": "FAN_STD", "target_units": 1000}
    planner = headers["analyst"]
    assert client.get(path, params=params, headers=headers["viewer"]).status_code == 403
    for invalid in (0, 1.5, -1):
        assert client.get(path, params={**params, "target_units": invalid}, headers=planner).status_code == 422

    estimate = client.get(path, params=params, headers=planner).raise_for_status().json()
    assert estimate["full_purchase_cost"] is None
    assert estimate["new_material_spend"] is None
    assert estimate["completion_days"] is None
    assert estimate["daily_capacity"] is None

    for material, on_hand in [("RM_PLASTIC", 1600), ("RM_STEEL", 4000), ("RM_HEATER", 1000)]:
        client.put(
            f"/api/v1/inventory/raw-materials/{material}",
            json={"on_hand": on_hand},
            headers=headers["manager"],
        ).raise_for_status()

    planning_params = {**params, "daily_capacity": 100, "deadline_days": 12}
    without_quotes = client.get(path, params=planning_params, headers=planner).raise_for_status().json()
    assert without_quotes["new_material_spend"] is None
    assert without_quotes["completion_days"] is None

    stock_path = "/api/v1/inventory/raw-materials"
    first_quote = {"supplier_name": "Test supplier", "unit_price": "5.75", "lead_time_days": 7}
    assert client.put(f"{stock_path}/RM_PLASTIC/quote", json=first_quote, headers=planner).status_code == 403
    for invalid in ({"unit_price": "-1"}, {"unit_price": "1.234"}, {"lead_time_days": -1}, {"supplier_name": " "}):
        assert client.put(
            f"{stock_path}/RM_PLASTIC/quote", json={**first_quote, **invalid}, headers=headers["manager"]
        ).status_code == 422
    client.put(f"{stock_path}/RM_PLASTIC/quote", json=first_quote, headers=headers["manager"]).raise_for_status()
    inventory = client.get(stock_path, headers=planner).raise_for_status().json()
    plastic = next(row for row in inventory if row["material_id"] == "RM_PLASTIC")
    assert plastic["quote"] == first_quote
    assert plastic["on_hand"] == 1600

    plan = client.get(path, params=planning_params, headers=planner).raise_for_status().json()
    materials = {material["material_id"]: material for material in plan["materials"]}
    assert materials["RM_PLASTIC"]["to_buy"] == 2400
    assert materials["RM_PLASTIC"]["supplier_name"] == "Test supplier"
    assert materials["RM_PLASTIC"]["lead_time_days"] == 7
    assert materials["RM_STEEL"]["to_buy"] == materials["RM_HEATER"]["to_buy"] == 0
    assert Decimal(plan["new_material_spend"]) == Decimal("13800")
    assert plan["full_purchase_cost"] is None
    assert plan["completion_days"] == 13 > plan["deadline_days"]
    assert plan["phases"] == [
        {"first_day": 1, "last_day": 4, "units": 400},
        {"first_day": 8, "last_day": 13, "units": 600},
    ]

    fully_stocked = client.get(
        path, params={**params, "target_units": 350, "daily_capacity": 100}, headers=planner
    ).raise_for_status().json()
    assert Decimal(fully_stocked["new_material_spend"]) == 0
    assert fully_stocked["phases"] == [{"first_day": 1, "last_day": 4, "units": 350}]

    revised_quote = {**first_quote, "unit_price": "6.15", "lead_time_days": 9}
    client.put(f"{stock_path}/RM_PLASTIC/quote", json=revised_quote, headers=headers["manager"]).raise_for_status()
    revised = client.get(path, params=planning_params, headers=planner).raise_for_status().json()
    assert Decimal(revised["new_material_spend"]) == Decimal("14760")
    assert revised["completion_days"] == 15

    for material, price, lead in (("RM_STEEL", "12.00", 10), ("RM_HEATER", "20.00", 5)):
        client.put(
            f"{stock_path}/{material}/quote",
            json={"supplier_name": "Another test supplier", "unit_price": price, "lead_time_days": lead},
            headers=headers["manager"],
        ).raise_for_status()
    for material in materials:
        client.put(f"{stock_path}/{material}", json={"on_hand": 0}, headers=headers["manager"]).raise_for_status()

    costs_only = client.get(path, params=params, headers=planner).raise_for_status().json()
    assert costs_only["completion_days"] is None
    from_empty = client.get(path, params=planning_params, headers=planner).raise_for_status().json()
    assert Decimal(from_empty["full_purchase_cost"]) == Decimal(from_empty["new_material_spend"]) == Decimal("92600")
    assert from_empty["phases"] == [{"first_day": 11, "last_day": 20, "units": 1000}]



def test_material_inventory_rejects_postgres_fallback(material_client, monkeypatch):
    from backend import db

    client, headers = material_client
    manager = headers["manager"]
    stock_path = "/api/v1/inventory/raw-materials"
    material_path = f"{stock_path}/RM_PLASTIC"
    quote = {"supplier_name": "Local Supplier", "unit_price": "5.00", "lead_time_days": 2}

    with monkeypatch.context() as fallback:
        fallback.setattr(db, "using_postgres_fallback", True)
        assert client.get(stock_path, headers=manager).status_code == 503
        assert client.put(material_path, headers=manager, json={"on_hand": 12}).status_code == 503
        assert client.put(f"{material_path}/quote", headers=manager, json=quote).status_code == 503

    inventory = client.get(stock_path, headers=manager).raise_for_status().json()
    plastic = next(item for item in inventory if item["material_id"] == "RM_PLASTIC")
    assert plastic["on_hand"] is None
    assert plastic["quote"] is None
