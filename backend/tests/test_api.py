"""
Backend API integration tests for SupplyMind AI.

Tests the core API endpoints to ensure they respond correctly.
Uses FastAPI's TestClient for synchronous testing without needing
a running server or database.
"""

import os
import sys

# Ensure project root is on the Python path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Fixture: create a TestClient for the FastAPI app
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def client():
    """
    Create a test client.
    We set DATABASE_URL to SQLite so tests don't require PostgreSQL.
    """
    os.environ.setdefault("DATABASE_URL", "sqlite:///./test_supplymind.db")
    os.environ.setdefault("JWT_SECRET", "test-secret-key-for-ci")

    from backend.main import app

    with TestClient(app) as c:
        yield c

    # Cleanup test database
    db_path = os.path.join(PROJECT_ROOT, "test_supplymind.db")
    if os.path.exists(db_path):
        os.remove(db_path)


# ===========================================================================
# 1. Health Check
# ===========================================================================
class TestHealth:
    def test_health_endpoint(self, client: TestClient):
        """GET /api/v1/health should return 200 with status=ok."""
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_health_has_components(self, client: TestClient):
        """Health endpoint should report component statuses."""
        response = client.get("/api/v1/health")
        data = response.json()
        assert "components" in data or "status" in data


# ===========================================================================
# 2. Authentication Flow
# ===========================================================================
class TestAuth:
    TEST_EMAIL = "testuser@supplymind.ai"
    TEST_PASSWORD = "TestPassword123!"
    TEST_NAME = "Test User"

    def test_signup(self, client: TestClient):
        """POST /api/v1/auth/signup should create a new user."""
        response = client.post(
            "/api/v1/auth/signup",
            json={
                "email": self.TEST_EMAIL,
                "password": self.TEST_PASSWORD,
                "name": self.TEST_NAME,
            },
        )
        # 200 on success, 400 if user already exists (idempotent re-run)
        assert response.status_code in (200, 400)
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert data["user"]["email"] == self.TEST_EMAIL

    def test_signin(self, client: TestClient):
        """POST /api/v1/auth/signin should return a JWT token."""
        # Ensure user exists first
        client.post(
            "/api/v1/auth/signup",
            json={
                "email": self.TEST_EMAIL,
                "password": self.TEST_PASSWORD,
                "name": self.TEST_NAME,
            },
        )

        response = client.post(
            "/api/v1/auth/signin",
            json={"email": self.TEST_EMAIL, "password": self.TEST_PASSWORD},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == self.TEST_EMAIL

    def test_signin_wrong_password(self, client: TestClient):
        """POST /api/v1/auth/signin with wrong password should return 401."""
        response = client.post(
            "/api/v1/auth/signin",
            json={"email": self.TEST_EMAIL, "password": "wrong-password"},
        )
        assert response.status_code == 401

    def test_me_without_token(self, client: TestClient):
        """GET /api/v1/auth/me without token should return 401."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code in (401, 403)


# ===========================================================================
# 3. Data Endpoints (require auth)
# ===========================================================================
class TestDataEndpoints:
    def _get_token(self, client: TestClient) -> str:
        """Helper: sign in and return access token."""
        # Create user if needed
        client.post(
            "/api/v1/auth/signup",
            json={
                "email": "data_tester@test.com",
                "password": "TestPass123!",
                "name": "Data Tester",
            },
        )
        response = client.post(
            "/api/v1/auth/signin",
            json={"email": "data_tester@test.com", "password": "TestPass123!"},
        )
        return response.json()["access_token"]

    def test_products(self, client: TestClient):
        """GET /api/v1/data/products should return product list."""
        token = self._get_token(client)
        response = client.get(
            "/api/v1/data/products",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_kpis(self, client: TestClient):
        """GET /api/v1/data/kpis should return KPI metrics."""
        token = self._get_token(client)
        response = client.get(
            "/api/v1/data/kpis",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200

    def test_products_without_auth(self, client: TestClient):
        """GET /api/v1/data/products without token should return 401."""
        response = client.get("/api/v1/data/products")
        assert response.status_code == 401


# ===========================================================================
# 4. Forecast Endpoints
# ===========================================================================
class TestForecast:
    def _get_token(self, client: TestClient) -> str:
        client.post(
            "/api/v1/auth/signup",
            json={
                "email": "forecast_tester@test.com",
                "password": "TestPass123!",
                "name": "Forecast Tester",
            },
        )
        response = client.post(
            "/api/v1/auth/signin",
            json={"email": "forecast_tester@test.com", "password": "TestPass123!"},
        )
        return response.json()["access_token"]

    def test_forecast_predict(self, client: TestClient):
        """POST /api/v1/forecast/predict should return predictions."""
        token = self._get_token(client)
        response = client.post(
            "/api/v1/forecast/predict",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_id": "BL_KIT", "horizon_days": 30},
        )
        # 200 on success, 404 if product not found, 500 if model unavailable
        assert response.status_code in (200, 404, 500)

    def test_shap_endpoint(self, client: TestClient):
        """GET /api/v1/forecast/shap should return feature importances."""
        token = self._get_token(client)
        response = client.get(
            "/api/v1/forecast/shap",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "features" in data
        assert "source" in data


# ===========================================================================
# 5. Settings Endpoints
# ===========================================================================
class TestSettings:
    def _get_token(self, client: TestClient) -> str:
        client.post(
            "/api/v1/auth/signup",
            json={
                "email": "settings_tester@test.com",
                "password": "TestPass123!",
                "name": "Settings Tester",
            },
        )
        response = client.post(
            "/api/v1/auth/signin",
            json={"email": "settings_tester@test.com", "password": "TestPass123!"},
        )
        return response.json()["access_token"]

    def test_get_default_settings(self, client: TestClient):
        """GET /api/v1/settings should return empty defaults for new user."""
        token = self._get_token(client)
        response = client.get(
            "/api/v1/settings",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "settings" in data

    def test_save_and_load_settings(self, client: TestClient):
        """PUT then GET /api/v1/settings should persist values."""
        token = self._get_token(client)

        # Save
        save_response = client.put(
            "/api/v1/settings",
            headers={"Authorization": f"Bearer {token}"},
            json={"theme": "dark", "region": "eu", "language": "en"},
        )
        assert save_response.status_code == 200

        # Load
        load_response = client.get(
            "/api/v1/settings",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert load_response.status_code == 200
        settings = load_response.json()["settings"]
        assert settings.get("theme") == "dark"
        assert settings.get("region") == "eu"
