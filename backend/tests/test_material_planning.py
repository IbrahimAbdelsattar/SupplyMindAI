from datetime import date, datetime, timezone

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
    assert six_months["monthly_demand"] == [
        {key: month[key] for key in ("period", "predicted_demand")}
        for month in forecast["monthly_summary"]
    ]
    assert next(point["date"] for point in forecast["series"] if point["actual"] is None) == "2026-12-01"

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
