from __future__ import annotations

import json
import re

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from langchain_core.messages import HumanMessage, SystemMessage

from backend.dependencies import _get_current_user
from backend.globals import STORE, MODELS
from backend.knowledge.auth import AuthUser
from backend.schemas.insights import InsightsGeneratePayload, ChatPayload

router = APIRouter(prefix="/api/v1/insights", tags=["insights"])


@router.post("/generate")
def insights_generate(payload: InsightsGeneratePayload, user: AuthUser = Depends(_get_current_user)):
    logger = None
    try:
        from loguru import logger as loguru_logger
        logger = loguru_logger
    except ImportError:
        pass

    try:
        if "llm" not in MODELS:
            from backend.agents.nodes import llm as _llm
            MODELS["llm"] = _llm
            MODELS["llm"] = MODELS.get("llm", _llm)
        llm = MODELS.get("llm")
        if llm is None:
            return _fallback_insights(payload.product_id, "LLM model not loaded")

        prods = STORE.products()
        inv = STORE.inventory()
        sales = STORE.sales_daily()
        purchases = STORE.purchases()

        prod = prods[prods["product_id"] == payload.product_id]
        if prod.empty:
            return _fallback_insights(payload.product_id, "Product not found")
        prod = prod.iloc[0]
        pname = str(prod.get("product_name", payload.product_id))
        cat = str(prod.get("category", ""))
        unit_price = float(prod.get("unit_price", 10.0)) or 10.0

        sales_sub = sales[sales["product_id"] == payload.product_id]
        qty_col = "qty" if "qty" in sales_sub.columns else "total_qty"
        total_sold = int(sales_sub[qty_col].sum()) if not sales_sub.empty else 0
        avg_demand = float(sales_sub[qty_col].tail(90).mean()) if not sales_sub.empty else 0.0
        avg_demand = avg_demand if not pd.isna(avg_demand) else 0.0

        inv_sub = inv[inv["product_id"] == payload.product_id]
        stock_trend = []
        if not inv_sub.empty:
            inv_sorted = inv_sub.sort_values("date")
            for _, row in inv_sorted.iterrows():
                try:
                    stock_trend.append(int(row["stock"]))
                except (ValueError, TypeError):
                    stock_trend.append(0)

        current_stock = stock_trend[-1] if stock_trend else 0
        stock_min = min(stock_trend) if stock_trend else 0
        stock_max = max(stock_trend) if stock_trend else 0

        monthly_sales = {}
        if not sales_sub.empty:
            sales_copy = sales_sub.copy()
            sales_copy["month"] = pd.to_datetime(sales_copy["date"]).dt.to_period("M").astype(str)
            for month, group in sales_copy.groupby("month"):
                monthly_sales[month] = int(group[qty_col].sum())

        seasons = ["Winter", "Spring", "Summer", "Fall"]
        monthly_dist = []
        if monthly_sales:
            total_all = sum(monthly_sales.values())
            for m_name, m_val in sorted(monthly_sales.items()):
                monthly_dist.append({"month": m_name, "sales": m_val, "pct": round(m_val / total_all * 100, 1) if total_all > 0 else 0})

        sys_msg = SystemMessage(content=(
            "You are a supply chain AI analyst. Analyze the product data and provide structured insights. "
            "Respond ONLY with valid JSON in this exact format:\n"
            '{\n'
            '  "insights": [\n'
            '    {\n'
            '      "title": "string — concise insight title",\n'
            '      "description": "string — 2-3 sentence explanation",\n'
            '      "impact": "high | medium | low",\n'
            '      "direction": "up | down | neutral",\n'
            '      "factor": "string — category name e.g. Seasonality, Promotions",\n'
            '      "confidence": 0-100\n'
            '    }\n'
            '  ],\n'
            '  "executive_summary": "string — 2-3 paragraph business summary",\n'
            '  "recommendations": ["string — actionable step"]\n'
            "}\n\n"
            "Return ONLY the JSON object. No extra text before or after."
        ))
        user_msg = HumanMessage(
            content=f"Analyze the recent forecasting, seasonality, and promotional trends for {payload.product_id}. "
                    f"Give me 4 actionable insights about this product. Respond with ONLY JSON."
        )

        response = llm.invoke([sys_msg, user_msg])
        raw_text = response.content.strip()

        cleaned = re.sub(r'^```(?:json)?\s*', '', raw_text)
        cleaned = re.sub(r'\s*```\s*$', '', cleaned)
        cleaned = cleaned.strip()

        parsed = json.loads(cleaned)

        if "insights" not in parsed:
            parsed["insights"] = []
        if "executive_summary" not in parsed:
            parsed["executive_summary"] = "AI analysis completed."
        if "recommendations" not in parsed:
            parsed["recommendations"] = []

        valid_insights = []
        for ins in parsed.get("insights", []):
            valid_insights.append({
                "title": ins.get("title", "Untitled Insight"),
                "description": ins.get("description", ""),
                "impact": ins.get("impact", "medium") if ins.get("impact") in ("high", "medium", "low") else "medium",
                "direction": ins.get("direction", "neutral") if ins.get("direction") in ("up", "down", "neutral") else "neutral",
                "factor": ins.get("factor", "General"),
                "confidence": max(0, min(100, int(ins.get("confidence", 70)))),
            })
        parsed["insights"] = valid_insights

        parsed["product_name"] = pname
        parsed["category"] = cat
        parsed["current_stock"] = current_stock
        parsed["avg_demand"] = round(avg_demand, 2)
        return parsed

    except json.JSONDecodeError as je:
        if logger:
            logger.warning("Insights response was not valid JSON: %s", je)
        return _fallback_insights(payload.product_id, "JSON parse error")
    except Exception as exc:
        if logger:
            logger.exception("Insights generation failed: %s", exc)
        return _fallback_insights(payload.product_id, str(exc))


def _fallback_insights(product_id: str, reason: str = "") -> dict:
    return {
        "insights": [
            {
                "title": "AI Response Parsing Error" if "parse" in reason.lower() else "Generation Error",
                "description": f"The AI returned a response that could not be parsed as valid JSON. This usually happens with free-tier models. Try again or switch to a higher-quality model." if "parse" in reason.lower() else "The AI insight generator is temporarily unavailable.",
                "impact": "low",
                "direction": "neutral",
                "factor": "System",
                "confidence": 30 if "parse" in reason.lower() else 50,
            }
        ],
        "executive_summary": "The AI model returned an unparseable response. Please retry." if "parse" in reason.lower() else "System is currently unable to generate deep insights.",
        "recommendations": ["Retry the generation", "Consider using a model with better structured output support"] if "parse" in reason.lower() else ["Ensure ML models are fully loaded and API keys are valid."],
    }


@router.post("/chat")
def insights_chat(payload: ChatPayload, user: AuthUser = Depends(_get_current_user)):
    try:
        from backend.agents.graph import app_graph
        from langchain_core.messages import HumanMessage

        initial_state = {
            "messages": [HumanMessage(content=payload.message)],
            "product_id": payload.selected_sku or "",
            "current_intent": "",
        }

        result = app_graph.invoke(initial_state)
        final_message = result["messages"][-1].content

        return {"response": final_message, "sources": []}
    except Exception as e:
        return {"response": f"I encountered an error while processing your request: {e}"}
