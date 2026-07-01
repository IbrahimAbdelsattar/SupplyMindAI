from __future__ import annotations

from datetime import datetime, timezone, timedelta
import random
import uuid

from fastapi import APIRouter, Depends

from backend.dependencies import _get_current_user

router = APIRouter(prefix="/api/v1/security", tags=["security"])

_CATEGORIES = [
    "prompt_injection",
    "data_leakage",
    "policy_violation",
    "unauthorized_access",
    "output_manipulation",
]

_SEVERITIES = ["low", "medium", "high", "critical"]


def _build_demo_violations() -> list[dict]:
    now = datetime.now(timezone.utc)
    violations = []
    for i in range(8):
        cat = random.choice(_CATEGORIES)
        sev = random.choices(_SEVERITIES, weights=[20, 40, 25, 15])[0]
        blocked = sev in ("high", "critical")
        ts = now - timedelta(hours=random.randint(0, 72), minutes=random.randint(0, 59))
        violations.append({
            "id": str(uuid.uuid4()),
            "timestamp": ts.isoformat(),
            "category": cat,
            "severity": sev,
            "user_id": "demo-user",
            "input_preview": f"Sample input for {cat.replace('_', ' ')}",
            "blocked": blocked,
        })
    violations.sort(key=lambda v: v["timestamp"], reverse=True)
    return violations


@router.get("/stats")
def security_stats(user: dict = Depends(_get_current_user)):
    violations = _build_demo_violations()
    by_category: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    total_blocked = 0

    for v in violations:
        cat = v["category"]
        sev = v["severity"]
        by_category[cat] = by_category.get(cat, 0) + 1
        by_severity[sev] = by_severity.get(sev, 0) + 1
        if v["blocked"]:
            total_blocked += 1

    return {
        "total_violations": len(violations),
        "total_blocked": total_blocked,
        "violations_by_category": by_category,
        "violations_by_severity": by_severity,
        "recent_violations": violations,
    }
