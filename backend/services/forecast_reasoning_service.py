from __future__ import annotations

import os
import json
import logging
from typing import Any, Optional
from langchain_core.messages import SystemMessage, HumanMessage
from backend.integrations.agentrouter import get_agentrouter_llm
from backend.knowledge.langsmith_tracing import configure_langsmith

LOGGER = logging.getLogger(__name__)

FORECAST_REASONING_SYSTEM_PROMPT = """You are a Senior Supply Chain Consultant.

You receive forecasting outputs from a machine learning system.

You do not generate forecasts.

You analyze the provided forecasting metrics and provide actionable business recommendations.

Focus on:

- Demand risk
- Inventory optimization
- Supplier performance
- Revenue opportunities
- Operational bottlenecks

Provide concise executive-level recommendations.

You MUST respond ONLY with a valid JSON object matching the following structure:
{
  "summary": "Executive summary paragraph...",
  "risks": [
    {"title": "Risk Title", "description": "Description of risk", "impact": "high|medium|low"}
  ],
  "recommendations": [
    {"title": "Recommendation Title", "description": "Actionable detail", "impact": "high|medium|low"}
  ],
  "revenue_opportunities": [
    {"title": "Opportunity Title", "description": "Actionable detail", "value": "estimated revenue/savings impact"}
  ]
}"""

class ForecastReasoningService:
    def __init__(self) -> None:
        model = os.getenv("FORECAST_MODEL", "openai/gpt-oss-120b:free")
        self.llm = get_agentrouter_llm(model_name=model)

    def analyze(self, forecasts: list[dict[str, Any]], question: Optional[str] = None) -> dict[str, Any]:
        configure_langsmith()

        # Build context from the forecasts
        context_lines = []
        for r in forecasts[:15]:  # limit to top 15 to fit context window nicely
            context_lines.append(
                f"Product ID: {r.get('product_id')}\n"
                f"- Period: {r.get('period')}\n"
                f"- Predicted Demand: {r.get('predicted_demand')} (Confidence: {r.get('confidence_level')})\n"
                f"- Demand Trend: {r.get('demand_trend')}\n"
                f"- Current Stock: {r.get('current_stock')} (Stock Risk Level: {r.get('stock_risk_level')})\n"
                f"- Recommended Order Qty: {r.get('recommended_order_qty')}\n"
                f"- Best Supplier: {r.get('best_supplier')} (Supplier Score: {r.get('supplier_score')})\n"
                f"- Lead Time: {r.get('lead_time_days')} days (Delay Risk: {r.get('delay_risk')}, Avg Delay: {r.get('avg_delay')} days)\n"
                f"- Profit Margin: {r.get('profit_margin')}\n"
                f"- Revenue Forecast: {r.get('revenue_forecast')}"
            )
        context_str = "\n\n".join(context_lines)

        user_message = f"Please analyze these forecasting results:\n\n{context_str}"
        if question:
            user_message += f"\n\nUser Question/Focus: {question}"

        messages = [
            SystemMessage(content=FORECAST_REASONING_SYSTEM_PROMPT),
            HumanMessage(content=user_message)
        ]

        try:
            response = self.llm.invoke(messages)
            content = response.content if hasattr(response, "content") else str(response)

            # Safe parse JSON
            content_str = str(content).strip()
            if content_str.startswith("```"):
                content_str = content_str.split("\n", 1)[-1]
                content_str = content_str.rsplit("```", 1)[0]
            content_str = content_str.strip()

            return json.loads(content_str)
        except Exception as exc:
            LOGGER.exception("Forecast reasoning LLM failed: %s", exc)
            return {
                "summary": f"Forecast analysis currently unavailable. Error: {exc}",
                "risks": [],
                "recommendations": [],
                "revenue_opportunities": [],
            }
