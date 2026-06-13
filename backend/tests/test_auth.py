from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from backend.db import Base, SessionLocal, User, engine
from backend.dependencies import _get_current_user
from backend.knowledge.auth import PASSWORD_CONTEXT
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
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        db.add(
            User(
                id=str(uuid.uuid4()),
                name="Production User",
                email=email,
                password_hash=PASSWORD_CONTEXT.hash("correct-horse-123"),
                role="analyst",
                is_active=True,
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    signin = client.post(
        "/api/v1/auth/signin",
        json={"email": email, "password": "correct-horse-123"},
    )
    assert signin.status_code == 200, signin.text
    token = signin.json()["access_token"]

    protected = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert protected.status_code == 200
    assert protected.json()["email"] == email


def test_protected_route_rejects_missing_and_invalid_tokens(client: TestClient):
    assert client.get("/protected").status_code == 401
    assert client.get("/protected", headers={"Authorization": "Bearer invalid"}).status_code == 401


def test_public_signup_is_disabled(client: TestClient):
    response = client.post(
        "/api/v1/auth/signup",
        json={"name": "User", "email": "user@example.com", "password": "valid-password-123"},
    )
    assert response.status_code == 400
    assert "disabled" in response.json()["detail"].lower()
