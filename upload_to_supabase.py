import os
import sys
from pathlib import Path

# Install supabase client if needed
try:
    from supabase import create_client, Client
except ImportError:
    print("Installing supabase python client...")
    os.system(f"{sys.executable} -m pip install supabase")
    from supabase import create_client, Client

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent

# Load environment variables
load_dotenv(PROJECT_ROOT / ".env", override=True)

SUPABASE_URL = os.getenv("VITE_API_URL", "").replace("/api/v1", "")
# Extract from postgres URL if needed
db_url = os.getenv("DATABASE_URL", "")
if "supabase.co" in db_url:
    project_ref = db_url.split("@")[1].split(".")[0]
    SUPABASE_URL = f"https://{project_ref}.supabase.co"

SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase URL or Key. Please check your .env file.")
    print("Ensure you have SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY defined.")
    
    # Try to extract anon key from clerk publishable key if it's there (often not)
    # Just ask user to set it
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
bucket_name = "supplymind-assets"

def create_bucket_if_not_exists():
    try:
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        if bucket_name not in bucket_names:
            print(f"Creating bucket '{bucket_name}'...")
            supabase.storage.create_bucket(bucket_name, options={"public": True})
        else:
            print(f"Bucket '{bucket_name}' already exists.")
    except Exception as e:
        print(f"Error checking/creating bucket: {e}")
        print("Will try to upload anyway (bucket might exist).")

def upload_file(local_path: Path, remote_path: str):
    if not local_path.exists():
        print(f"Warning: File not found {local_path}")
        return
    
    print(f"Uploading {local_path.name} to {remote_path}...")
    try:
        # Force a read into bytes to hydrate OneDrive file
        with open(local_path, "rb") as f:
            data = f.read()
        
        # Upload
        supabase.storage.from_(bucket_name).upload(
            file=data,
            path=remote_path,
            file_options={"upsert": "true"}
        )
        print(f"✅ Success: {local_path.name}")
    except Exception as e:
        print(f"❌ Failed to upload {local_path.name}: {e}")

def main():
    print("=" * 60)
    print("SUPPLYMIND AI - UPLOAD DATASETS TO SUPABASE")
    print("=" * 60)
    
    create_bucket_if_not_exists()
    
    # 1. Upload Modeling files
    modeling_dir = PROJECT_ROOT / "Modeling"
    modeling_files = [
        "demand_model_pipeline.pkl",
        "future_forecast.csv",
        "sales_enriched.csv",
        "inventory_enriched.csv",
        "production_enriched.csv",
        "demand_compliance.csv",
        "monthly_sales.csv",
        "product_mat_cost.csv"
    ]
    
    for filename in modeling_files:
        upload_file(modeling_dir / filename, f"Modeling/{filename}")
        
    # 2. Upload Data files
    data_dir = PROJECT_ROOT / "data"
    data_files = [
        "inventory.csv",
        "sales_daily.csv",
        "products.csv",
        "raw_materials.csv",
        "bom.csv",
        "recommendations.csv",
        "demand_forecasts.csv",
        "contracts.csv",
        "production_schedule.csv",
        "suppliers.csv"
    ]
    
    for filename in data_files:
        upload_file(data_dir / filename, f"data/{filename}")
        
    print("=" * 60)
    print("✅ All uploads completed.")
    print("The backend will now download these files at startup to bypass OneDrive.")

if __name__ == "__main__":
    main()
