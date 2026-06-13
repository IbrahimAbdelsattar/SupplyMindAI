import re
from datetime import datetime, date
from .config import GuardrailsConfig
from .models import GuardrailResult, GuardrailViolation, ViolationCategory, ViolationSeverity


class ForecastGuardrails:
    def __init__(self, config: GuardrailsConfig | None = None):
        self.config = config or GuardrailsConfig()

    def check_forecast_input(self, data: dict, user_id: str | None = None,
                              tenant_id: str | None = None) -> GuardrailResult:
        result = GuardrailResult(passed=True)

        if "product_id" in data and data["product_id"]:
            product_id = str(data["product_id"])
            if re.match(r"^[A-Za-z0-9_-]{1,100}$", product_id) is None:
                result.violations.append(GuardrailViolation(
                    category=ViolationCategory.FORECAST_INVALID,
                    severity=ViolationSeverity.MEDIUM,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    source="forecast_guardrails",
                    details=f"Invalid product_id format: '{product_id}'",
                    blocked=True,
                ))

        if "horizon_days" in data:
            horizon = data["horizon_days"]
            if not isinstance(horizon, int) or horizon < 1 or horizon > self.config.forecast_max_horizon_days:
                result.violations.append(GuardrailViolation(
                    category=ViolationCategory.FORECAST_INVALID,
                    severity=ViolationSeverity.MEDIUM,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    source="forecast_guardrails",
                    details=f"Invalid forecast horizon: {horizon}. Must be 1-{self.config.forecast_max_horizon_days} days",
                    blocked=True,
                ))

        if "start_date" in data:
            try:
                start = datetime.fromisoformat(data["start_date"]).date()
                if start > date.today():
                    result.violations.append(GuardrailViolation(
                        category=ViolationCategory.FORECAST_INVALID,
                        severity=ViolationSeverity.LOW,
                        user_id=user_id,
                        tenant_id=tenant_id,
                        source="forecast_guardrails",
                        details="Forecast start date is in the future",
                        blocked=False,
                    ))
            except (ValueError, TypeError):
                result.violations.append(GuardrailViolation(
                    category=ViolationCategory.FORECAST_INVALID,
                    severity=ViolationSeverity.MEDIUM,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    source="forecast_guardrails",
                    details=f"Invalid start_date format: '{data.get('start_date')}'",
                    blocked=True,
                ))

        if "demand" in data:
            demand = data["demand"]
            if isinstance(demand, (int, float)):
                if demand < 0 or demand > 1_000_000:
                    result.violations.append(GuardrailViolation(
                        category=ViolationCategory.FORECAST_INVALID,
                        severity=ViolationSeverity.MEDIUM,
                        user_id=user_id,
                        tenant_id=tenant_id,
                        source="forecast_guardrails",
                        details=f"Unrealistic demand value: {demand}",
                        blocked=True,
                    ))

        result.passed = not result.blocked
        return result

    def check_forecast_output(self, output: dict, user_id: str | None = None,
                               tenant_id: str | None = None) -> GuardrailResult:
        result = GuardrailResult(passed=True)

        predicted = output.get("predicted_demand", output.get("forecast", 0))
        if isinstance(predicted, (int, float)):
            if predicted < self.config.forecast_min_value or predicted > self.config.forecast_max_value:
                result.violations.append(GuardrailViolation(
                    category=ViolationCategory.FORECAST_INVALID,
                    severity=ViolationSeverity.HIGH,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    source="forecast_guardrails",
                    details=f"Forecast output out of bounds: {predicted} (limit: [{self.config.forecast_min_value}, {self.config.forecast_max_value}])",
                    blocked=True,
                ))

        lower = output.get("lower_bound", output.get("confidence_lower", None))
        upper = output.get("upper_bound", output.get("confidence_upper", None))

        if lower is not None and upper is not None:
            if lower > upper:
                result.violations.append(GuardrailViolation(
                    category=ViolationCategory.FORECAST_INVALID,
                    severity=ViolationSeverity.MEDIUM,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    source="forecast_guardrails",
                    details=f"Confidence interval invalid: lower ({lower}) > upper ({upper})",
                    blocked=True,
                ))

        confidence = output.get("confidence", output.get("confidence_score", None))
        if confidence is not None:
            if not isinstance(confidence, (int, float)) or confidence < 0 or confidence > 1:
                result.violations.append(GuardrailViolation(
                    category=ViolationCategory.FORECAST_INVALID,
                    severity=ViolationSeverity.MEDIUM,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    source="forecast_guardrails",
                    details=f"Invalid confidence score: {confidence}. Must be 0.0-1.0",
                    blocked=True,
                ))

        result.passed = not result.blocked
        return result
