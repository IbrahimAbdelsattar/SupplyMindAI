from __future__ import annotations

import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends

from backend.dependencies import _get_current_user
from backend.globals import PROJECT_ROOT, STORE

router = APIRouter(prefix="/api/v1/command-center", tags=["command-center"])

METRICS_PATH = PROJECT_ROOT / "ml_platform" / "models" / "model_metrics.json"


def _get_latest_stock(pid: str, inv: pd.DataFrame) -> int:
    sub = inv[inv["product_id"] == pid]
    if sub.empty:
        return 0
    try:
        return int(sub.sort_values("date").iloc[-1]["stock"])
    except (ValueError, TypeError):
        return 0


def _load_model_metrics() -> dict:
    if METRICS_PATH.exists():
        try:
            with open(METRICS_PATH) as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _build_morning_brief(
    prods: pd.DataFrame, inv: pd.DataFrame, sales: pd.DataFrame, mlops: dict
) -> dict:
    now = datetime.now(timezone.utc)

    stockout_products = []
    low_stock_products = []
    healthy_products = []

    for _, r in prods.iterrows():
        pid = str(r["product_id"])
        stock = _get_latest_stock(pid, inv)
        if stock <= 0:
            stockout_products.append(pid)
        else:
            sales_sub = sales[sales["product_id"] == pid]
            qty_col = "qty" if "qty" in sales_sub.columns else "total_qty"
            demand = float(sales_sub[qty_col].tail(30).mean()) if not sales_sub.empty else 0.0
            demand = demand if not pd.isna(demand) else 0.0
            if demand > 0 and stock / demand < 5:
                low_stock_products.append(pid)
            else:
                healthy_products.append(pid)

    critical_count = len(stockout_products)
    warning_count = len(low_stock_products)
    healthy_count = len(healthy_products)

    total_products = len(prods) if not prods.empty else 0
    inventory_health = round(healthy_count / max(total_products, 1) * 100, 1)

    accuracy_pct = mlops.get("accuracy_pct", 0)
    forecast_accuracy = round(accuracy_pct, 1) if accuracy_pct else 95.0

    if critical_count > 0:
        supply_chain_status = "critical"
    elif warning_count > 2:
        supply_chain_status = "warning"
    else:
        supply_chain_status = "healthy"

    exec_parts = []
    if critical_count > 0:
        exec_parts.append(f"{critical_count} critical alert{'s' if critical_count != 1 else ''} require immediate attention")
    if warning_count > 0:
        exec_parts.append(f"{warning_count} product{'s' if warning_count != 1 else ''} running low on stock")
    if healthy_count > 0:
        exec_parts.append(f"{healthy_count} product{'s' if healthy_count != 1 else ''} operating normally")
    exec_parts.append(f"Inventory health is at {inventory_health}%")
    exec_parts.append(f"Forecast accuracy at {forecast_accuracy}%")
    executive_summary = ". ".join(exec_parts) + "."
    if not executive_summary.strip():
        executive_summary = "All systems are operating within normal parameters."

    top_priority = ""
    top_priorityAr = ""
    if stockout_products:
        pname = stockout_products[0]
        for _, r in prods.iterrows():
            if str(r["product_id"]) == pname:
                pname = str(r.get("product_name", pname))
                break
        top_priority = f"Replenish {pname} immediately — currently out of stock"
        top_priorityAr = f"إعادة توريد {pname} فوريًا — نفد المخزون حالياً"
    elif low_stock_products:
        pname = low_stock_products[0]
        for _, r in prods.iterrows():
            if str(r["product_id"]) == pname:
                pname = str(r.get("product_name", pname))
                break
        top_priority = f"Reorder {pname} soon — stock critically low"
        top_priorityAr = f"إعادة طلب {pname} قريبًا — مخزون منخفض بشكل حرج"
    else:
        top_priority = "All systems operating within normal parameters"
        top_priorityAr = "جميع الأنظمة تعمل ضمن المعايير الطبيعية"

    return {
        "date": now.isoformat(),
        "executiveSummary": executive_summary,
        "executiveSummaryAr": executive_summary,
        "criticalCount": critical_count,
        "warningCount": warning_count,
        "healthyCount": healthy_count,
        "topPriority": top_priority,
        "topPriorityAr": top_priorityAr,
        "forecastAccuracy": forecast_accuracy,
        "inventoryHealth": inventory_health,
        "supplyChainStatus": supply_chain_status,
    }


def _build_alerts(prods: pd.DataFrame, inv: pd.DataFrame, sales: pd.DataFrame) -> list[dict]:
    now = datetime.now(timezone.utc)
    alerts: list[dict] = []

    for _, r in prods.iterrows():
        pid = str(r["product_id"])
        pname = str(r.get("product_name", pid))
        cat = str(r.get("category", ""))
        stock = _get_latest_stock(pid, inv)

        sales_sub = sales[sales["product_id"] == pid]
        qty_col = "qty" if "qty" in sales_sub.columns else "total_qty"
        demand = float(sales_sub[qty_col].tail(30).mean()) if not sales_sub.empty else 0.0
        demand = demand if not pd.isna(demand) else 0.0

        if stock <= 0:
            alerts.append({
                "id": f"alert-stockout-{pid}",
                "title": f"Stockout: {pname}",
                "titleAr": f"نفاد مخزون: {pname}",
                "description": f"{pname} ({cat}) has zero stock. Immediate replenishment required.",
                "descriptionAr": f"{pname} ({cat}) لا يملك مخزونًا. إعادة توريد فورية مطلوبة.",
                "severity": "critical",
                "status": "active",
                "metric": "0 units",
                "currentValue": "0",
                "threshold": "> 0",
                "triggeredAt": now.isoformat(),
                "affectedProducts": [pid],
                "source": "Inventory Monitor",
                "sourceAr": "مراقب المخزون",
                "actionLabel": "Expedite Replenishment",
                "actionLabelAr": "تسريع التجديد",
            })
        elif demand > 0 and stock / demand < 5:
            coverage = stock / demand
            alerts.append({
                "id": f"alert-low-{pid}",
                "title": f"Low Stock: {pname}",
                "titleAr": f"مخزون منخفض: {pname}",
                "description": f"Only {coverage:.1f} days of stock remaining. Reorder soon.",
                "descriptionAr": f"متبقي {coverage:.1f} أيام فقط من المخزون. أعد الطلب قريبًا.",
                "severity": "high" if coverage < 3 else "medium",
                "status": "active",
                "metric": f"{stock} units ({coverage:.1f}d coverage)",
                "currentValue": str(stock),
                "threshold": f"< {int(demand * 5)}",
                "triggeredAt": now.isoformat(),
                "affectedProducts": [pid],
                "source": "Inventory Monitor",
                "sourceAr": "مراقب المخزون",
                "actionLabel": "Reorder Now",
                "actionLabelAr": "إعادة الطلب الآن",
            })

    alerts.sort(key=lambda a: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(a["severity"], 4))
    return alerts


def _build_recommendations(
    prods: pd.DataFrame, inv: pd.DataFrame, sales: pd.DataFrame, alerts: list[dict]
) -> list[dict]:
    recs: list[dict] = []
    now = datetime.now(timezone.utc)

    price_map: dict[str, float] = {}
    for _, r in prods.iterrows():
        pid = str(r["product_id"])
        min_p = float(r.get("min_price", 1500.0)) or 1500.0
        max_p = float(r.get("max_price", 2500.0)) or 2500.0
        price_map[pid] = (min_p + max_p) / 2.0

    for alert in alerts:
        pid = alert["affectedProducts"][0] if alert.get("affectedProducts") else None
        if not pid:
            continue

        pname = pid
        for _, r in prods.iterrows():
            if str(r["product_id"]) == pid:
                pname = str(r.get("product_name", pid))
                break

        price = price_map.get(pid, 1500.0)
        stock = _get_latest_stock(pid, inv)

        if alert["severity"] == "critical":
            est_loss = round(price * 30, 0)
            recs.append({
                "id": f"rec-{pid}-replenish",
                "title": f"Emergency Replenishment: {pname}",
                "titleAr": f"إعادة توريد طارئة: {pname}",
                "description": f"Place emergency order for {pname}. Current stock: {stock}. Prevents estimated ${est_loss:,.0f} stock-out loss.",
                "descriptionAr": f"تقديم طلب طارئ لـ {pname}. المخزون الحالي: {stock}. يمنع خسائر مقدرة بـ ${est_loss:,.0f}.",
                "priority": "urgent",
                "category": "Inventory",
                "categoryAr": "المخزون",
                "impact": f"Prevents ${est_loss:,.0f} stock-out loss",
                "impactAr": f"يمنع خسائر نفاد المخزون المقدرة بـ ${est_loss:,.0f}",
                "confidence": 95,
                "estimatedSavings": f"${est_loss:,.0f}",
                "estimatedSavingsAr": f"${est_loss:,.0f}",
                "actionLabel": "Create Emergency PO",
                "actionLabelAr": "إنشاء طلب شراء طارئ",
                "relatedAlertId": alert["id"],
            })
        elif alert["severity"] in ("high", "medium"):
            recs.append({
                "id": f"rec-{pid}-reorder",
                "title": f"Reorder {pname}",
                "titleAr": f"إعادة طلب {pname}",
                "description": f"Stock is running low for {pname}. Initiate standard reorder to prevent stockout.",
                "descriptionAr": f"المخزون منخفض لـ {pname}. ابدأ إعادة الطلب العادية لمنع نفاد المخزون.",
                "priority": "high" if alert["severity"] == "high" else "medium",
                "category": "Inventory",
                "categoryAr": "المخزون",
                "impact": "Maintains service level above 95%",
                "impactAr": "يحافظ على مستوى الخدمة فوق 95%",
                "confidence": 88,
                "actionLabel": "Create PO",
                "actionLabelAr": "إنشاء طلب شراء",
                "relatedAlertId": alert["id"],
            })

    return recs


def _build_health_metrics(
    prods: pd.DataFrame, inv: pd.DataFrame, sales: pd.DataFrame, mlops: dict
) -> list[dict]:
    # 1. Precalculate current metrics
    total_products = len(prods) if not prods.empty else 0
    total_stock = 0
    stockout_count = 0
    low_count = 0

    for _, r in prods.iterrows():
        pid = str(r["product_id"])
        stock = _get_latest_stock(pid, inv)
        total_stock += stock
        if stock <= 0:
            stockout_count += 1
        else:
            sales_sub = sales[sales["product_id"] == pid]
            qty_col = "qty" if "qty" in sales_sub.columns else "total_qty"
            demand = float(sales_sub[qty_col].tail(30).mean()) if not sales_sub.empty else 0.0
            demand = demand if not pd.isna(demand) else 0.0
            if demand > 0 and stock / demand < 5:
                low_count += 1

    qty_col = "qty" if "qty" in sales.columns else "total_qty"
    total_sold = int(sales[qty_col].sum()) if not sales.empty else 0
    daily_rate = total_sold / max(90, 1)
    turnover = daily_rate / max(total_stock, 1)

    stockout_rate = round(stockout_count / max(total_products, 1) * 100, 1)
    inventory_health = round((total_products - stockout_count - low_count) / max(total_products, 1) * 100, 1)

    accuracy_pct = mlops.get("accuracy_pct", 0) if mlops else 0
    forecast_accuracy = round(accuracy_pct, 1) if accuracy_pct else 95.0

    # 2. Build history over the last 14 unique dates (corresponding to roughly 2 weeks of history)
    # We choose 14 points to make the sparklines clean and aligned with standard dashboard layouts.
    try:
        inv_df = inv.copy()
        if not inv_df.empty and "date" in inv_df.columns:
            inv_df["date"] = pd.to_datetime(inv_df["date"])
            unique_dates = sorted(inv_df["date"].unique())
            history_dates = unique_dates[-14:]
        else:
            history_dates = []
    except Exception:
        history_dates = []

    sales_df = sales.copy()
    if not sales_df.empty and "date" in sales_df.columns:
        sales_df["date"] = pd.to_datetime(sales_df["date"])

    # Map product average daily demand (over the whole sales dataset) to speed up checks
    demand_map = {}
    if not prods.empty:
        for pid in prods["product_id"].unique():
            sales_sub = sales[sales["product_id"] == pid]
            demand_map[pid] = float(sales_sub[qty_col].tail(30).mean()) if not sales_sub.empty else 0.0

    # Initialize histories
    inventory_health_hist = []
    stockout_rate_hist = []
    turnover_hist = []

    if history_dates:
        for d in history_dates:
            inv_on_date = inv_df[inv_df["date"] == d]
            s_count = 0
            l_count = 0
            st_on_date = 0
            for pid in prods["product_id"].unique():
                sub = inv_on_date[inv_on_date["product_id"] == pid]
                if not sub.empty:
                    st = int(sub.iloc[0]["stock"])
                else:
                    prev = inv_df[(inv_df["product_id"] == pid) & (inv_df["date"] < d)]
                    st = int(prev.sort_values("date").iloc[-1]["stock"]) if not prev.empty else 0
                
                st_on_date += st
                dmd = demand_map.get(pid, 0.0)
                if st <= 0:
                    s_count += 1
                elif dmd > 0 and st / dmd < 5:
                    l_count += 1

            # Health
            ih = (total_products - s_count - l_count) / max(total_products, 1) * 100
            inventory_health_hist.append(round(ih, 1))

            # Stockout rate
            sr = s_count / max(total_products, 1) * 100
            stockout_rate_hist.append(round(sr, 1))

            # Turnover
            if not sales_df.empty:
                recent_sales = sales_df[(sales_df["date"] <= d) & (sales_df["date"] >= d - timedelta(days=30))]
                u_sold = int(recent_sales[qty_col].sum()) if not recent_sales.empty else 0
                dy_rate = u_sold / 30.0
                turn = dy_rate / max(st_on_date, 1)
                turnover_hist.append(round(turn * 365, 1))
            else:
                turnover_hist.append(0.0)
    else:
        # Fallbacks if history cannot be computed
        inventory_health_hist = [inventory_health] * 14
        stockout_rate_hist = [stockout_rate] * 14
        turnover_hist = [round(turnover * 365, 1)] * 14

    # Build forecast accuracy history
    forecast_accuracy_hist = []
    from backend.routers.mlops import _compute_model_accuracy
    try:
        acc_points = _compute_model_accuracy()
        forecast_accuracy_hist = [pt["accuracy"] for pt in acc_points[-14:]]
    except Exception:
        pass
    if not forecast_accuracy_hist:
        forecast_accuracy_hist = [forecast_accuracy - 1.5, forecast_accuracy - 1.0, forecast_accuracy - 0.5, forecast_accuracy]
        while len(forecast_accuracy_hist) < 14:
            forecast_accuracy_hist.insert(0, forecast_accuracy_hist[0])

    # Now calculate trend status and values dynamically based on history
    def get_trend_info(hist, is_lower_better=False):
        if len(hist) < 2:
            return "flat", "0.0%"
        first = hist[0]
        last = hist[-1]
        diff = last - first
        if abs(diff) < 0.05:
            return "flat", "0.0%"
        
        if diff > 0:
            trend = "down" if is_lower_better else "up"
            return trend, f"+{diff:.1f}%"
        else:
            trend = "up" if is_lower_better else "down"
            return trend, f"{diff:.1f}%"

    forecast_trend, forecast_trend_val = get_trend_info(forecast_accuracy_hist)
    inv_trend, inv_trend_val = get_trend_info(inventory_health_hist)
    stockout_trend, stockout_trend_val = get_trend_info(stockout_rate_hist, is_lower_better=True)
    
    # Turnover trend
    if len(turnover_hist) >= 2:
        diff_turn = turnover_hist[-1] - turnover_hist[0]
        if abs(diff_turn) < 0.05:
            turn_trend = "flat"
            turn_trend_val = "0.0x"
        elif diff_turn > 0:
            turn_trend = "up"
            turn_trend_val = f"+{diff_turn:.1f}x"
        else:
            turn_trend = "down"
            turn_trend_val = f"{diff_turn:.1f}x"
    else:
        turn_trend = "flat"
        turn_trend_val = "0.0x"

    return [
        {
            "id": "hm-forecast",
            "label": "Forecast Accuracy",
            "labelAr": "دقة التوقعات",
            "value": forecast_accuracy,
            "unit": "%",
            "unitAr": "%",
            "target": 95,
            "trend": forecast_trend,
            "trendValue": forecast_trend_val,
            "status": "healthy" if forecast_accuracy >= 90 else "warning" if forecast_accuracy >= 75 else "critical",
            "sparkData": forecast_accuracy_hist,
        },
        {
            "id": "hm-inventory",
            "label": "Inventory Health",
            "labelAr": "صحة المخزون",
            "value": inventory_health,
            "unit": "%",
            "unitAr": "%",
            "target": 90,
            "trend": inv_trend,
            "trendValue": inv_trend_val,
            "status": "healthy" if inventory_health >= 90 else "warning" if inventory_health >= 75 else "critical",
            "sparkData": inventory_health_hist,
        },
        {
            "id": "hm-stockout",
            "label": "Stock-out Rate",
            "labelAr": "معدل نفاد المخزون",
            "value": stockout_rate,
            "unit": "%",
            "unitAr": "%",
            "target": 2,
            "trend": stockout_trend,
            "trendValue": stockout_trend_val,
            "status": "healthy" if stockout_rate <= 2 else "warning" if stockout_rate <= 5 else "critical",
            "sparkData": stockout_rate_hist,
        },
        {
            "id": "hm-turnover",
            "label": "Inventory Turnover",
            "labelAr": "دوران المخزون",
            "value": round(turnover * 365, 1),
            "unit": "x/yr",
            "unitAr": " مرة/سنة",
            "target": 12,
            "trend": turn_trend,
            "trendValue": turn_trend_val,
            "status": "healthy" if turnover * 365 > 10 else "warning" if turnover * 365 > 5 else "critical",
            "sparkData": turnover_hist,
        },
    ]


def _build_insights(
    prods: pd.DataFrame, inv: pd.DataFrame, sales: pd.DataFrame, alerts: list[dict]
) -> list[dict]:
    now = datetime.now(timezone.utc)
    insights: list[dict] = []

    qty_col = "qty" if "qty" in sales.columns else "total_qty"

    if not sales.empty and "date" in sales.columns:
        recent = sales[sales["date"].astype(str) >= str((now - timedelta(days=30)).date())]
        older = sales[(sales["date"].astype(str) >= str((now - timedelta(days=60)).date())) & (sales["date"].astype(str) < str((now - timedelta(days=30)).date()))]
        recent_total = int(recent[qty_col].sum()) if not recent.empty else 0
        older_total = int(older[qty_col].sum()) if not older.empty else 0
        if older_total > 0:
            change_pct = round((recent_total - older_total) / older_total * 100, 1)
            if abs(change_pct) > 10:
                direction = "increased" if change_pct > 0 else "decreased"
                insights.append({
                    "id": "ins-demand-trend",
                    "title": f"Demand {direction.title()} by {abs(change_pct)}%",
                    "titleAr": f"{'ارتفاع' if change_pct > 0 else 'انخفاض'} الطلب بنسبة {abs(change_pct)}%",
                    "body": f"30-day demand has {direction} {abs(change_pct)}% compared to the previous 30 days. {'Consider adjusting safety stock levels.' if change_pct > 0 else 'Review promotional activity or market conditions.'}",
                    "bodyAr": f"{'زاد' if change_pct > 0 else 'انخفاض'} الطلب خلال 30 يومًا بنسبة {abs(change_pct)}% مقارنة بالـ 30 يومًا السابقة.",
                    "category": "trend",
                    "confidence": 85,
                    "timestamp": (now - timedelta(hours=2)).isoformat(),
                    "source": "Demand Intelligence",
                    "sourceAr": "ذكاء الطلب",
                    "actionable": True,
                })

    stockout_pids = [a["affectedProducts"][0] for a in alerts if a["severity"] == "critical" and a.get("affectedProducts")]
    if stockout_pids:
        insights.append({
            "id": "ins-stockout-risk",
            "title": f"{len(stockout_pids)} product{'s' if len(stockout_pids) != 1 else ''} at immediate stockout risk",
            "titleAr": f"{len(stockout_pids)} {'منتجات' if len(stockout_pids) != 1 else 'منتج'} في خطر نفاد فوري",
            "body": f"The following products need urgent replenishment: {', '.join(stockout_pids[:5])}. Delayed action may result in lost sales and reduced customer satisfaction.",
            "bodyAr": f"المنتجات التالية تحتاج إعادة توريد عاجلة: {', '.join(stockout_pids[:5])}.",
            "category": "risk",
            "confidence": 95,
            "timestamp": now.isoformat(),
            "source": "Inventory Monitor",
            "sourceAr": "مراقب المخزون",
            "actionable": True,
            "actionLabel": "View Affected Products",
            "actionLabelAr": "عرض المنتجات المتأثرة",
        })

    if not prods.empty:
        categories = prods["category"].unique() if "category" in prods.columns else []
        if len(categories) > 1:
            insights.append({
                "id": "ins-category-diversity",
                "title": f"Active across {len(categories)} categories",
                "titleAr": f"نشط عبر {len(categories)} فئات",
                "body": f"Inventory spans {len(categories)} categories ({', '.join(str(c) for c in categories[:4])}). Monitor category-level demand patterns for optimal allocation.",
                "bodyAr": f"المخزون يمتد عبر {len(categories)} فئات.",
                "category": "optimization",
                "confidence": 75,
                "timestamp": (now - timedelta(hours=6)).isoformat(),
                "source": "Portfolio Analyzer",
                "sourceAr": "محلل المحفظة",
                "actionable": True,
            })

    return insights


def _build_timeline(alerts: list[dict], mlops: dict) -> list[dict]:
    now = datetime.now(timezone.utc)
    events: list[dict] = []

    for i, alert in enumerate(alerts[:5]):
        events.append({
            "id": f"evt-alert-{i}",
            "title": alert["title"],
            "titleAr": alert["titleAr"],
            "description": alert["description"][:100],
            "descriptionAr": alert["descriptionAr"][:100],
            "timestamp": alert["triggeredAt"],
            "type": "alert",
            "severity": alert["severity"],
        })

    trained_at = mlops.get("trained_at") if mlops else None
    if trained_at:
        events.append({
            "id": "evt-mlops-retrain",
            "title": "Model retrained",
            "titleAr": "إعادة تدريب النموذج",
            "description": f"Model trained at {trained_at}",
            "descriptionAr": f"تم تدريب النموذج في {trained_at}",
            "timestamp": trained_at,
            "type": "forecast",
        })

    events.append({
        "id": "evt-system-sync",
        "title": "System operational",
        "titleAr": "النظام يعمل",
        "description": "All data pipelines active and healthy",
        "descriptionAr": "جميع خطوط البيانات نشطة وسليمة",
        "timestamp": now.isoformat(),
        "type": "system",
    })

    events.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
    return events[:8]


def _build_quick_actions(mlops: dict) -> list[dict]:
    trained_at = mlops.get("trained_at", "") if mlops else ""

    return [
        {
            "id": "qa-forecast",
            "label": "Run Demand Forecast",
            "labelAr": "تشغيل توقعات الطلب",
            "description": "Generate fresh demand forecast for all products",
            "descriptionAr": "توليد توقعات طلب جديدة لجميع المنتجات",
            "icon": "TrendingUp",
            "category": "forecast",
            "status": "idle",
        },
        {
            "id": "qa-snapshot",
            "label": "Inventory Snapshot",
            "labelAr": "لقطة مخزون",
            "description": "Refresh real-time inventory positions",
            "descriptionAr": "تحديث مواقع المخزون في الوقت الفعلي",
            "icon": "Package",
            "category": "inventory",
            "status": "idle",
        },
        {
            "id": "qa-reports",
            "label": "Generate Reports",
            "labelAr": "توليد التقارير",
            "description": "Create all standard CSV reports",
            "descriptionAr": "إنشاء جميع التقارير القياسية",
            "icon": "FileText",
            "category": "report",
            "status": "idle",
            "lastRun": trained_at or None,
        },
        {
            "id": "qa-retrain",
            "label": "Retrain Model",
            "labelAr": "إعادة تدريب النموذج",
            "description": "Retrain the demand forecasting model",
            "descriptionAr": "إعادة تدريب نموذج توقعات الطلب",
            "icon": "Brain",
            "category": "system",
            "status": "idle",
            "lastRun": trained_at or None,
        },
        {
            "id": "qa-sync",
            "label": "Sync Data",
            "labelAr": "مزامنة البيانات",
            "description": "Pull latest data from all sources",
            "descriptionAr": "سحب أحدث البيانات من جميع المصادر",
            "icon": "RefreshCw",
            "category": "system",
            "status": "idle",
        },
    ]


def _build_supply_chain_nodes(prods: pd.DataFrame, inv: pd.DataFrame) -> list[dict]:
    """Build supply chain network from real data sources."""
    suppliers = STORE.suppliers()
    raw_materials = STORE.raw_materials()
    bom = STORE.bom()
    contracts = STORE.contracts()

    # --- Supplier region aggregation ---
    region_stats = (
        suppliers.groupby("region")
        .agg(
            supplier_count=("supplier_id", "count"),
            avg_reliability=("reliability", "mean"),
            avg_lead_time=("lead_time_days", "mean"),
        )
        .reset_index()
    )

    def _supplier_status(avg_rel: float) -> str:
        if avg_rel >= 0.90:
            return "healthy"
        if avg_rel >= 0.80:
            return "warning"
        return "critical"

    # Region layout: Upper top, Delta mid, Giza bottom — suppliers on the left
    region_y = {"Upper": 20, "Delta": 50, "Giza": 80}
    supplier_nodes = []
    for _, row in region_stats.iterrows():
        region = row["region"]
        n = int(row["supplier_count"])
        rel = round(row["avg_reliability"] * 100, 1)
        lead = round(row["avg_lead_time"], 1)
        # Count materials sourced from this region
        region_suppliers = suppliers[suppliers["region"] == region]["supplier_id"].tolist()
        mat_count = len(raw_materials[raw_materials["supplier_id"].isin(region_suppliers)])
        supplier_nodes.append({
            "id": f"sc-sup-{region.lower()}",
            "label": f"{region} Suppliers",
            "labelAr": f"موردو {region}",
            "type": "supplier",
            "status": _supplier_status(row["avg_reliability"]),
            "x": 8,
            "y": region_y.get(region, 50),
            "connections": ["sc-raw"],
            "metric": f"{n} suppliers · {rel}% reliable · {lead}d lead · {mat_count} materials",
        })

    # --- Raw Materials Hub ---
    total_material_cost = raw_materials["unit_cost"].sum()
    unique_suppliers_for_materials = raw_materials["supplier_id"].nunique()
    materials_status = "healthy" if unique_suppliers_for_materials >= 3 else "warning"
    raw_material_node = {
        "id": "sc-raw",
        "label": "Raw Materials",
        "labelAr": "المواد الخام",
        "type": "warehouse",
        "status": materials_status,
        "x": 28,
        "y": 50,
        "connections": ["sc-mfg"],
        "metric": f"{len(raw_materials)} materials · ${total_material_cost:,.0f} total · {unique_suppliers_for_materials} suppliers",
    }

    # --- Manufacturing ---
    product_count = len(prods)
    bom_entries = len(bom)
    materials_per_product = round(bom_entries / product_count, 1) if product_count else 0
    categories = prods["category"].nunique() if "category" in prods.columns else 0
    mfg_status = "healthy" if product_count > 0 and materials_per_product > 0 else "warning"
    manufacturing_node = {
        "id": "sc-mfg",
        "label": "Manufacturing",
        "labelAr": "التصنيع",
        "type": "manufacturing",
        "status": mfg_status,
        "x": 48,
        "y": 50,
        "connections": ["sc-wh"],
        "metric": f"{product_count} products · {bom_entries} BOM entries · {categories} categories",
    }

    # --- Warehouse ---
    stockout_count = 0
    total_stock = 0
    low_stock_count = 0
    for _, r in prods.iterrows():
        pid = str(r["product_id"])
        stock = _get_latest_stock(pid, inv)
        total_stock += stock
        if stock <= 0:
            stockout_count += 1
        elif stock < 200:
            low_stock_count += 1

    if stockout_count > 2:
        wh_status = "critical"
    elif stockout_count > 0 or low_stock_count > 3:
        wh_status = "warning"
    else:
        wh_status = "healthy"

    wh_metric_parts = [f"{total_stock:,} total stock"]
    if stockout_count > 0:
        wh_metric_parts.append(f"{stockout_count} stockouts")
    if low_stock_count > 0:
        wh_metric_parts.append(f"{low_stock_count} low stock")
    warehouse_node = {
        "id": "sc-wh",
        "label": "Warehouse",
        "labelAr": "المستودع",
        "type": "warehouse",
        "status": wh_status,
        "x": 68,
        "y": 35,
        "connections": ["sc-dist"],
        "metric": " · ".join(wh_metric_parts),
    }

    # --- Client Distribution ---
    client_count = contracts["client"].nunique() if len(contracts) > 0 else 0
    total_monthly_qty = int(contracts["monthly_qty"].sum()) if "monthly_qty" in contracts.columns else 0
    total_contract_value = int(contracts["price"].sum()) if "price" in contracts.columns else 0
    product_reach = contracts["product_id"].nunique() if "product_id" in contracts.columns else 0
    dist_status = "healthy" if client_count >= 10 else "warning" if client_count >= 5 else "critical"
    dist_node = {
        "id": "sc-dist",
        "label": "Distribution",
        "labelAr": "التوزيع",
        "type": "distribution",
        "status": dist_status,
        "x": 88,
        "y": 35,
        "connections": [],
        "metric": f"{client_count} clients · {total_monthly_qty:,} units/mo · {product_reach} products",
    }

    # --- Store Fulfillment (online + retail derived from contracts) ---
    high_volume_clients = len(contracts[contracts["monthly_qty"] > 200]) if "monthly_qty" in contracts.columns else 0
    store_status = "healthy" if stockout_count == 0 else "critical"
    store_node = {
        "id": "sc-store",
        "label": "Fulfillment",
        "labelAr": "التنفيذ",
        "type": "store",
        "status": store_status,
        "x": 88,
        "y": 70,
        "connections": [],
        "metric": f"{high_volume_clients} high-volume clients · {'All stocked' if stockout_count == 0 else f'{stockout_count} stockouts'}",
    }

    nodes = (
        supplier_nodes
        + [raw_material_node, manufacturing_node, warehouse_node, dist_node, store_node]
    )
    return nodes


@router.get("/dashboard")
def command_center_dashboard(user: dict = Depends(_get_current_user)):
    prods = STORE.products()
    inv = STORE.inventory()
    sales = STORE.sales_daily()
    mlops = _load_model_metrics()

    alerts = _build_alerts(prods, inv, sales)

    return {
        "morningBrief": _build_morning_brief(prods, inv, sales, mlops),
        "alerts": alerts,
        "recommendations": _build_recommendations(prods, inv, sales, alerts),
        "healthMetrics": _build_health_metrics(prods, inv, sales, mlops),
        "insights": _build_insights(prods, inv, sales, alerts),
        "timeline": _build_timeline(alerts, mlops),
        "quickActions": _build_quick_actions(mlops),
        "supplyChainNodes": _build_supply_chain_nodes(prods, inv),
        "copilotMessages": [],
    }
