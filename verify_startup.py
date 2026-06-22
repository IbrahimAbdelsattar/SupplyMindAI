import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

print("Testing backend imports...")

routers_to_test = [
    "backend.routers.storage",
    "backend.routers.knowledge",
    "backend.routers.forecast_intelligence",
    "backend.routers.forecast_insights",
    "backend.routers.auth",
    "backend.routers.security",
    "backend.routers.data",
    "backend.routers.forecast",
    "backend.routers.inventory",
    "backend.routers.reports",
    "backend.routers.alerts",
    "backend.routers.mlops",
    "backend.routers.insights",
    "backend.routers.chat",
    "backend.routers.settings",
    "backend.routers.copilot",
    "backend.routers.inventory_rag",
]

failures = 0
for r in routers_to_test:
    try:
        __import__(r)
        print(f"  [OK] {r}")
    except Exception as e:
        print(f"  [FAIL] {r}: {e}")
        import traceback
        traceback.print_exc()
        failures += 1

if failures == 0:
    print("All routers imported successfully!")
    sys.exit(0)
else:
    print(f"{failures} routers failed to import.")
    sys.exit(1)
