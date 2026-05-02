# 📈 Demand Forecasting & Supply Chain Analytics Pipeline

A high-accuracy demand forecasting system built with **XGBoost (R² = 0.9984, WAPE = 1.51%)**. Automates supply chain analytics from raw data to actionable 15-feature forecasts with **confidence levels**.

## 🎯 Output Features (15 Total)
Every forecast includes confidence metrics and comprehensive supply chain insights:

**Core Predictions:**
1.  **Predicted Demand** — Monthly forecast quantity
2.  **Confidence Level** — Model certainty 0-100% (accounts for data completeness & forecast horizon)

**Trend & Risk:**
3.  **Demand Trend** — Increasing / Stable / Decreasing
4.  **Stock Risk Level** — Low / Medium / High
5.  **Delay Risk** — Low / Medium / High

**Inventory & Operations:**
6.  **Current Stock** — Latest inventory snapshot
7.  **Recommended Order Quantity** — Safety stock + demand buffer
8.  **Lead Time Days** — Supplier delivery timeline
9.  **Avg Delay** — Historical delay in days

**Business Metrics:**
10. **Supplier Score** — 0-100 performance rating
11. **Best Supplier** — Top supplier by revenue & reliability
12. **Profit Margin** — Product margin %
13. **Revenue Forecast** — Predicted revenue = demand × price
14. **product_id** — Product identifier
15. **period** — Forecast period (YYYY-MM)

## 🛠️ Installation & Quick Start

### 1. Install dependencies:
```bash
pip install -r requirements.txt
```

### 2. Train the model (first time only):
```bash
python demand_forecasting_pipeline.py
```
**Output:** 
- `demand_model_pipeline.pkl` (trained model)
- `future_forecast.csv` (next 3 months forecast)

### 3. Use the model in your code:
```python
from demand_forecasting_pipeline import ForecastModel

# Load pre-trained model (fast, ~5 seconds)
model = ForecastModel.load()

# Predict single product
df = model.predict("BL_KIT", n_months=3)
print(df[["period", "predicted_demand", "confidence_level"]])

# Predict all products
df = model.predict_all(n_months=6)
```

## 🤖 Understanding Confidence Levels

The `confidence_level` (0-100) indicates prediction certainty:
- **90-100%** — High confidence (month 1-2, stable historical data)
- **70-90%** — Medium confidence (month 3-4, some uncertainty)
- **50-70%** — Lower confidence (month 5-6, further forecast horizon)

**Factors affecting confidence:**
- Data completeness (longer product history = higher confidence)
- Forecast horizon (closer predictions = higher confidence)
- Product volatility (stable demand = higher confidence)

## 📊 Model Performance (Test Set: Last 6 Months)

| Metric | Value | Interpretation |
|--------|-------|-----------------|
| **R-Squared** | 0.9984 | Explains 99.84% of demand variance |
| **WAPE** | 1.51% | Average error margin |
| **MAE** | 41.23 units | Average absolute error |
| **RMSE** | 53.07 units | Penalizes large errors |

✅ **Status:** Production-ready accuracy

## 📁 Project Structure
```
├── demand_forecasting_pipeline.py     # Main module (ForecastModel class)
├── demand_model_pipeline.pkl           # Trained XGBoost model (~15MB)
├── future_forecast.csv                 # Forecast output (15 columns, 3 months)
├── *.csv                               # Input datasets (sales, inventory, production, etc.)
├── requirements.txt                    # Python dependencies
└── README.md                           # This file
```

### What to keep locally (NOT on GitHub):
❌ **DO NOT commit:**
- `demand_model_pipeline.pkl` (~15MB) — Too large for GitHub
- `future_forecast.csv` (output) — Regenerate from code
- `__pycache__/` — Python cache
- `.pyc` files

### Deploy trained model:
**Option 1: Cloud Storage (Recommended)**
```bash
# Upload model to AWS S3, Google Cloud Storage, or Azure Blob
aws s3 cp demand_model_pipeline.pkl s3://your-bucket/models/

# In code:
from demand_forecasting_pipeline import ForecastModel
model = ForecastModel.load()  # Auto-loads from local cache or downloads
```

**Option 2: Docker Image**
```dockerfile
# Include trained model in Docker image
COPY demand_model_pipeline.pkl /app/
```

**Option 3: Model Registry**
Use MLflow, Hugging Face Model Hub, or similar services for versioning.

## 🚀 Getting Started After Cloning from GitHub

```bash
# 1. Clone repository
git clone <your-repo-url>
cd <repo-name>

# 2. Install dependencies
pip install -r requirements.txt

# 3. Train the model (creates demand_model_pipeline.pkl)
python demand_forecasting_pipeline.py

# 4. Use in your application
from demand_forecasting_pipeline import ForecastModel
model = ForecastModel.load()
forecast = model.predict_all(n_months=3)
```

**Note:** The trained model (`demand_model_pipeline.pkl`) is NOT in GitHub (file size & reproducibility). 
It's auto-generated when you run `python demand_forecasting_pipeline.py`. See `.gitignore` for details.
