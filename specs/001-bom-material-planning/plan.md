# Implementation plan

## Forecast and material data

Use FastAPI, the existing forecast adapter, and the CSV-backed BOM and catalog. Share online monthly forecast generation between Forecasting and BOM. For the trained model, project through any gap between the historical cutoff and the live planning horizon. Leave historical and offline forecast entry points available.

Store confirmed raw counts in SQLite or PostgreSQL through SQLAlchemy. The material ID is the key, with a nonnegative whole-unit count and a timestamp. Inventory viewers can read and inventory managers can replace counts. Use an atomic upsert so retries and concurrent requests cannot create duplicate balances.

## API and interface

- `GET /api/v1/inventory/raw-materials` returns catalog materials with nullable on-hand counts and update timestamps.
- `PUT /api/v1/inventory/raw-materials/{material_id}` replaces an on-hand count.
- `GET /api/v1/inventory/material-plan` accepts `product_id` and `horizon_days` of 30, 90, or 180. It returns the monthly forecast and per-material requirements, stock, purchase gaps, and balances.
- Add a protected BOM page and a raw-material view within Inventory. Carry the product and horizon between Forecasting, BOM, and raw-material inventory.
- Verify calculations against the repository BOM, authenticated inventory updates, calendar boundaries, and the UI in both themes with reduced motion.
