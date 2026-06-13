from __future__ import annotations

import uuid

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from backend.db import Base, engine
from backend.dependencies import _get_current_user
from backend.routers.auth import router as auth_router


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(auth_router)

    @app.get("/protected")
    async def protected(user=Depends(_get_current_user)):
        return {"id": user.id, "email": user.email}

    return TestClient(app)


def test_signup_signin_and_protected_route(client: TestClient):
    email = f"{uuid.uuid4()}@example.com"
    signup = client.post(
        "/api/v1/auth/signup",
        json={"name": "Production User", "email": email, "password": "correct-horse-123"},
    )
    assert signup.status_code == 200
    token = signup.json()["access_token"]

    protected = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert protected.status_code == 200
    assert protected.json()["email"] == email

    signin = client.post(
        "/api/v1/auth/signin",
        json={"email": email, "password": "correct-horse-123"},
    )
    assert signin.status_code == 200


def test_protected_route_rejects_missing_and_invalid_tokens(client: TestClient):
    assert client.get("/protected").status_code == 401
    assert client.get("/protected", headers={"Authorization": "Bearer invalid"}).status_code == 401


def test_signup_rejects_short_password(client: TestClient):
    response = client.post(
        "/api/v1/auth/signup",
        json={"name": "User", "email": "short@example.com", "password": "short"},
    )
    assert response.status_code == 400
