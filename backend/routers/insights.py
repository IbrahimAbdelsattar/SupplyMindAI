from __future__ import annotations

import random

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import _get_current_user

from backend.schemas.insights import InsightsGeneratePayload, ChatPayload

router = APIRouter(prefix="/api/v1/insights", tags=["insights"])

_IMPACTS = ["high", "medium", "low"]
_DIRECTIONS = ["up", "down", "flat"]
_FACTORS = ["Seasonality", "Historical Trends", "Promotions", "External Factors", "Other"]


import pandas as pd
from backend.globals import STORE

def _generate_real_insights(product_id: str) -> dict:
    sales = STORE.sales_daily()
    inventory = STORE.inventory()
    
    sub_sales = sales[sales["product_id"] == product_id].copy() if not sales.empty else pd.DataFrame()
    sub_inv = inventory[inventory["product_id"] == product_id].copy() if not inventory.empty else pd.DataFrame()
    
    insights = []
    recommendations = []
    
    if sub_sales.empty:
        return {
            "insights": [{
                "title": f"No Sales Data for {product_id}",
                "description": "Insufficient historical data to run statistical analysis.",
                "impact": "low",
                "direction": "flat",
                "factor": "Historical Trends",
                "confidence": 0,
            }],
            "executive_summary": "Analysis aborted due to missing historical data.",
            "recommendations": ["Ensure data pipelines are functioning correctly."]
        }
    
    sub_sales = sub_sales.sort_values("date")
    
    # Calculate Velocity (last 30 days vs previous 30 days)
    last_30 = sub_sales.tail(30)
    prev_30 = sub_sales.iloc[-60:-30] if len(sub_sales) >= 60 else pd.DataFrame()
    
    qty_col = "qty" if "qty" in last_30.columns else "total_qty"
    if qty_col not in last_30.columns:
        qty_col = last_30.columns[-1]  # fallback
        
    velocity_30 = float(last_30[qty_col].mean()) if not last_30.empty else 0.0
    velocity_prev = float(prev_30[qty_col].mean()) if not prev_30.empty else velocity_30
    
    # 1. Trend Insight
    if velocity_prev > 0:
        trend_pct = ((velocity_30 - velocity_prev) / velocity_prev) * 100
        if trend_pct > 15:
            insights.append({
                "title": "Significant Demand Surge Detected",
                "description": f"Average daily demand increased by {trend_pct:.1f}% in the last 30 days compared to the prior period. Ensure production schedules can accommodate the new baseline.",
                "impact": "high",
                "direction": "up",
                "factor": "Historical Trends",
                "confidence": min(95, 75 + int(trend_pct / 2)),
            })
            recommendations.append("Increase safety stock thresholds immediately.")
        elif trend_pct < -15:
            insights.append({
                "title": "Demand Contraction Warning",
                "description": f"Average daily demand has dropped by {abs(trend_pct):.1f}% recently. Risk of overstocking if current procurement rates are maintained.",
                "impact": "medium",
                "direction": "down",
                "factor": "Seasonality",
                "confidence": min(95, 75 + int(abs(trend_pct) / 2)),
            })
            recommendations.append("Halt aggressive procurement to prevent capital lock-up.")
        else:
            insights.append({
                "title": "Stable Demand Velocity",
                "description": f"Demand remains stable with a daily velocity of {velocity_30:.1f} units. No major statistical deviations detected.",
                "impact": "low",
                "direction": "flat",
                "factor": "Historical Trends",
                "confidence": 90,
            })
    
    # 2. Inventory Coverage Insight
    if not sub_inv.empty:
        last_inv = sub_inv.sort_values("date").tail(1)
        current_stock = float(last_inv["stock_level"].iloc[0]) if "stock_level" in last_inv.columns else 0.0
        
        if velocity_30 > 0:
            coverage_days = current_stock / velocity_30
            if coverage_days < 14:
                insights.append({
                    "title": "Critical Stockout Risk",
                    "description": f"Current inventory ({current_stock} units) provides only {coverage_days:.1f} days of cover at current sales velocity.",
                    "impact": "high",
                    "direction": "down",
                    "factor": "External Factors",
                    "confidence": 98,
                })
                recommendations.append(f"Expedite emergency shipments to extend {coverage_days:.1f} day runway.")
            elif coverage_days > 90:
                insights.append({
                    "title": "Capital Inefficiency (Overstock)",
                    "description": f"You are carrying {coverage_days:.1f} days of inventory cover. This ties up working capital unnecessarily.",
                    "impact": "medium",
                    "direction": "up",
                    "factor": "Promotions",
                    "confidence": 92,
                })
                recommendations.append("Deploy promotional pricing to clear excess stock.")
                
    if not recommendations:
        recommendations = ["Maintain current inventory parameters.", "Continue monitoring daily velocity."]
        
    executive_summary = f"Statistical analysis for {product_id} confirms a daily velocity of {velocity_30:.1f} units. We identified {len([i for i in insights if i['impact'] == 'high'])} critical high-impact factors requiring attention."
    
    return {
        "insights": insights,
        "executive_summary": executive_summary,
        "recommendations": recommendations,
    }


@router.post("/generate")
def insights_generate(
    payload: InsightsGeneratePayload,
    user: dict = Depends(_get_current_user),
):
    try:
        return _generate_real_insights(payload.product_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
