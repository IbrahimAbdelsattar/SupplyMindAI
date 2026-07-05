import logging
from typing import Any, Dict, List, AsyncGenerator
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage, BaseMessage
from backend.ai.orchestrator.model_registry import ModelRegistry
from backend.ai.orchestrator.prompt_registry import PromptRegistry
from backend.ai.orchestrator.tool_registry import ToolRegistry
from backend.ai.orchestrator.context_builder import ContextBuilder
from backend.ai.orchestrator.memory_manager import MemoryManager
from backend.ai.orchestrator.conversation_manager import ConversationManager
from backend.knowledge.langsmith_tracing import configure_langsmith

configure_langsmith()

try:
    from langsmith import traceable as _traceable
except ImportError:
    def _traceable(*a, **kw):  # type: ignore
        def deco(fn):
            return fn
        return deco

LOGGER = logging.getLogger(__name__)

class BaseAgent:
    """Base class for all logically isolated AI Agents."""

    def __init__(self, agent_type: str):
        self.agent_type = agent_type
        self.model = ModelRegistry.get_model(agent_type)
        self.system_prompt = PromptRegistry.get_prompt(agent_type)
        self.tools = ToolRegistry.get_tools(agent_type)

    def _assemble_prompt(
        self,
        query: str,
        user_id: str,
        session_id: str,
        product_id: str | None = None
    ) -> tuple[List[BaseMessage], List[Dict[str, Any]]]:
        """Compile isolated RAG context, memories, conversation history, and prompts."""
        # 1. RAG Retrieve
        context, sources = ContextBuilder.get_filtered_context(
            agent_type=self.agent_type,
            query=query,
            product_id=product_id,
            user_id=user_id
        )

        # 2. Operational snapshot
        snapshot = ContextBuilder.get_operational_snapshot_for_agent(
            agent_type=self.agent_type,
            product_id=product_id
        )

        # 3. Memories
        memories = MemoryManager.get_context(
            agent_type=self.agent_type,
            query=query,
            user_id=user_id
        )

        # 4. Scoped History
        history = ConversationManager.get_history(
            user_id=user_id,
            session_id=session_id,
            agent_type=self.agent_type
        )

        # Build context system prompt
        context_parts = []
        if context:
            context_parts.append(f"CONTEXT (retrieved knowledge):\n{context}")
        if snapshot:
            context_parts.append(f"OPERATIONAL_SNAPSHOT:\n{snapshot}")
        if memories:
            context_parts.append(f"RECALLED_MEMORIES:\n{memories}")
        
        context_block = "\n\n".join(context_parts) if context_parts else "No additional context available."

        messages = [
            SystemMessage(content=self.system_prompt),
            SystemMessage(content=f"Here is the context and history you must ground your answer on.\n\n{context_block}"),
            *history,
            HumanMessage(content=query)
        ]

        return messages, sources

    @_traceable(name="agent_execute", run_type="chain")
    def execute(
        self,
        query: str,
        user_id: str,
        session_id: str,
        product_id: str | None = None
    ) -> Dict[str, Any]:
        """Execute agent task, handling tool calls synchronously up to 3 rounds."""
        if not self.model:
            return {"answer": f"Agent {self.agent_type} is currently disabled.", "sources": []}

        messages, sources = self._assemble_prompt(query, user_id, session_id, product_id)
        model_with_tools = self.model.bind_tools(self.tools) if self.tools else self.model

        round_num = 0
        max_rounds = 3
        while round_num < max_rounds:
            from backend.llm.monitor import monitor_llm_call
            with monitor_llm_call(feature=f"agent_{self.agent_type}", model=self.model.model_name if hasattr(self.model, "model_name") else "unknown", provider="openrouter") as ctx:
                response = model_with_tools.invoke(messages)
                ctx["record_tokens"](response, input_len=0, output_len=0)

            messages.append(response)

            if hasattr(response, "tool_calls") and response.tool_calls:
                round_num += 1
                LOGGER.info("Agent %s invoking tools: %s", self.agent_type, response.tool_calls)
                for tool_call in response.tool_calls:
                    tool_name = tool_call.get("name")
                    tool_args = tool_call.get("args", {})
                    tool_id = tool_call.get("id")

                    # Find tool
                    matching_tool = next((t for t in self.tools if t.name == tool_name), None)
                    if matching_tool:
                        try:
                            tool_result = matching_tool.invoke(tool_args)
                        except Exception as tool_err:
                            tool_result = f"Tool execution failed: {tool_err}"
                    else:
                        tool_result = f"Tool '{tool_name}' not registered for agent."

                    messages.append(
                        ToolMessage(content=str(tool_result), tool_call_id=tool_id, name=tool_name)
                    )
            else:
                # No tool calls, finish
                break

        # Save assistant turn
        answer = response.content if hasattr(response, "content") else str(response)
        
        ConversationManager.save_turn(
            user_id=user_id,
            session_id=session_id,
            role="assistant",
            content=answer,
            agent_type=self.agent_type,
            metadata={"sources": sources}
        )

        # Upsert long-term memory turn
        MemoryManager.save_memory(
            agent_type=self.agent_type,
            session_id=session_id,
            user_id=user_id,
            content=f"Q: {query[:300]}\nA: {answer[:400]}"
        )

        return {"answer": answer, "sources": sources, "grounded": bool(sources)}

    @_traceable(name="agent_astream_execute", run_type="chain")
    async def astream_execute(
        self,
        query: str,
        user_id: str,
        session_id: str,
        product_id: str | None = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream response tokens or yield tool execution statuses."""
        if not self.model:
            yield {"type": "error", "message": "Model not loaded."}
            return

        messages, sources = self._assemble_prompt(query, user_id, session_id, product_id)
        model_with_tools = self.model.bind_tools(self.tools) if self.tools else self.model

        round_num = 0
        max_rounds = 3
        while round_num < max_rounds:
            from backend.llm.monitor import monitor_llm_call
            
            # Since nvidia/openrouter models sometimes output tool_calls, check if the model returns immediately
            # or streams. We call invoke when tool binding is present to detect tools, and stream final result.
            if self.tools:
                # We invoke first to let model choose to use tools
                with monitor_llm_call(feature=f"agent_{self.agent_type}_stream_probe", model=self.model.model_name if hasattr(self.model, "model_name") else "unknown", provider="openrouter") as ctx:
                    response = model_with_tools.invoke(messages)
                    ctx["record_tokens"](response, input_len=0, output_len=0)

                if hasattr(response, "tool_calls") and response.tool_calls:
                    round_num += 1
                    messages.append(response)
                    for tool_call in response.tool_calls:
                        tool_name = tool_call.get("name")
                        tool_args = tool_call.get("args", {})
                        tool_id = tool_call.get("id")
                        
                        yield {"type": "status", "message": f"Executing tool: {tool_name}..."}
                        
                        matching_tool = next((t for t in self.tools if t.name == tool_name), None)
                        if matching_tool:
                            try:
                                tool_result = matching_tool.invoke(tool_args)
                            except Exception as tool_err:
                                tool_result = f"Tool execution failed: {tool_err}"
                        else:
                            tool_result = f"Tool '{tool_name}' not registered."
                        
                        messages.append(
                            ToolMessage(content=str(tool_result), tool_call_id=tool_id, name=tool_name)
                        )
                else:
                    # Model didn't call tools, so we stream the response.content chunk-by-chunk for UX consistency
                    text = response.content if hasattr(response, "content") else str(response)
                    # Yield text chunks
                    chunk_size = 8
                    for i in range(0, len(text), chunk_size):
                        yield {"type": "token", "text": text[i:i+chunk_size]}
                    messages.append(response)
                    break
            else:
                # No tools, direct stream
                full_content = []
                with monitor_llm_call(feature=f"agent_{self.agent_type}_stream", model=self.model.model_name if hasattr(self.model, "model_name") else "unknown", provider="openrouter") as ctx:
                    async for chunk in self.model.astream(messages):
                        if chunk and hasattr(chunk, "content") and chunk.content:
                            text = chunk.content
                            full_content.append(text)
                            yield {"type": "token", "text": text}
                
                ai_msg = AIMessage(content="".join(full_content))
                messages.append(ai_msg)
                response = ai_msg
                break

        # Save turns
        answer = response.content if hasattr(response, "content") else str(response)
        ConversationManager.save_turn(
            user_id=user_id,
            session_id=session_id,
            role="assistant",
            content=answer,
            agent_type=self.agent_type,
            metadata={"sources": sources}
        )

        MemoryManager.save_memory(
            agent_type=self.agent_type,
            session_id=session_id,
            user_id=user_id,
            content=f"Q: {query[:300]}\nA: {answer[:400]}"
        )

        yield {"type": "result", "answer": answer, "sources": sources, "grounded": bool(sources)}


# Concrete Agent classes
class InventoryAgent(BaseAgent):
    def __init__(self):
        super().__init__("inventory")

    def _assemble_prompt(self, query: str, user_id: str, session_id: str, product_id: str | None = None):
        messages, sources = super()._assemble_prompt(query, user_id, session_id, product_id)
        
        # Inject Business Rules evaluation if product_id is specified or found
        if not product_id:
            try:
                from backend.inventory.intent_detector import _extract_product_id
                product_id = _extract_product_id(query)
            except Exception:
                pass
                
        if product_id:
            try:
                from backend.inventory.knowledge_builder import build_inventory_knowledge_document
                from backend.inventory.business_rules import evaluate_business_rules
                doc = build_inventory_knowledge_document(product_id)
                if doc:
                    rules_result = evaluate_business_rules(
                        product_id=doc.product_id, current_stock=doc.current_stock, safety_stock=doc.safety_stock,
                        reorder_point=doc.reorder_point, lead_time_days=doc.lead_time_days,
                        inventory_turnover=doc.inventory_turnover, days_of_supply=doc.days_of_supply,
                        forecast_demand=doc.forecast_demand, product_name=doc.product_name,
                    )
                    rules_context = rules_result.to_prompt_context()
                    
                    # Prepend rules context to the last Human message
                    last_msg = messages[-1]
                    last_msg.content = f"PRE-EVALUATED BUSINESS RULES:\n{rules_context}\n\n" + last_msg.content
            except Exception as e:
                LOGGER.error(f"Failed to evaluate business rules: {e}")
                
        return messages, sources

class ForecastAgent(BaseAgent):
    def __init__(self):
        super().__init__("forecast")

class CustomerSupportAgent(BaseAgent):
    def __init__(self):
        super().__init__("customer_support")

class ExecutiveInsightsAgent(BaseAgent):
    def __init__(self):
        super().__init__("executive_insights")

class ReportAgent(BaseAgent):
    def __init__(self):
        super().__init__("report")

class DocumentationAgent(BaseAgent):
    def __init__(self):
        super().__init__("documentation")

class SecurityAgent(BaseAgent):
    def __init__(self):
        super().__init__("security")

class GuardrailsAgent(BaseAgent):
    def __init__(self):
        super().__init__("guardrails")


class AgentFactory:
    """Instantiates and caches agent roles."""

    _instances: Dict[str, BaseAgent] = {}

    @classmethod
    def get_agent(cls, agent_type: str) -> BaseAgent:
        """Retrieve or create agent singleton instance."""
        if agent_type not in cls._instances:
            if agent_type == "inventory":
                cls._instances[agent_type] = InventoryAgent()
            elif agent_type == "forecast":
                cls._instances[agent_type] = ForecastAgent()
            elif agent_type == "customer_support":
                cls._instances[agent_type] = CustomerSupportAgent()
            elif agent_type == "executive_insights":
                cls._instances[agent_type] = ExecutiveInsightsAgent()
            elif agent_type == "report":
                cls._instances[agent_type] = ReportAgent()
            elif agent_type == "documentation":
                cls._instances[agent_type] = DocumentationAgent()
            elif agent_type == "security":
                cls._instances[agent_type] = SecurityAgent()
            elif agent_type == "guardrails":
                cls._instances[agent_type] = GuardrailsAgent()
            else:
                cls._instances[agent_type] = CustomerSupportAgent()
        
        return cls._instances[agent_type]
