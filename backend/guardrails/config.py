from pydantic import BaseModel, Field
from typing import Optional


class GuardrailsConfig(BaseModel):
    enabled: bool = True
    block_on_critical: bool = True
    block_on_high: bool = True
    block_on_medium: bool = False
    log_all_violations: bool = True

    prompt_injection_threshold: float = 0.7
    jailbreak_threshold: float = 0.65
    prompt_leakage_threshold: float = 0.6
    adversarial_threshold: float = 0.6

    rag_relevance_threshold: float = 0.5
    rag_faithfulness_threshold: float = 0.6
    rag_max_context_chunks: int = 10

    forecast_max_value: float = 1e9
    forecast_min_value: float = -1e9
    forecast_max_horizon_days: int = 3650

    rate_limit_per_minute: int = 60
    rate_limit_per_hour: int = 1000
    rate_limit_burst: int = 10

    agent_max_steps: int = 50
    agent_max_cost: float = 2.0

    sensitive_data_patterns: list[str] = Field(default_factory=lambda: [
        r'\b\d{16}\b',
        r'\b\d{3}-\d{2}-\d{4}\b',
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        r'\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
    ])

    forbidden_topics: list[str] = Field(default_factory=lambda: [
        "how to hack",
        "sql injection",
        "bypass security",
        "ignore instructions",
        "disregard previous",
        "forget all",
    ])

    blocked_roles: list[str] = Field(default_factory=lambda: [
        "system",
        "developer",
        "admin",
        "assistant",
    ])

    allowed_models: list[str] = Field(default_factory=lambda: [
        "openai/gpt-4o",
        "openai/gpt-4o-mini",
        "anthropic/claude-3.5-sonnet",
        "anthropic/claude-3-haiku",
        "google/gemini-pro",
        "meta-llama/llama-3-70b",
    ])

    monitor_slow_queries_ms: int = 5000
    monitor_violation_alerts: bool = True

    red_team_iterations: int = 3
    deepeval_enabled: bool = False
    langsmith_enabled: bool = False
