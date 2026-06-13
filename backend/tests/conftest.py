from __future__ import annotations

import os
from pathlib import Path

TEST_DB = Path(__file__).with_name("test-auth.db")
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET"] = "test-secret-that-is-long-enough-for-auth-tests"


def pytest_sessionfinish() -> None:
    TEST_DB.unlink(missing_ok=True)
