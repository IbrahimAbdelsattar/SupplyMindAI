import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class OrchestratorConfig(BaseSettings):
    # Model defaults
    DEFAULT_TEMPERATURE: float = 0.15
    DEFAULT_TIMEOUT: float = 30.0
    DEFAULT_MAX_RETRIES: int = 3
    DEFAULT_MAX_TOKENS: int = 2048

    # Agent specific model overrides
    INVENTORY_MODEL: str = os.getenv("INVENTORY_MODEL") or os.getenv("LLM_MODEL") or "nvidia/nemotron-3-super-120b-a12b:free"
    INVENTORY_TEMP: float = 0.1
    INVENTORY_MAX_TOKENS: int = 2048

    FORECAST_MODEL: str = os.getenv("FORECAST_MODEL") or os.getenv("LLM_MODEL") or "nvidia/nemotron-3-super-120b-a12b:free"
    FORECAST_TEMP: float = 0.1
    FORECAST_MAX_TOKENS: int = 2048

    SUPPORT_MODEL: str = os.getenv("SUPPORT_MODEL") or os.getenv("LLM_MODEL") or "nvidia/nemotron-3-super-120b-a12b:free"
    SUPPORT_TEMP: float = 0.3
    SUPPORT_MAX_TOKENS: int = 1024

    REPORT_MODEL: str = os.getenv("REPORT_MODEL") or os.getenv("LLM_MODEL") or "nvidia/nemotron-3-super-120b-a12b:free"
    REPORT_TEMP: float = 0.1
    REPORT_MAX_TOKENS: int = 4096

    INSIGHTS_MODEL: str = os.getenv("INSIGHTS_MODEL") or os.getenv("LLM_MODEL") or "nvidia/nemotron-3-super-120b-a12b:free"
    INSIGHTS_TEMP: float = 0.1
    INSIGHTS_MAX_TOKENS: int = 4096

    SECURITY_MODEL: str = os.getenv("SECURITY_MODEL") or os.getenv("LLM_MODEL") or "nvidia/nemotron-3-super-120b-a12b:free"
    SECURITY_TEMP: float = 0.0
    SECURITY_MAX_TOKENS: int = 512

    COPILOT_MODEL: str = os.getenv("COPILOT_MODEL") or os.getenv("LLM_MODEL") or "nvidia/nemotron-3-super-120b-a12b:free"
    COPILOT_TEMP: float = 0.2
    COPILOT_MAX_TOKENS: int = 2048

    DOCUMENTATION_MODEL: str = os.getenv("DOCUMENTATION_MODEL") or os.getenv("LLM_MODEL") or "nvidia/nemotron-3-super-120b-a12b:free"
    DOCUMENTATION_TEMP: float = 0.1
    DOCUMENTATION_MAX_TOKENS: int = 2048

    # Intent detector config
    INTENT_DETECTOR_MODEL: str = os.getenv("INTENT_DETECTOR_MODEL") or os.getenv("LLM_MODEL") or "nvidia/nemotron-3-super-120b-a12b:free"
    INTENT_CONFIDENCE_THRESHOLD: float = 0.70

    # Path setups
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[3] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

config = OrchestratorConfig()
