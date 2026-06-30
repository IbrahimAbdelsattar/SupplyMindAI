import os
import sys
from pathlib import Path
import pandas as pd

# Install SQLAlchemy if needed
try:
    from sqlalchemy import create_engine
except ImportError:
    print("Installing SQLAlchemy...")
    os.system(f"{sys.executable} -m pip install sqlalchemy psycopg2-binary")
    from sqlalchemy import create_engine

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent

# Load environment variables
load_dotenv(PROJECT_ROOT / ".env", override=True)
db_url = os.getenv("DATABASE_URL")

if not db_url:
    print("Error: DATABASE_URL not found in .env")
    sys.exit(1)

# Fix URL for SQLAlchemy
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(db_url)

def upload_csv_to_table(filepath: Path, table_name: str):
    if not filepath.exists():
        print(f"Warning: File not found {filepath}")
        return
        
    print(f"Uploading {filepath.name} to table '{table_name}'...")
    try:
        # read_csv forces OneDrive to hydrate the file (might take a moment)
        df = pd.read_csv(filepath)
        df.to_sql(table_name, engine, if_exists='replace', index=False)
        print(f"✅ Success: {len(df)} rows uploaded to {table_name}.")
    except Exception as e:
        print(f"❌ Failed to upload {filepath.name}: {e}")

def main():
    print("=" * 60)
    print("SUPPLYMIND AI - UPLOAD DATASETS TO SUPABASE DATABASE")
    print("=" * 60)
    
    # 1. Upload Modeling files
    modeling_dir = PROJECT_ROOT / "Modeling"
    modeling_files = {
        "future_forecast.csv": "ml_future_forecast",
        "sales_enriched.csv": "ml_sales_enriched",
        "inventory_enriched.csv": "ml_inventory_enriched",
        "production_enriched.csv": "ml_production_enriched",
        "demand_compliance.csv": "ml_demand_compliance",
        "monthly_sales.csv": "ml_monthly_sales",
        "product_mat_cost.csv": "ml_product_mat_cost"
    }
    
    for filename, table in modeling_files.items():
        upload_csv_to_table(modeling_dir / filename, table)
        
    # 2. Upload Data files
    data_dir = PROJECT_ROOT / "data"
    data_files = {
        "inventory.csv": "data_inventory",
        "sales_daily.csv": "data_sales_daily",
        "products.csv": "data_products",
        "raw_materials.csv": "data_raw_materials",
        "bom.csv": "data_bom",
        "recommendations.csv": "data_recommendations",
        "demand_forecasts.csv": "data_demand_forecasts",
        "contracts.csv": "data_contracts",
        "production_schedule.csv": "data_production_schedule",
        "suppliers.csv": "data_suppliers"
    }
    
    for filename, table in data_files.items():
        upload_csv_to_table(data_dir / filename, table)
        
    print("=" * 60)
    print("✅ All CSV uploads completed.")
    print("Note: The ML model (.pkl file) is binary and remains on your filesystem.")

if __name__ == "__main__":
    main()
