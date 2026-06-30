import logging

from fastapi import APIRouter, Request, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.get("/stats")
async def get_stats(request: Request):
    monitor = request.app.state.guardrail_monitor
    return monitor.get_stats()


@router.get("/violations")
async def get_violations(
    request: Request,
    limit: int = Query(100, ge=1, le=500),
):
    monitor = request.app.state.guardrail_monitor
    return {"violations": monitor.get_recent_violations(limit=limit)}


@router.get("/red-team-report")
async def get_red_team_report(request: Request):
    monitor = getattr(request.app.state, "guardrail_monitor", None)
    if monitor is None:
        return {"report": "No guardrail monitor configured"}
    stats = monitor.get_stats()
    return {
        "report": {
            "summary": f"Total violations: {stats['total_violations']}, Blocked: {stats['total_blocked']}",
            "total_tests": stats["total_violations"],
            "passed": stats["total_violations"] - stats["total_blocked"],
            "failed": stats["total_blocked"],
            "categories": stats["violations_by_category"],
            "severity_distribution": stats["violations_by_severity"],
        }
    }
