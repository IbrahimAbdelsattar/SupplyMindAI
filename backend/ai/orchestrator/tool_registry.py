import logging
from typing import Any, List
from backend.tools.forecasting_tools import generate_forecast
from backend.tools.inventory_tools import analyze_inventory
from backend.tools.knowledge_tools import (
    search_forecast_knowledge,
    search_inventory_knowledge,
    search_insights_knowledge,
    search_mlops_knowledge,
    recall_agent_memory_tool,
)
from backend.tools.mlops_tools import get_mlops_metrics

LOGGER = logging.getLogger(__name__)

class ToolRegistry:
    """Manages mapping and registration of tools for each agent role."""

    _registry = {
        "inventory": [analyze_inventory, search_inventory_knowledge],
        "forecast": [generate_forecast, search_forecast_knowledge],
        "customer_support": [search_insights_knowledge],
        "documentation": [search_insights_knowledge],
        "mlops": [get_mlops_metrics, search_mlops_knowledge],
        "executive_insights": [],
        "report": [],
        "security": [],
        "guardrails": []
    }

    @classmethod
    def get_tools(cls, agent_type: str) -> List[Any]:
        """Retrieve the restricted list of tools assigned to the agent type."""
        tools = cls._registry.get(agent_type, [])
        LOGGER.info("Retrieving %d tools for agent_type '%s'", len(tools), agent_type)
        return tools
