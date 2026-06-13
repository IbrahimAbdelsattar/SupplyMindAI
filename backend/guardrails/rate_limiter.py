import time
from collections import defaultdict
from threading import Lock
from .config import GuardrailsConfig
from .models import GuardrailResult, GuardrailViolation, ViolationCategory, ViolationSeverity


class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = float(capacity)
        self.last_refill = time.monotonic()
        self.lock = Lock()

    def consume(self, tokens: int = 1) -> bool:
        with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_refill
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
            self.last_refill = now

            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False


class RateLimiter:
    def __init__(self, config: GuardrailsConfig | None = None):
        self.config = config or GuardrailsConfig()
        self._buckets: dict[str, TokenBucket] = {}
        self._lock = Lock()

    def _get_bucket(self, key: str) -> TokenBucket:
        with self._lock:
            if key not in self._buckets:
                self._buckets[key] = TokenBucket(
                    capacity=self.config.rate_limit_burst,
                    refill_rate=self.config.rate_limit_per_minute / 60.0,
                )
            return self._buckets[key]

    def check(self, user_id: str | None = None, tenant_id: str | None = None,
              ip: str | None = None, endpoint: str | None = None) -> GuardrailResult:
        result = GuardrailResult(passed=True)

        rate_key = f"user:{user_id or 'anon'}:{endpoint or 'global'}"

        bucket = self._get_bucket(rate_key)
        if not bucket.consume(1):
            result.violations.append(GuardrailViolation(
                category=ViolationCategory.RATE_LIMIT,
                severity=ViolationSeverity.MEDIUM,
                user_id=user_id,
                tenant_id=tenant_id,
                source="rate_limiter",
                details=f"Rate limit exceeded for key '{rate_key}'",
                blocked=True,
            ))

        ip_key = f"ip:{ip or 'unknown'}"
        ip_bucket = self._get_bucket(ip_key)
        if not ip_bucket.consume(1):
            result.violations.append(GuardrailViolation(
                category=ViolationCategory.RATE_LIMIT,
                severity=ViolationSeverity.MEDIUM,
                user_id=user_id,
                tenant_id=tenant_id,
                source="rate_limiter",
                details=f"IP rate limit exceeded: {ip}",
                blocked=True,
            ))

        result.passed = not result.blocked
        return result

    def cleanup(self, max_age_seconds: int = 3600):
        with self._lock:
            now = time.monotonic()
            keys_to_delete = [
                k for k, b in self._buckets.items()
                if now - b.last_refill > max_age_seconds
            ]
            for k in keys_to_delete:
                del self._buckets[k]
