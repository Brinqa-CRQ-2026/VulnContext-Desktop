class ControlScoring:
    def compute(self, context: dict) -> float:
        prevent = self._avg(context, "prevent")
        detect = self._avg(context, "detect")
        respond = self._avg(context, "respond")
        contain = self._avg(context, "contain")

        score = (
            0.35 * prevent +
            0.25 * detect +
            0.25 * respond +
            0.15 * contain
        )

        return min(max(score / 5.0, 0.0), 1.0)

    def _avg(self, context, prefix):
        values = [
            v for k, v in context.items()
            if k.startswith(prefix) and k.endswith("_maturity")
        ]

        if not values:
            return 0.0

        return sum(values) / len(values)