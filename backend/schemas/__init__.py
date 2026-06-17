from backend.schemas.auth import UserOut, UserAdminOut, RegisterRequest, LoginRequest, LoginResponse, UserUpdateRequest
from backend.schemas.forecast import KPIResponse, ForecastPredictRequest, ForecastPoint, MonthlyPrediction, ForecastPredictResponse
from backend.schemas.inventory import InventoryRecommendation, InventoryItemOut, InventorySummaryOut
from backend.schemas.reports import ReportItem
from backend.schemas.alerts import AlertItem
from backend.schemas.insights import InsightsGeneratePayload, ChatPayload, ChatRequest
from backend.schemas.settings import UserSettingsPayload

__all__ = [
    "UserOut", "UserAdminOut", "RegisterRequest", "LoginRequest", "LoginResponse", "UserUpdateRequest",
    "KPIResponse", "ForecastPredictRequest", "ForecastPoint", "MonthlyPrediction", "ForecastPredictResponse",
    "InventoryRecommendation", "InventoryItemOut", "InventorySummaryOut",
    "ReportItem",
    "AlertItem",
    "InsightsGeneratePayload", "ChatPayload", "ChatRequest",
    "UserSettingsPayload",
]
