#!/usr/bin/env python3
"""
SupplyMind AI - Power BI Data Export Utility
This script loads, formats, and exports all CSV warehouse tables, enriched datasets,
and SQL database tables into a single unified directory ('data/powerbi_export/') 
optimized for Power BI import.
"""

import os
import sqlite3
import pandas as pd
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
ENRICHED_DATA_DIR = DATA_DIR / "enriched data"
DB_PATH = PROJECT_ROOT / "backend" / "data" / "supplymind_dev.db"
EXPORT_DIR = DATA_DIR / "powerbi_export"

def setup_directories():
    print(f"Creating export directory: {EXPORT_DIR}")
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

def export_csv_file(name, source_path):
    if not source_path.exists():
        print(f"Warning: Source file not found: {source_path}")
        return False
    
    print(f"Processing and exporting {name}...")
    try:
        # Load data
        df = pd.read_csv(source_path)
        
        # Standardize dates if columns exist
        for col in df.columns:
            if "date" in col.lower() or col.lower() in ["start", "end"]:
                try:
                    df[col] = pd.to_datetime(df[col]).dt.strftime("%Y-%m-%d")
                except Exception:
                    pass
        
        # Save to export folder
        target_path = EXPORT_DIR / name
        df.to_csv(target_path, index=False)
        print(f"Successfully exported: {target_path} ({len(df)} rows)")
        return True
    except Exception as e:
        print(f"Error exporting {name}: {e}")
        return False

def export_db_table():
    print("Connecting to SQLite database to export forecast_results...")
    if not DB_PATH.exists():
        print(f"SQLite database not found at: {DB_PATH}. Creating an empty mock forecast table...")
        # Create a mock dataframe if DB doesn't exist
        mock_forecasts = pd.DataFrame([
            {"product_id": "FAN_STD", "period": "2026-06", "predicted_demand": 1200, "confidence_level": 88.0, "demand_trend": "increasing", "current_stock": 850, "stock_risk_level": "low", "recommended_order_qty": 600, "supplier_score": 89.0, "best_supplier": "Apex Logistics", "lead_time_days": 10.0, "delay_risk": "low", "avg_delay": 0.5, "profit_margin": 0.35, "revenue_forecast": 42000.0},
            {"product_id": "FAN_STD", "period": "2026-07", "predicted_demand": 1450, "confidence_level": 91.0, "demand_trend": "increasing", "current_stock": 850, "stock_risk_level": "medium", "recommended_order_qty": 900, "supplier_score": 89.0, "best_supplier": "Apex Logistics", "lead_time_days": 10.0, "delay_risk": "low", "avg_delay": 0.5, "profit_margin": 0.35, "revenue_forecast": 50750.0},
            {"product_id": "BL_KIT", "period": "2026-06", "predicted_demand": 850, "confidence_level": 82.0, "demand_trend": "stable", "current_stock": 450, "stock_risk_level": "medium", "recommended_order_qty": 500, "supplier_score": 81.0, "best_supplier": "Global Logistics", "lead_time_days": 14.0, "delay_risk": "medium", "avg_delay": 1.8, "profit_margin": 0.40, "revenue_forecast": 34000.0}
        ])
        mock_forecasts.to_csv(EXPORT_DIR / "forecast_results.csv", index=False)
        print(f"Mock forecast table written to {EXPORT_DIR / 'forecast_results.csv'}")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        # Check if table exists
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='forecast_results'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            print("Table 'forecast_results' does not exist in SQLite DB. Exporting empty template...")
            df = pd.DataFrame(columns=[
                "id", "product_id", "period", "predicted_demand", "confidence_level", 
                "demand_trend", "current_stock", "stock_risk_level", "recommended_order_qty",
                "supplier_score", "best_supplier", "lead_time_days", "delay_risk", "avg_delay",
                "profit_margin", "revenue_forecast", "created_at"
            ])
        else:
            df = pd.read_sql_query("SELECT * FROM forecast_results", conn)
            # Add formatted date for mapping periods (first day of the month for Power BI compatibility)
            if "period" in df.columns:
                df["forecast_date"] = pd.to_datetime(df["period"] + "-01").dt.strftime("%Y-%m-%d")
        
        target_path = EXPORT_DIR / "forecast_results.csv"
        df.to_csv(target_path, index=False)
        print(f"Successfully exported SQL table: {target_path} ({len(df)} rows)")
        conn.close()
    except Exception as e:
        print(f"Error reading database forecast_results: {e}")

def generate_date_dimension():
    """Generates a complete Calendar/Date dimension for robust Power BI time intelligence."""
    print("Generating Calendar Date Dimension...")
    start_date = "2020-01-01"
    end_date = "2026-12-31"
    
    dates = pd.date_range(start=start_date, end=end_date, freq="D")
    df_date = pd.DataFrame({
        "Date": dates.strftime("%Y-%m-%d"),
        "Year": dates.year,
        "Quarter": "Q" + dates.quarter.astype(str),
        "Month": dates.month,
        "MonthName": dates.strftime("%B"),
        "MonthShort": dates.strftime("%b"),
        "Week": dates.isocalendar().week,
        "DayOfWeek": dates.dayofweek,
        "DayName": dates.strftime("%A"),
        "IsWeekend": dates.dayofweek.isin([5, 6]).astype(int)
    })
    
    target_path = EXPORT_DIR / "calendar.csv"
    df_date.to_csv(target_path, index=False)
    print(f"Calendar table generated: {target_path} ({len(df_date)} rows)")

def main():
    setup_directories()
    
    # 1. Export CSV data warehouse files
    csv_files = {
        "products.csv": DATA_DIR / "products.csv",
        "sales_daily.csv": DATA_DIR / "sales_daily.csv",
        "inventory.csv": DATA_DIR / "inventory.csv",
        "suppliers.csv": DATA_DIR / "suppliers.csv",
        "contracts.csv": DATA_DIR / "contracts.csv",
        "production_schedule.csv": DATA_DIR / "production_schedule.csv",
        "bom.csv": DATA_DIR / "bom.csv",
        "raw_materials.csv": DATA_DIR / "raw_materials.csv",
        # Enriched datasets
        "sales_enriched.csv": ENRICHED_DATA_DIR / "sales_enriched.csv",
        "inventory_enriched.csv": ENRICHED_DATA_DIR / "inventory_enriched.csv",
        "production_enriched.csv": ENRICHED_DATA_DIR / "production_enriched.csv",
        "monthly_sales.csv": ENRICHED_DATA_DIR / "monthly_sales.csv",
        "demand_compliance.csv": ENRICHED_DATA_DIR / "demand_compliance.csv",
        "product_mat_cost.csv": ENRICHED_DATA_DIR / "product_mat_cost.csv"
    }
    
    for name, path in csv_files.items():
        export_csv_file(name, path)
        
    # 2. Export database-based tables
    export_db_table()
    
    # 3. Export custom calendar dimension
    generate_date_dimension()
    
    print("\n" + "="*50)
    print("Export Complete! All files are in 'data/powerbi_export/'")
    print("Open Power BI Desktop and choose 'Folder' or 'CSV' connection to these files.")
    print("="*50)

if __name__ == "__main__":
    main()
