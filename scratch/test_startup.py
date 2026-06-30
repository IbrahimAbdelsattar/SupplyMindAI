import os
import sys
import traceback
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

# Load .env
load_dotenv(PROJECT_ROOT / ".env", override=True)
print("Environment loaded:")
print("DATABASE_URL:", os.getenv("DATABASE_URL"))
print("VITE_API_URL:", os.getenv("VITE_API_URL"))
print("MODEL_PATH:", os.getenv("MODEL_PATH"))

try:
    print("\n--- Testing db.py database creation ---")
    from backend.db import create_tables, seed_database
    create_tables()
    print("create_tables() passed.")
    seed_database()
    print("seed_database() passed.")
except Exception as e:
    print("Database creation/seeding failed:")
    traceback.print_exc()

try:
    print("\n--- Testing ml_model initialization ---")
    from backend.globals import STORE
    from backend.bootstrap import init_ml_model
    ML_MODEL = init_ml_model(STORE)
    print("init_ml_model() passed. ML_MODEL:", ML_MODEL)
    print("is_trained_model_loaded:", getattr(ML_MODEL, "is_trained_model_loaded", False))
except Exception as e:
    print("ML model initialization failed:")
    traceback.print_exc()

try:
    print("\n--- Testing RAG_SERVICE initialization ---")
    from backend.bootstrap import init_rag_service
    RAG_SERVICE = init_rag_service()
    print("init_rag_service() passed. RAG_SERVICE:", RAG_SERVICE)
except Exception as e:
    print("RAG_SERVICE initialization failed:")
    traceback.print_exc()

try:
    print("\n--- Testing FORECAST_INTELLIGENCE initialization ---")
    from backend.services.forecast_intelligence_service import ForecastIntelligenceService
    csv_path = Path(os.getenv("FORECAST_CSV_PATH", str(PROJECT_ROOT / "ml_platform" / "models" / "future_forecast.csv")))
    FORECAST_INTELLIGENCE = ForecastIntelligenceService(csv_path)
    print("FORECAST_INTELLIGENCE initialized. Caching state:", getattr(FORECAST_INTELLIGENCE, "is_loaded", False))
except Exception as e:
    print("FORECAST_INTELLIGENCE initialization failed:")
    traceback.print_exc()
