"""Tests for Clerk JWT authentication flow.

These tests verify that the backend correctly validates Clerk JWTs
and rejects invalid/missing tokens.
"""

from __future__ import annotations

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from backend.dependencies import _get_current_user
from backend.knowledge.auth import AuthUser


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()

    @app.get("/protected")
    async def protected(user=Depends(_get_current_user)):
        return {"id": user.id, "email": user.email, "role": user.role}

    return TestClient(app)


def test_protected_route_rejects_missing_auth_header(client: TestClient):
    """Requests without an Authorization header should be rejected."""
    response = client.get("/protected")
    assert response.status_code == 401
    assert "Missing authentication header" in response.json()["detail"]


def test_protected_route_rejects_invalid_scheme(client: TestClient):
    """Requests with a non-Bearer scheme should be rejected."""
    response = client.get("/protected", headers={"Authorization": "Basic abc123"})
    assert response.status_code == 401
    assert "Invalid authorization scheme" in response.json()["detail"]


def test_protected_route_rejects_invalid_token(client: TestClient):
    """Requests with a malformed Bearer token should be rejected."""
    response = client.get("/protected", headers={"Authorization": "Bearer invalid-token"})
    assert response.status_code == 401
    assert "Authentication failed" in response.json()["detail"]


@patch("backend.dependencies.get_user_from_token")
def test_protected_route_accepts_valid_clerk_token(mock_get_user, client: TestClient):
    """A valid Clerk JWT should grant access to protected routes."""
    mock_user = AuthUser(
        id="user_clerk_abc123",
        email="test@example.com",
        user_metadata={"name": "Test User"},
        app_metadata={"role": "admin"},
        created_at="2025-01-01T00:00:00+00:00",
        updated_at="2025-01-01T00:00:00+00:00",
    )
    mock_get_user.return_value = mock_user

    response = client.get(
        "/protected",
        headers={"Authorization": "Bearer valid-clerk-jwt-token"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "user_clerk_abc123"
    assert data["email"] == "test@example.com"
    assert data["role"] == "admin"


@patch("backend.dependencies.get_user_from_token")
def test_default_role_is_analyst(mock_get_user, client: TestClient):
    """Users without a role in Clerk metadata should default to 'analyst'."""
    mock_user = AuthUser(
        id="user_no_role",
        email="norole@example.com",
        user_metadata={"name": "No Role User"},
        app_metadata={},
        created_at="2025-01-01T00:00:00+00:00",
        updated_at="2025-01-01T00:00:00+00:00",
    )
    mock_get_user.return_value = mock_user

    response = client.get(
        "/protected",
        headers={"Authorization": "Bearer valid-clerk-jwt-token"},
    )
    assert response.status_code == 200
    assert response.json()["role"] == "analyst"
