from __future__ import annotations

import os
from pathlib import Path

TEST_DB = Path(__file__).with_name("test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
os.environ["ENVIRONMENT"] = "test"


def pytest_sessionfinish() -> None:
    from backend.db import engine

    engine.dispose()
    TEST_DB.unlink(missing_ok=True)
