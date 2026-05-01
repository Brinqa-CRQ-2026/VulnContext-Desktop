from .control_inference import ControlInference
from .control_scoring import ControlScoring


class ControlEngine:
    def __init__(self):
        self.infer = ControlInference()
        self.score = ControlScoring()

    def compute(self, context: dict) -> float:
        inferred = self.infer.compute(context)

        if not self._has_user_inputs(context):
            return inferred

        user_score = self.score.compute(context)
        confidence = self._user_confidence(context)

        return (
            confidence * user_score +
            (1 - confidence) * inferred
        )

    def _has_user_inputs(self, context):
        return any(
            key.endswith("_maturity")
            for key in context
        )

    def _user_confidence(self, context):
        answered = sum(
            1 for k in context if k.endswith("_maturity")
        )

        total_expected = 8  # adjust based on questionnaire size

        return min(answered / total_expected, 1.0)