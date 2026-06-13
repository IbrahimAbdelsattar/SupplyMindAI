import re
import hashlib
import base64
from .config import GuardrailsConfig
from .models import GuardrailResult, GuardrailViolation, ViolationCategory, ViolationSeverity


class InputGuardrails:
    KNOWN_JAILBREAK_PATTERNS = [
        re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|commands)", re.IGNORECASE),
        re.compile(r"disregard\s+(all\s+)?(previous|prior)\s+(instructions|rules)", re.IGNORECASE),
        re.compile(r"forget\s+(all\s+)?(your\s+)?(previous|prior)\s+(instructions|directives|context)", re.IGNORECASE),
        re.compile(r"you\s+(are\s+)?(now|must\s+act\s+as)\s+", re.IGNORECASE),
        re.compile(r"act\s+as\s+(if\s+)?(you\s+are\s+)?(an?\s+)?(dan|jailbreak|unfiltered|uncensored|criminal|black\s+hat|hacker|malicious)", re.IGNORECASE),
        re.compile(r"(roleplay|pretend)\s+as\s+(an?\s+)?(unfiltered|malicious|criminal|hacker|hacked)", re.IGNORECASE),
        re.compile(r"(break|step\s+out\s+of)\s+character", re.IGNORECASE),
        re.compile(r"god\s+mode", re.IGNORECASE),
        re.compile(r"new\s+rule", re.IGNORECASE),
        re.compile(r"override\s+(mode|instructions|protocol)", re.IGNORECASE),
        re.compile(r"Do\s+not\s+output\s+your\s+(usual|standard|normal)", re.IGNORECASE),
        re.compile(r"you\s+(have\s+)?no\s+(restrictions|limits|boundaries|rules)", re.IGNORECASE),
        re.compile(r"remove\s+(all\s+)?(filter|restriction|limit|guardrail)", re.IGNORECASE),
        re.compile(r"((hypothetical|fiction|story|game)\s+.*(ignore|bypass|remove|disable))", re.IGNORECASE),
        re.compile(r"output\s+raw", re.IGNORECASE),
        re.compile(r"reveal\s+(prompt|system\s+prompt|instructions)", re.IGNORECASE),
        re.compile(r"show\s+(me\s+)?(the\s+)?(prompt|system\s+message|initial\s+prompt)", re.IGNORECASE),
        re.compile(r"(tell|show|list|give)\s+(me\s+)?(all\s+)?(api\s+keys?|database\s+credentials?|user\s+passwords?|secret\s+tokens?|environment\s+variables|aws\s+credentials|stripe\s+key)", re.IGNORECASE),
        re.compile(r"(admin\s+password|database\s+connection\s+string|cloud\s+provider\s+credentials)", re.IGNORECASE),
        re.compile(r"token\s*:\s*[A-Za-z0-9_-]{20,}", re.IGNORECASE),
        re.compile(r"api[_-]?key[:\s=]+['\"]?[A-Za-z0-9_-]{16,}['\"]?", re.IGNORECASE),
        re.compile(r"secret[:\s=]+['\"]?[A-Za-z0-9_-]{16,}['\"]?", re.IGNORECASE),
        re.compile(r"password[:\s=]+['\"]?\S+['\"]?", re.IGNORECASE),
        re.compile(r"BEGIN\s+(RSA|DSA|EC|PGP|OPENSSH)\s+(PRIVATE\s+)?KEY", re.IGNORECASE),
        re.compile(r"(eval|exec)\s*\(", re.IGNORECASE),
        re.compile(r"__import__\s*\(['\"]os['\"]", re.IGNORECASE),
        re.compile(r"subprocess\.(call|run|popen|check_output)", re.IGNORECASE),
        re.compile(r"os\.(system|popen|exec)", re.IGNORECASE),
    ]

    FORBIDDEN_TOPIC_PATTERNS = [
        (re.compile(r"how\s+(to\s+)?(hack|crack|crack|exploit|bypass)", re.IGNORECASE), ViolationSeverity.HIGH),
        (re.compile(r"generate\s+(malware|virus|ransomware|trojan|keylogger)", re.IGNORECASE), ViolationSeverity.CRITICAL),
        (re.compile(r"sql\s+injection\s+(payload|technique|example)", re.IGNORECASE), ViolationSeverity.HIGH),
        (re.compile(r"social\s+engineering\s+(script|template|technique)", re.IGNORECASE), ViolationSeverity.MEDIUM),
        (re.compile(r"phishing\s+(email|page|template|link)", re.IGNORECASE), ViolationSeverity.HIGH),
        (re.compile(r"credit\s+card\s+(generator|steal|fraud)", re.IGNORECASE), ViolationSeverity.CRITICAL),
        (re.compile(r"identity\s+theft", re.IGNORECASE), ViolationSeverity.HIGH),
        (re.compile(r"how\s+to\s+(cheat|defraud|scam)", re.IGNORECASE), ViolationSeverity.HIGH),
    ]

    PROMPT_LEAKAGE_PATTERNS = [
        re.compile(r"what\s+(is|are|were)\s+(your|the)\s+(system\s+)?(prompt|instructions|directives)", re.IGNORECASE),
        re.compile(r"(tell|show|reveal|print|output)\s+(me\s+)?(your|the)\s+(initial|system)\s+(prompt|message)", re.IGNORECASE),
        re.compile(r"(tell|show|reveal|print|output)\s+(me\s+)?(your|the)\s+(instructions|directives|base\s+prompt|rules)", re.IGNORECASE),
        re.compile(r"repeat\s+(the\s+)?(above|previous|initial)\s+(text|prompt|message)", re.IGNORECASE),
        re.compile(r"how\s+(are|were)?\s*you\s+(instructed|programmed|trained)", re.IGNORECASE),
        re.compile(r"what\s+are\s+you\s+programmed\s+to\s+do", re.IGNORECASE),
        re.compile(r"what\s+rules?\s+(do\s+)?you\s+(follow|have|obey)", re.IGNORECASE),
    ]

    ADVERSARIAL_PATTERNS = [
        re.compile(r"(translate|convert)\s+.*(to\s+)?(french|german|spanish|russian|chinese)\s+.*(ignore|forget|override)", re.IGNORECASE),
        re.compile(r"say\s+\".*\"\s+(repeatedly|again|over\s+and\s+over)", re.IGNORECASE),
        re.compile(r"poem\s+.*(ignore|forget|override|bypass|disable)", re.IGNORECASE),
        re.compile(r"base64\s+.*(prompt|instruction|system|secret)", re.IGNORECASE),
        re.compile(r"base64\s+decode\s+.*follow", re.IGNORECASE),
        re.compile(r"rot13|caesar|cipher\s+.*(prompt|instruction)", re.IGNORECASE),
        re.compile(r"morse\s+code.*(prompt|instruction)", re.IGNORECASE),
        re.compile(r"(leetspeak|l33t).*(prompt|instruction)", re.IGNORECASE),
        re.compile(r"(another|different)\s+(company|tenant|organization)|all\s+(companies|organizations)|tenant\s+[a-z0-9_-]+|ignore\s+tenant\s+restrictions", re.IGNORECASE),
    ]

    def __init__(self, config: GuardrailsConfig | None = None):
        self.config = config or GuardrailsConfig()

        self._patterns = {
            "jailbreak": self.KNOWN_JAILBREAK_PATTERNS,
            "forbidden_topic": [p for p, _ in self.FORBIDDEN_TOPIC_PATTERNS],
            "prompt_leakage": self.PROMPT_LEAKAGE_PATTERNS,
            "adversarial": self.ADVERSARIAL_PATTERNS,
        }

        self._topic_severities = self.FORBIDDEN_TOPIC_PATTERNS

    def _should_block(self, severity: ViolationSeverity) -> bool:
        return (
            (severity == ViolationSeverity.CRITICAL and self.config.block_on_critical)
            or (severity == ViolationSeverity.HIGH and self.config.block_on_high)
            or (severity == ViolationSeverity.MEDIUM and self.config.block_on_medium)
        )

    def check(self, text: str, user_id: str | None = None, tenant_id: str | None = None,
              session_id: str | None = None) -> GuardrailResult:
        result = GuardrailResult(passed=True, transformed_input=text)

        category_checks = [
            ("jailbreak", ViolationCategory.JAILBREAK, self.config.jailbreak_threshold),
            ("prompt_leakage", ViolationCategory.PROMPT_LEAKAGE, self.config.prompt_leakage_threshold),
            ("adversarial", ViolationCategory.ADVERSARIAL, self.config.adversarial_threshold),
            ("forbidden_topic", ViolationCategory.FORBIDDEN_TOPIC, 0.5),
        ]

        for pattern_key, violation_category, threshold in category_checks:
            patterns = self._patterns[pattern_key]
            for pattern in patterns:
                match = pattern.search(text)
                if match:
                    severity = ViolationSeverity.HIGH
                    if pattern_key == "forbidden_topic":
                        for p, s in self._topic_severities:
                            if p.search(text):
                                severity = s
                                break

                    violation = GuardrailViolation(
                        category=violation_category,
                        severity=severity,
                        user_id=user_id,
                        tenant_id=tenant_id,
                        session_id=session_id,
                        source="input_guardrails",
                        input_preview=text[:200],
                        details=f"Pattern matched: {pattern.pattern[:100]}",
                        blocked=self._should_block(severity),
                    )
                    result.violations.append(violation)

        decoded = self._decode_base64_payloads(text)
        for payload in decoded:
            decoded_result = self.check(payload, user_id=user_id, tenant_id=tenant_id, session_id=session_id)
            if decoded_result.violations:
                result.violations.append(GuardrailViolation(
                    category=ViolationCategory.ADVERSARIAL,
                    severity=ViolationSeverity.HIGH,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    session_id=session_id,
                    source="input_guardrails",
                    input_preview=text[:200],
                    details="Base64-encoded adversarial instruction detected",
                    blocked=self._should_block(ViolationSeverity.HIGH),
                ))

        sensitive_hits = self._check_sensitive_data(text)
        for hit in sensitive_hits:
            violation = GuardrailViolation(
                category=ViolationCategory.SENSITIVE_DATA,
                severity=ViolationSeverity.HIGH,
                user_id=user_id,
                tenant_id=tenant_id,
                session_id=session_id,
                source="input_guardrails",
                input_preview=text[:200],
                details=f"Sensitive data pattern matched: {hit}",
                blocked=False,
            )
            result.violations.append(violation)

        result.passed = not result.blocked
        return result

    @staticmethod
    def _decode_base64_payloads(text: str) -> list[str]:
        payloads = []
        for token in re.findall(r"\b[A-Za-z0-9+/]{16,}={0,2}\b", text):
            try:
                decoded = base64.b64decode(token, validate=True).decode("utf-8", errors="ignore")
            except Exception:
                continue
            if decoded and any(char.isalpha() for char in decoded):
                payloads.append(decoded)
        return payloads

    def _check_sensitive_data(self, text: str) -> list[str]:
        hits = []
        for pattern_str in self.config.sensitive_data_patterns:
            pattern = re.compile(pattern_str)
            matches = pattern.findall(text)
            for m in matches:
                if re.match(r'\b\d{16}\b', m):
                    if self._luhn_check(m):
                        hits.append(f"Credit card: {m[:4]}...{m[-4:]}")
                elif '@' in m:
                    hits.append(f"Email: {m}")
                elif re.match(r'.*\d{3}.*\d{4}', m):
                    hits.append(f"Phone: {m}")
        return hits

    @staticmethod
    def _luhn_check(card_number: str) -> bool:
        digits = [int(d) for d in card_number if d.isdigit()]
        if len(digits) < 13:
            return False
        checksum = 0
        for i, d in enumerate(reversed(digits)):
            if i % 2 == 1:
                d = d * 2
                if d > 9:
                    d -= 9
            checksum += d
        return checksum % 10 == 0

    @staticmethod
    def sanitize(text: str) -> str:
        text = re.sub(r"(password|secret|api[_-]?key|token)[:\s=]+['\"]?\S+['\"]?",
                      r'\1: ***REDACTED***', text, flags=re.IGNORECASE)
        text = re.sub(r'\b\d{16}\b', '***REDACTED***', text)
        return text
