import os
os.environ["RESTRICT_CHATBOT"] = "false"
import pytest
from unittest.mock import MagicMock, patch
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from backend.ai.orchestrator.config import config
from backend.ai.orchestrator.model_registry import ModelRegistry
from backend.ai.orchestrator.prompt_registry import PromptRegistry
from backend.ai.orchestrator.memory_manager import MemoryManager
from backend.ai.orchestrator.tool_registry import ToolRegistry
from backend.ai.orchestrator.context_builder import ContextBuilder
from backend.ai.orchestrator.conversation_manager import ConversationManager
from backend.ai.orchestrator.intent_detector import IntentDetector
from backend.ai.orchestrator.router import AIOrchestrator


class TestModelRegistry:
    def test_model_params(self):
        # Verify specific settings mapped in registry
        assert config.INVENTORY_TEMP == 0.1
        assert config.SUPPORT_TEMP == 0.3
        assert config.SECURITY_TEMP == 0.0


class TestPromptRegistry:
    def test_prompt_retrieval(self):
        assert "Inventory Agent" in PromptRegistry.get_prompt("inventory")
        assert "Forecasting Agent" in PromptRegistry.get_prompt("forecast")
        assert "SupplyMind Copilot" in PromptRegistry.get_prompt("customer_support")
        # Default fallback
        assert "SupplyMind Copilot" in PromptRegistry.get_prompt("unknown_agent")


class TestToolRegistry:
    def test_tool_binding(self):
        inv_tools = ToolRegistry.get_tools("inventory")
        assert any(t.name == "analyze_inventory" for t in inv_tools)
        
        forecast_tools = ToolRegistry.get_tools("forecast")
        assert any(t.name == "generate_forecast" for t in forecast_tools)

        support_tools = ToolRegistry.get_tools("customer_support")
        assert not any(t.name == "analyze_inventory" for t in support_tools)
        assert not any(t.name == "search_inventory_knowledge" for t in support_tools)
        assert not any(t.name == "search_forecast_knowledge" for t in support_tools)
        # Support is guide-only: no dataset tools
        assert support_tools == []


class TestContextBuilder:
    @patch("backend.ai.orchestrator.context_builder.semantic_search")
    def test_rag_isolation(self, mock_search):
        mock_search.return_value = []
        ContextBuilder.get_filtered_context("customer_support", "test query", product_id="P-001")
        
        # Verify that customer_support only searched general and insight
        searched_types = [call.kwargs.get("source_type") for call in mock_search.call_args_list]
        assert "general" in searched_types
        assert "insight" in searched_types
        assert "inventory" not in searched_types
        assert "forecast" not in searched_types
        # Product scope must be stripped for support
        for call in mock_search.call_args_list:
            assert call.kwargs.get("product_id") is None

    @patch("backend.ai.orchestrator.context_builder.get_operational_snapshot")
    def test_support_has_no_operational_snapshot(self, mock_snapshot):
        mock_snapshot.return_value = "live data"
        assert ContextBuilder.get_operational_snapshot_for_agent("customer_support") == ""
        mock_snapshot.assert_not_called()
        ContextBuilder.get_operational_snapshot_for_agent("inventory", product_id="P-1")
        mock_snapshot.assert_called_once_with("P-1")


class TestConversationManager:
    @patch("backend.ai.orchestrator.conversation_manager.is_knowledge_available")
    @patch("backend.ai.orchestrator.conversation_manager.knowledge_session")
    def test_scoped_history(self, mock_session, mock_avail):
        mock_avail.return_value = True
        
        mock_db = MagicMock()
        mock_session.return_value.__enter__.return_value = mock_db
        
        # Mock returned database conversations
        conv1 = MagicMock(role="user", content="hello", conversation_metadata={"agent_type": "customer_support"})
        conv2 = MagicMock(role="assistant", content="hi", conversation_metadata={"agent_type": "customer_support"})
        conv3 = MagicMock(role="user", content="predict stock", conversation_metadata={"agent_type": "inventory"})
        
        mock_db.execute().all.return_value = [(conv1, None), (conv2, None), (conv3, None)]
        mock_db.scalars().all.return_value = [conv1, conv2, conv3]

        history = ConversationManager.get_history("user_123", "session_abc", "customer_support")
        
        # history must contain only customer_support turns
        assert len(history) == 2
        assert history[0].content == "hello"
        assert history[1].content == "hi"


class TestIntentDetector:
    @patch("backend.ai.orchestrator.intent_detector.ModelRegistry.get_model")
    def test_intent_parsing(self, mock_get_model):
        mock_model = MagicMock()
        mock_get_model.return_value = mock_model
        
        # Mock valid classification output
        mock_response = MagicMock(content='{"intent": "inventory", "confidence": 0.95, "reason": "Stock request"}')
        mock_model.invoke.return_value = mock_response

        detector = IntentDetector()
        res = detector.detect_intent("How much stock do we have?")
        assert res["intent"] == "inventory"
        assert res["confidence"] == 0.95


class TestAIOrchestrator:
    @patch("backend.ai.orchestrator.router.InputGuardrails")
    @patch("backend.ai.orchestrator.router.IntentDetector")
    @patch("backend.ai.orchestrator.router.AgentFactory")
    def test_orchestrator_routing(self, mock_factory, mock_intent_class, mock_guard_class):
        mock_guard = MagicMock()
        mock_guard.check.return_value = MagicMock(passed=True)
        mock_guard_class.return_value = mock_guard

        mock_intent = MagicMock()
        mock_intent.detect_intent.return_value = {"intent": "forecast", "confidence": 0.9}
        mock_intent_class.return_value = mock_intent

        mock_agent = MagicMock()
        mock_agent.execute.return_value = {"answer": "Forecast analysis", "sources": []}
        mock_factory.get_agent.return_value = mock_agent

        with patch.dict(os.environ, {"RESTRICT_CHATBOT": "false"}):
            orchestrator = AIOrchestrator()
            result = orchestrator.execute_query("Predict demand", "user_1", "sess_1", mode="technical")

        assert result["answer"] == "Forecast analysis"
        assert result["engine"] == "orchestrator:forecast"
        mock_factory.get_agent.assert_called_with("forecast")


class TestModelRegistryAndOmniRoute:
    def test_omniroute_default_resolution(self):
        from backend.ai.orchestrator.model_registry import ModelRegistry
        from backend.llm.client import _resolve_provider, get_active_provider

        with patch.dict(os.environ, {
            "LLM_PROVIDER": "omniroute",
            "OMNIROUTE_API_KEY": "sk-omni-test-global-key",
        }, clear=False):
            # Verify provider detection
            provider, base_url, _ = _resolve_provider("sk-omni-test-global-key")
            assert provider == "omniroute"
            assert "omniroute" in base_url
            assert get_active_provider() == "omniroute"

            # Default agent env resolution
            model, resolved_url, key, _, _ = ModelRegistry.resolve_agent_env("inventory")
            assert resolved_url == "https://omniroute.wajehni-ai.space/v1"
            assert key == "sk-omni-test-global-key"

    def test_agent_specific_env_overrides(self):
        from backend.ai.orchestrator.model_registry import ModelRegistry

        with patch.dict(os.environ, {
            "INVENTORY_MODEL": "custom/inventory-llm:v1",
            "INVENTORY_BASE_URL": "https://custom-inventory.space/v1",
            "INVENTORY_API_KEY": "sk-inv-secret-12345",
            "FORECAST_MODEL": "custom/forecast-llm:v2",
            "FORECAST_BASE_URL": "https://custom-forecast.space/v1",
            "FORECAST_API_KEY": "sk-fc-secret-67890",
            "SUPPORT_MODEL": "custom/support-llm:v3",
            "SUPPORT_BASE_URL": "https://custom-support.space/v1",
            "SUPPORT_API_KEY": "sk-supp-secret-99999",
        }, clear=False):
            # Test inventory agent specific overrides
            inv_model, inv_url, inv_key, _, _ = ModelRegistry.resolve_agent_env("inventory")
            assert inv_model == "custom/inventory-llm:v1"
            assert inv_url == "https://custom-inventory.space/v1"
            assert inv_key == "sk-inv-secret-12345"

            # Test forecast agent specific overrides
            fc_model, fc_url, fc_key, _, _ = ModelRegistry.resolve_agent_env("forecast")
            assert fc_model == "custom/forecast-llm:v2"
            assert fc_url == "https://custom-forecast.space/v1"
            assert fc_key == "sk-fc-secret-67890"

            # Test customer support agent specific overrides
            supp_model, supp_url, supp_key, _, _ = ModelRegistry.resolve_agent_env("customer_support")
            assert supp_model == "custom/support-llm:v3"
            assert supp_url == "https://custom-support.space/v1"
            assert supp_key == "sk-supp-secret-99999"
