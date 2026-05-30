from __future__ import annotations

from pathlib import Path
from typing import Any
import joblib

import torch

from app.services.ML_model.ml_features_preprocess import build_model_inputs
from app.services.ML_model.ml_model_network import BaseRiskNetwork


MODEL_DIR = Path(__file__).resolve().parents[3] / "model_three_stage"


class MLRiskPredictor:
    def __init__(self, model_dir: Path = MODEL_DIR):
        self.model_dir = model_dir
        self.device = torch.device("cpu")

        self.metadata = self._load_metadata()
        # it stored the numeric normalization objects
        self.scaler = self._load_pickle("scaler.pkl")
        # it stored the cateogircal features mapping
        self.vocabs = self._load_pickle("vocabs.pkl")
        # it stores categorical feature order because embedding layers are positional
        self.cat_cols = self._load_pickle("cat_cols.pkl")
        # it stores the ordering of all the numeric features
        self.num_cols = self._load_pickle("num_cols.pkl")

        self.cat_vocab_sizes = [
            max(vocab.values()) + 1 if vocab else 1
            for vocab in self.vocabs.values()
        ]
        # gate_model.pth, low_model.pth and high_model.pth stored a set of trained neural network weights
        self.gate_model = self._load_model("gate_model.pth")
        self.low_model = self._load_model("low_model.pth")
        self.high_model = self._load_model("high_model.pth")

        self.gate_threshold = float(
            self.metadata.get("gate_threshold", 0.5)
            if isinstance(self.metadata, dict)
            else 0.5
        )

    def _load_pickle(self, filename: str) -> Any:
        path = self.model_dir / filename
        with open(path, "rb") as file:
            return joblib.load(path)


    def _load_metadata(self) -> dict:
        # "three_stage_metadata.pth" is a model config file that conatins parameters like hidden dimension, dropout rate, number of numeric features, catgorical_cardinalities etc...
        path = self.model_dir / "three_stage_metadata.pth"

        if not path.exists():
            return {}

        data = torch.load(path, map_location="cpu")

        return data if isinstance(data, dict) else {}

    def _load_model(self, filename: str) -> BaseRiskNetwork:
        model = BaseRiskNetwork(
            num_numeric_features=self.metadata["num_numeric_features"],
            cat_cardinalities=self.metadata["cat_cardinalities"],
            embed_dims=self.metadata["embed_dims"],
            hidden_dims=self.metadata["hidden_dims"],
            dropout=self.metadata["dropout"],
            out_dim=1,
        )

        state_dict = torch.load(
            self.model_dir / filename,
            map_location=self.device,
        )

        model.load_state_dict(state_dict)

        model.eval()

        return model

    @torch.no_grad()
    def predict(self, feature_row: Any) -> dict[str, float | str]:
        x_cat, x_num = build_model_inputs(
            feature_row,
            cat_cols=self.cat_cols,
            num_cols=self.num_cols,
            vocabs=self.vocabs,
            scaler=self.scaler,
        )

        gate_logit = self.gate_model(x_cat, x_num)
        gate_probability = torch.sigmoid(gate_logit).item()

        if gate_probability >= self.gate_threshold:
            route = "high"
            prediction = self.high_model(x_cat, x_num).item()
        else:
            route = "low_medium"
            prediction = self.low_model(x_cat, x_num).item()

        prediction_score = max(0.0, min(1.0, float(prediction)))

        return {
            "prediction_score": prediction_score,
            "prediction_route": route,
            "gate_probability": float(gate_probability),
        }


_predictor: MLRiskPredictor | None = None


def get_ml_predictor() -> MLRiskPredictor:
    global _predictor

    if _predictor is None:
        _predictor = MLRiskPredictor()

    return _predictor