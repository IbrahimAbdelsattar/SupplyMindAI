# -*- coding: utf-8 -*-
"""
=============================================================================
  DEMAND FORECASTING PIPELINE  —  Full Feature Extraction & Model
=============================================================================
Output features (per product, per time period):
  1.  predicted_demand
  2.  demand_trend            (increasing / stable / decreasing)
  3.  current_stock
  4.  stock_risk_level        (low / medium / high)
  5.  recommended_order_qty
  6.  supplier_score          (0-100)
  7.  best_supplier
  8.  lead_time_days
  9.  delay_risk              (low / medium / high)
  10. avg_delay
  11. profit_margin           (%)
  12. revenue_forecast
=============================================================================
"""

import os
import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# ─────────────────────────────────────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────────────────────────────────────
DATA_DIR        = os.path.dirname(os.path.abspath(__file__))

SALES_PATH      = os.path.join(DATA_DIR, "sales_enriched.csv")
INVENTORY_PATH  = os.path.join(DATA_DIR, "inventory_enriched.csv")
PRODUCTION_PATH = os.path.join(DATA_DIR, "production_enriched.csv")
COMPLIANCE_PATH = os.path.join(DATA_DIR, "demand_compliance.csv")
MONTHLY_PATH    = os.path.join(DATA_DIR, "monthly_sales.csv")
MAT_COST_PATH   = os.path.join(DATA_DIR, "product_mat_cost.csv")

MODEL_OUT       = os.path.join(DATA_DIR, "demand_model_pipeline.pkl")
FUTURE_OUT      = os.path.join(DATA_DIR, "future_forecast.csv")


# =============================================================================
# STEP 1 — LOAD ALL DATASETS
# =============================================================================
def load_all_data() -> dict:
    """Load every CSV and return a dict of raw DataFrames."""
    print("[1/6] Loading all datasets …")

    sales      = pd.read_csv(SALES_PATH,      parse_dates=["date"])
    inventory  = pd.read_csv(INVENTORY_PATH,  parse_dates=["date"])
    production = pd.read_csv(PRODUCTION_PATH, parse_dates=["date"])
    compliance = pd.read_csv(COMPLIANCE_PATH)
    monthly    = pd.read_csv(MONTHLY_PATH)
    mat_cost   = pd.read_csv(MAT_COST_PATH)

    for df in [compliance, monthly]:
        df["period"] = pd.to_datetime(df["ym"])

    print(f"   sales      : {sales.shape}")
    print(f"   inventory  : {inventory.shape}")
    print(f"   production : {production.shape}")
    print(f"   compliance : {compliance.shape}")
    print(f"   monthly    : {monthly.shape}")
    print(f"   mat_cost   : {mat_cost.shape}")

    return dict(
        sales=sales, inventory=inventory, production=production,
        compliance=compliance, monthly=monthly, mat_cost=mat_cost,
    )


# =============================================================================
# STEP 2 — BUILD MONTHLY BASE TABLE
# =============================================================================
def build_monthly_base(data: dict) -> pd.DataFrame:
    """Merge all sources into one monthly table per product."""
    print("[2/6] Building monthly base table …")

    monthly    = data["monthly"].copy()
    compliance = data["compliance"].copy()
    mat_cost   = data["mat_cost"].copy()

    # ── Monthly inventory snapshot (last day of each month) ─────────────────
    inv = data["inventory"].copy()
    inv["ym"] = inv["date"].dt.to_period("M").astype(str)
    inv_monthly = (
        inv.sort_values("date")
           .groupby(["ym", "product_id"])
           .agg(
               current_stock    = ("stock",            "last"),
               avg_daily_demand = ("avg_daily_demand",  "mean"),
               coverage_days    = ("coverage_days",     "mean"),
           )
           .reset_index()
    )

    # ── Monthly production stats ─────────────────────────────────────────────
    prod = data["production"].copy()
    prod["ym"] = prod["date"].dt.to_period("M").astype(str)
    prod_monthly = (
        prod.groupby(["ym", "product_id"])
            .agg(
                utilization_pct = ("utilization_pct", "mean"),
                efficiency_pct  = ("efficiency_pct",  "mean"),
                avg_delay_days  = ("delay",            "mean"),   # 0/1 daily flag
                delay_rate      = ("is_delayed",       "mean"),   # fraction of days delayed
                planned_total   = ("planned",          "sum"),
                actual_total    = ("actual",           "sum"),
            )
            .reset_index()
    )

    # ── Monthly sales extras (margin + best client) ──────────────────────────
    sales = data["sales"].copy()
    sales["ym"] = sales["date"].dt.to_period("M").astype(str)

    sales_extras = (
        sales.groupby(["ym", "product_id"])
             .agg(avg_margin_pct = ("margin_pct", "mean"))
             .reset_index()
    )

    best_supplier = (
        sales.groupby(["ym", "product_id", "client"])["revenue"]
             .sum().reset_index()
             .sort_values("revenue", ascending=False)
             .drop_duplicates(subset=["ym", "product_id"])
             .rename(columns={"client": "best_supplier"})
             [["ym", "product_id", "best_supplier"]]
    )

    # ── Material cost ─────────────────────────────────────────────────────────
    mat_cost = mat_cost.rename(columns={"total_material_cost": "unit_mat_cost"})

    # ── Merge (monthly already has avg_price & n_transactions) ───────────────
    base = monthly.copy()   # 660 rows; has: avg_price, n_transactions, monthly_qty …

    base = base.merge(
        compliance[["ym", "product_id", "compliance_pct"]],
        on=["ym", "product_id"], how="left"
    )
    base = base.merge(inv_monthly,  on=["ym", "product_id"], how="left")
    base = base.merge(prod_monthly, on=["ym", "product_id"], how="left")
    base = base.merge(sales_extras, on=["ym", "product_id"], how="left")
    base = base.merge(best_supplier, on=["ym", "product_id"], how="left")
    base = base.merge(mat_cost[["product_id", "unit_mat_cost"]],
                      on="product_id", how="left")

    base = base.sort_values(["product_id", "period"]).reset_index(drop=True)

    print(f"   Base table: {base.shape}  |  columns: {base.columns.tolist()}")
    return base


# =============================================================================
# STEP 3 — FEATURE ENGINEERING
# =============================================================================
def _rolling_slope(series: pd.Series, window: int = 3) -> pd.Series:
    """Rolling OLS slope over the last `window` observations."""
    vals    = series.values
    results = np.full(len(vals), np.nan)
    xs      = np.arange(window)
    for i in range(window - 1, len(vals)):
        y = vals[i - window + 1: i + 1]
        if not np.isnan(y).any():
            results[i] = np.polyfit(xs, y, 1)[0]
    return pd.Series(results, index=series.index)


def engineer_features(base: pd.DataFrame) -> pd.DataFrame:
    """Create all ML features + derived business output columns."""
    print("[3/6] Engineering features …")

    df = base.copy()

    # ── Time features ────────────────────────────────────────────────────────
    df["month"]     = df["period"].dt.month
    df["quarter"]   = df["period"].dt.quarter
    df["year"]      = df["period"].dt.year
    df["is_q4"]     = (df["quarter"] == 4).astype(int)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

    # ── Lag & rolling demand ──────────────────────────────────────────────────
    grp = df.groupby("product_id")["monthly_qty"]

    for lag in [1, 2, 3, 6, 12]:
        df[f"lag_{lag}"] = grp.shift(lag)

    df["rolling_mean_3"] = grp.shift(1).transform(lambda x: x.rolling(3,  min_periods=1).mean())
    df["rolling_mean_6"] = grp.shift(1).transform(lambda x: x.rolling(6,  min_periods=1).mean())
    df["rolling_std_3"]  = grp.shift(1).transform(lambda x: x.rolling(3,  min_periods=1).std().fillna(0))
    df["rolling_max_3"]  = grp.shift(1).transform(lambda x: x.rolling(3,  min_periods=1).max())
    df["rolling_min_3"]  = grp.shift(1).transform(lambda x: x.rolling(3,  min_periods=1).min())
    df["ewma_3"]         = grp.shift(1).transform(lambda x: x.ewm(span=3, min_periods=1).mean())
    df["ewma_6"]         = grp.shift(1).transform(lambda x: x.ewm(span=6, min_periods=1).mean())
    df["momentum"]       = df["ewma_3"] - df["ewma_6"]

    # Price lag (avg_price is already in monthly)
    df["price_lag_1"] = df.groupby("product_id")["avg_price"].shift(1)

    # ── Demand trend (slope of last 3 months) ────────────────────────────────
    df["demand_slope"] = (
        df.groupby("product_id")["monthly_qty"]
          .transform(lambda s: _rolling_slope(s, window=3))
    )

    def slope_label(v):
        if pd.isna(v):   return "stable"
        if v >  50:      return "increasing"
        if v < -50:      return "decreasing"
        return "stable"

    df["demand_trend"] = df["demand_slope"].map(slope_label)

    # ── Stock risk level ─────────────────────────────────────────────────────
    def cov_to_risk(d):
        if pd.isna(d) or d < 5:   return "high"
        if d < 10:                 return "medium"
        return "low"

    df["stock_risk_level"] = df["coverage_days"].map(cov_to_risk)

    # ── Delay risk ───────────────────────────────────────────────────────────
    def rate_to_risk(r):
        if pd.isna(r):  return "medium"
        if r > 0.70:    return "high"
        if r > 0.30:    return "medium"
        return "low"

    df["delay_risk"] = df["delay_rate"].map(rate_to_risk)

    # ── Supplier score (0–100) ───────────────────────────────────────────────
    # Compliance: clip raw % at 200 -> normalise to 0-100
    df["compliance_score"]  = df["compliance_pct"].clip(upper=200) / 2
    df["efficiency_score"]  = df["efficiency_pct"].fillna(95)
    df["reliability_score"] = (1 - df["delay_rate"].fillna(0.5)) * 100

    df["supplier_score"] = (
        0.40 * df["compliance_score"] +
        0.35 * df["efficiency_score"] +
        0.25 * df["reliability_score"]
    ).clip(0, 100).round(2)

    # ── Lead time days (base 7 days + production-delay contribution) ─────────
    # avg_delay_days here = average fraction of days delayed per month (0-1 scale)
    df["lead_time_days"] = (df["avg_delay_days"].fillna(0) * 30 + 7).round(1)

    # ── Profit margin ─────────────────────────────────────────────────────────
    df["profit_margin"] = df["avg_margin_pct"].fillna(
        df.groupby("product_id")["avg_margin_pct"].transform("median")
    ).round(2)

    # ── Forward-fill remaining numeric NaNs within each product ──────────────
    num_cols = df.select_dtypes(include=np.number).columns.tolist()
    df[num_cols] = (
        df.groupby("product_id")[num_cols]
          .transform(lambda x: x.ffill().bfill().fillna(x.median()))
    )

    print(f"   Features engineered. Shape: {df.shape}  |  columns: {len(df.columns)}")
    return df


# =============================================================================
# STEP 4 — TRAIN XGBoost MODEL
# =============================================================================
FEATURE_COLS = [
    # Time
    "month", "quarter", "year", "is_q4", "month_sin", "month_cos",
    # Demand lags
    "lag_1", "lag_2", "lag_3", "lag_6", "lag_12",
    # Rolling / EWMA
    "rolling_mean_3", "rolling_mean_6", "rolling_std_3",
    "rolling_max_3",  "rolling_min_3",
    "ewma_3", "ewma_6", "momentum",
    # Operations
    "utilization_pct", "efficiency_pct", "planned_total", "actual_total",
    # Inventory
    "current_stock", "avg_daily_demand", "coverage_days",
    # Business
    "compliance_pct", "supplier_score",
    "avg_price", "price_lag_1",
    "n_transactions", "unit_mat_cost",
]

TARGET = "monthly_qty"


def train_model(df: pd.DataFrame):
    """Time-series train/test split -> XGBoost -> evaluate -> save."""
    print("[4/6] Training XGBoost model …")

    df_model = df.dropna(subset=FEATURE_COLS + [TARGET]).copy()

    # Last 6 months = hold-out test set
    split_date = df_model["period"].max() - pd.DateOffset(months=6)
    train = df_model[df_model["period"] <= split_date]
    test  = df_model[df_model["period"] >  split_date]

    X_train, y_train = train[FEATURE_COLS], train[TARGET]
    X_test,  y_test  = test[FEATURE_COLS],  test[TARGET]

    print(f"   Train: {len(train)} rows | Test: {len(test)} rows")

    model = xgb.XGBRegressor(
        objective              = "reg:tweedie",
        tweedie_variance_power = 1.4,
        n_estimators           = 1500,
        learning_rate          = 0.02,
        max_depth              = 5,
        subsample              = 0.85,
        colsample_bytree       = 0.85,
        reg_alpha              = 5,
        reg_lambda             = 1,
        min_child_weight       = 3,
        early_stopping_rounds  = 100,   # XGBoost 3.x: set on constructor
        random_state           = 42,
        n_jobs                 = -1,
    )

    model.fit(
        X_train, y_train,
        eval_set = [(X_test, y_test)],
        verbose  = False,
    )

    # ── Metrics ──────────────────────────────────────────────────────────────
    preds = np.maximum(0, model.predict(X_test))
    mae   = mean_absolute_error(y_test, preds)
    rmse  = np.sqrt(mean_squared_error(y_test, preds))
    r2    = r2_score(y_test, preds)
    wape  = np.sum(np.abs(y_test - preds)) / np.sum(y_test)

    print("\n" + "="*48)
    print("  MODEL EVALUATION  (last-6-months hold-out)")
    print("="*48)
    print(f"  MAE   (avg units error)  : {mae:>10.2f}")
    print(f"  RMSE  (spike penalty)    : {rmse:>10.2f}")
    print(f"  WAPE  (accuracy index)   : {wape:>10.2%}")
    print(f"  R²    (explained var.)   : {r2:>10.4f}")
    print("="*48)

    joblib.dump(model, MODEL_OUT)
    print(f"\n  Model saved -> {MODEL_OUT}\n")

    # Store model metrics for confidence calculation
    model.mae_  = mae
    model.rmse_ = rmse
    
    return model


# =============================================================================
# STEP 5 — FUTURE FORECAST (next N months per product)
# =============================================================================
def forecast_future(df: pd.DataFrame, model, n_months: int = 3) -> pd.DataFrame:
    """
    Iteratively predict next n_months for every product.
    Each predicted value feeds the next period's lag features.
    Returns 12 features + confidence_level for certainty.
    """
    print(f"[5/5] Rolling forecast: next {n_months} months per product …")

    all_future = []

    for pid in sorted(df["product_id"].unique()):
        hist = df[df["product_id"] == pid].sort_values("period").copy()
        if len(hist) < 3:
            continue

        qty_hist  = hist["monthly_qty"].tolist()
        last_row  = hist.iloc[-1]
        last_per  = last_row["period"]

        # Data completeness score (more historical data = higher confidence)
        data_completeness = min(len(hist) / 24, 1.0)  # 24 months = full confidence

        # Carry-forward static / slowly-changing features
        avg_price     = last_row["avg_price"]
        current_stock = last_row["current_stock"]
        util          = last_row["utilization_pct"]
        eff           = last_row["efficiency_pct"]
        compliance    = last_row["compliance_pct"]
        sup_score     = last_row["supplier_score"]
        best_sup      = last_row["best_supplier"]
        lead_time     = last_row["lead_time_days"]
        delay_risk    = last_row["delay_risk"]
        avg_delay     = last_row["avg_delay_days"]
        margin        = last_row["profit_margin"]
        n_trans       = last_row["n_transactions"]
        unit_mat      = last_row["unit_mat_cost"]
        planned       = last_row["planned_total"]
        actual_t      = last_row["actual_total"]
        avg_dd        = last_row["avg_daily_demand"]
        cov_days      = last_row["coverage_days"]
        p_lag1_price  = last_row["avg_price"]      # price lag approximation

        for step in range(1, n_months + 1):
            fp = last_per + pd.DateOffset(months=step)
            m  = fp.month
            q  = (m - 1) // 3 + 1
            yr = fp.year

            n = len(qty_hist)
            lag1  = qty_hist[-1]
            lag2  = qty_hist[-2]  if n >= 2  else lag1
            lag3  = qty_hist[-3]  if n >= 3  else lag1
            lag6  = qty_hist[-6]  if n >= 6  else lag1
            lag12 = qty_hist[-12] if n >= 12 else lag1

            rm3  = np.mean(qty_hist[-3:])
            rm6  = np.mean(qty_hist[-6:])
            rs3  = float(np.std(qty_hist[-3:])) if n >= 3 else 0.0
            rmax = float(np.max(qty_hist[-3:]))
            rmin = float(np.min(qty_hist[-3:]))

            a3    = 2 / (3 + 1)
            a6    = 2 / (6 + 1)
            ewma3 = lag1 * a3 + lag2 * (1 - a3)
            ewma6 = lag1 * a6 + lag2 * (1 - a6)
            mom   = ewma3 - ewma6

            row = [[
                m, q, yr, int(q == 4),
                np.sin(2 * np.pi * m / 12),
                np.cos(2 * np.pi * m / 12),
                lag1, lag2, lag3, lag6, lag12,
                rm3, rm6, rs3, rmax, rmin,
                ewma3, ewma6, mom,
                util, eff, planned, actual_t,
                current_stock, avg_dd, cov_days,
                compliance, sup_score,
                avg_price, p_lag1_price,
                n_trans, unit_mat,
            ]]

            pred = max(0, round(float(model.predict(row)[0])))
            qty_hist.append(pred)

            # Demand trend from the last 3 predicted values
            recent = qty_hist[-3:]
            slope  = np.polyfit(range(len(recent)), recent, 1)[0] if len(recent) == 3 else 0
            trend  = ("increasing" if slope > 50 else
                      ("decreasing" if slope < -50 else "stable"))

            # Confidence Level (0-100): Based on data completeness and forecast horizon
            # Closer predictions = higher confidence; further out = lower confidence
            horizon_penalty = 0.05 * step  # -5% per month into future
            confidence_level = round(
                (data_completeness * 100) * (1 - horizon_penalty), 1
            )
            confidence_level = max(50, min(100, confidence_level))  # Clamp between 50-100

            safety   = rs3 * 1.65
            reorder  = max(0, round(pred + safety - current_stock))
            rev_fc   = round(pred * avg_price, 2)

            all_future.append({
                "product_id"            : pid,
                "period"                : fp.strftime("%Y-%m"),
                "predicted_demand"      : pred,
                "confidence_level"      : confidence_level,
                "demand_trend"          : trend,
                "current_stock"         : int(current_stock),
                "stock_risk_level"      : ("high"   if cov_days < 5  else
                                           ("medium" if cov_days < 10 else "low")),
                "recommended_order_qty" : reorder,
                "supplier_score"        : round(sup_score, 2),
                "best_supplier"         : best_sup,
                "lead_time_days"        : round(lead_time, 1),
                "delay_risk"            : delay_risk,
                "avg_delay"             : round(avg_delay * 30, 2),  # convert to days
                "profit_margin"         : round(margin, 2),
                "revenue_forecast"      : rev_fc,
            })

    future_df = pd.DataFrame(all_future)
    future_df.to_csv(FUTURE_OUT, index=False)
    print(f"   Saved -> {FUTURE_OUT}  |  shape: {future_df.shape}")
    return future_df


# =============================================================================
# ForecastModel — the model AND all 12 features come out together
# =============================================================================
class ForecastModel:
    """
    A self-contained forecasting model object.
    Train once, then call .predict() to get ALL 12 features + confidence_level.

    ── USAGE EXAMPLES ─────────────────────────────────────────────────────

    Option A: Load pre-trained model
    --------------------------------
        from demand_forecasting_pipeline import ForecastModel

        model = ForecastModel.load()         # fast, no retraining
        result = model.predict("BL_KIT", n_months=3)
        print(result)

    Option B: Train from scratch
    ---------------------------
        from demand_forecasting_pipeline import ForecastModel

        model = ForecastModel()
        model.fit()                          # trains & auto-saves
        result = model.predict_all(n_months=6)
        print(result)

    ── OUTPUT COLUMNS (15 total) ──────────────────────────────────────────
        1. product_id
        2. period
        3. predicted_demand
        4. confidence_level        (0-100: certainty of prediction)
        5. demand_trend            (increasing/stable/decreasing)
        6. current_stock
        7. stock_risk_level        (low/medium/high)
        8. recommended_order_qty
        9. supplier_score          (0-100)
        10. best_supplier
        11. lead_time_days
        12. delay_risk             (low/medium/high)
        13. avg_delay
        14. profit_margin
        15. revenue_forecast
    """

    def __init__(self):
        self._model    = None   # XGBoost model
        self._df       = None   # full engineered feature table
        self._is_ready = False

    # ── TRAIN ────────────────────────────────────────────────────────────────
    def fit(self) -> "ForecastModel":
        """
        Run the full pipeline: load data -> engineer features -> train model.
        Saves model to disk automatically.
        """
        data        = load_all_data()
        base        = build_monthly_base(data)
        self._df    = engineer_features(base)
        self._model = train_model(self._df)
        self._is_ready  = True
        print("  ForecastModel is ready.")
        return self

    # ── LOAD (skip retraining) ────────────────────────────────────────────────
    @classmethod
    def load(cls) -> "ForecastModel":
        """
        Load a previously trained model from disk.
        Data is re-built from CSVs (fast — no training needed).
        """
        obj = cls()
        obj._model = joblib.load(MODEL_OUT)
        print("  Model loaded from disk.")

        data     = load_all_data()
        base     = build_monthly_base(data)
        obj._df  = engineer_features(base)
        obj._is_ready = True
        print("  Feature table rebuilt. ForecastModel is ready.")
        return obj

    # ── PREDICT — single product ──────────────────────────────────────────────
    def predict(self, product_id: str, n_months: int = 3) -> pd.DataFrame:
        """
        Predict demand for ONE product and return 12 features + confidence_level.

        Parameters
        ----------
        product_id : str   e.g. "BL_KIT", "AF_5", "FAN_STD"
        n_months   : int   how many future months to forecast (default 3)

        Returns
        -------
        pd.DataFrame with 15 columns:
            product_id, period, predicted_demand, confidence_level,
            demand_trend, current_stock, stock_risk_level,
            recommended_order_qty, supplier_score, best_supplier,
            lead_time_days, delay_risk, avg_delay, profit_margin,
            revenue_forecast
        """
        self._check_ready()
        subset = self._df[self._df["product_id"] == product_id].copy()
        if subset.empty:
            available = sorted(self._df["product_id"].unique().tolist())
            raise ValueError(
                f"Product '{product_id}' not found.\n"
                f"Available products: {available}"
            )
        return forecast_future(subset, self._model, n_months=n_months)

    # ── PREDICT — all products ────────────────────────────────────────────────
    def predict_all(self, n_months: int = 3) -> pd.DataFrame:
        """
        Predict demand for ALL products and return 12 features + confidence_level.

        Parameters
        ----------
        n_months : int   how many future months to forecast (default 3)

        Returns
        -------
        pd.DataFrame  — same 15 columns as .predict(), stacked for all products
        """
        self._check_ready()
        return forecast_future(self._df.copy(), self._model, n_months=n_months)

    # ── INTERNAL ──────────────────────────────────────────────────────────────
    def _check_ready(self):
        if not self._is_ready:
            raise RuntimeError(
                "Model is not ready. Call .fit() or ForecastModel.load() first."
            )

# =============================================================================
# MAIN — Train model and save
# =============================================================================
if __name__ == "__main__":
    print("\n" + "="*55)
    print("  DEMAND FORECASTING PIPELINE — TRAINING")
    print("="*55 + "\n")

    # Train and save the model
    model = ForecastModel()
    model.fit()

    # Generate future forecast for next 3 months
    future_forecast = model.predict_all(n_months=3)

    print("\n" + "="*55)
    print("  TRAINING COMPLETE")
    print("="*55)
    print(f"\n  Output files:")
    print(f"   - future_forecast.csv        : next 3 months per product (15 features)")
    print(f"   - demand_model_pipeline.pkl  : trained XGBoost model\n")

    print("  USAGE:")
    print("  ------")
    print("""
  from demand_forecasting_pipeline import ForecastModel

  # Load trained model
  model = ForecastModel.load()

  # Predict for one product (3 months)
  result = model.predict("BL_KIT", n_months=3)
  print(result)

  # Predict for all products (6 months)
  result = model.predict_all(n_months=6)
  print(result)
""")

