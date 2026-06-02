import pandas as pd
from pathlib import Path

data_dir = Path("data")
enriched_dir = data_dir / "enriched data"

datasets = {
    "Raw": [
        "products.csv", "sales_daily.csv", "inventory.csv",
        "suppliers.csv", "contracts.csv", "production_schedule.csv",
        "raw_materials.csv", "bom.csv"
    ],
    "Enriched": [
        "sales_enriched.csv", "inventory_enriched.csv", "production_enriched.csv",
        "monthly_sales.csv", "demand_compliance.csv", "product_mat_cost.csv"
    ]
}

for category, files in datasets.items():
    print(f"\n{'='*80}")
    print(f"  {category} DATASETS")
    print(f"{'='*80}")
    
    for f in files:
        if category == "Raw":
            path = data_dir / f
        else:
            path = enriched_dir / f
        
        if not path.exists():
            print(f"\n  *** {f}: FILE NOT FOUND ***")
            continue
        
        df = pd.read_csv(path)
        print(f"\n  --- {f} ---")
        print(f"  Rows: {len(df)}")
        print(f"  Columns: {len(df.columns)} -> {list(df.columns)}")
        print(f"  Duplicates: {df.duplicated().sum()}")
        
        nulls = df.isnull().sum()
        has_nulls = nulls[nulls > 0]
        if len(has_nulls) > 0:
            print(f"  Missing values:")
            for col, count in has_nulls.items():
                print(f"    - {col}: {count} ({count/len(df)*100:.1f}%)")
        else:
            print(f"  Missing values: None")
        
        print(f"  Dtypes: {dict(df.dtypes)}")

print(f"\n{'='*80}")
print(f"  AUDIT COMPLETE")
print(f"{'='*80}")
