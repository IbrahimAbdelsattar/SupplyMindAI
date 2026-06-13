from .config import GuardrailsConfig


class DeepEvalIntegration:
    def __init__(self, config: GuardrailsConfig | None = None):
        self.config = config or GuardrailsConfig()
        self._available = False

    def check_available(self) -> bool:
        if not self.config.deepeval_enabled:
            return False

        try:
            import deepeval
            self._available = True
            return True
        except ImportError:
            self._available = False
            return False

    def evaluate_hallucination(self, output: str, context: str) -> dict:
        if not self._available and not self.check_available():
            return {"error": "deepeval not available", "score": None}

        try:
            from deepeval.metrics import HallucinationMetric
            from deepeval.test_case import LLMTestCase

            metric = HallucinationMetric(threshold=self.config.rag_faithfulness_threshold)
            test_case = LLMTestCase(
                input=context[:2000],
                actual_output=output[:2000],
            )
            metric.measure(test_case)
            return {
                "score": metric.score,
                "passed": metric.is_successful(),
                "reason": metric.reason,
            }
        except Exception as e:
            return {"error": str(e), "score": None}

    def evaluate_faithfulness(self, output: str, context: str) -> dict:
        if not self._available and not self.check_available():
            return {"error": "deepeval not available", "score": None}

        try:
            from deepeval.metrics import FaithfulnessMetric
            from deepeval.test_case import LLMTestCase

            metric = FaithfulnessMetric(threshold=self.config.rag_faithfulness_threshold)
            test_case = LLMTestCase(
                input=context[:2000],
                actual_output=output[:2000],
            )
            metric.measure(test_case)
            return {
                "score": metric.score,
                "passed": metric.is_successful(),
                "reason": metric.reason,
            }
        except Exception as e:
            return {"error": str(e), "score": None}

    def evaluate_relevance(self, input_text: str, output: str) -> dict:
        if not self._available and not self.check_available():
            return {"error": "deepeval not available", "score": None}

        try:
            from deepeval.metrics import AnswerRelevancyMetric
            from deepeval.test_case import LLMTestCase

            metric = AnswerRelevancyMetric(threshold=self.config.rag_relevance_threshold)
            test_case = LLMTestCase(
                input=input_text[:2000],
                actual_output=output[:2000],
            )
            metric.measure(test_case)
            return {
                "score": metric.score,
                "passed": metric.is_successful(),
                "reason": metric.reason,
            }
        except Exception as e:
            return {"error": str(e), "score": None}
