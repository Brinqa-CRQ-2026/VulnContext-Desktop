from __future__ import annotations

from typing import Any

import numpy as np
import torch


UNKNOWN_TOKEN = "__UNKNOWN__"


def row_to_dict(row: Any) -> dict[str, Any]:
    return {
        column.name: getattr(row, column.name)
        for column in row.__table__.columns
    }


def normalize_value(value: Any) -> str:
    if value is None:
        return UNKNOWN_TOKEN

    text = str(value).strip()

    if not text or text.lower() in {"none", "null", "nan", "undefined", "not defined"}:
        return UNKNOWN_TOKEN

    return text


def encode_categorical_value(value: Any, vocab: dict[str, int]) -> int:
    normalized = normalize_value(value)

    if normalized in vocab:
        return vocab[normalized]

    if UNKNOWN_TOKEN in vocab:
        return vocab[UNKNOWN_TOKEN]

    return 0


def build_model_inputs(
    feature_row: Any,
    *,
    cat_cols: list[str],
    num_cols: list[str],
    vocabs: dict[str, dict[str, int]],
    scaler: Any,
) -> tuple[torch.Tensor, torch.Tensor]:
    data = row_to_dict(feature_row)

    cat_values = []
    for col in cat_cols:
        vocab = vocabs.get(col, {})
        cat_values.append(encode_categorical_value(data.get(col), vocab))

    num_values = []
    for col in num_cols:
        value = data.get(col)

        try:
            num_values.append(float(value) if value is not None else 0.0)
        except Exception:
            num_values.append(0.0)

    x_cat = torch.tensor([cat_values], dtype=torch.long)

    x_num_np = np.array([num_values], dtype=np.float32)
    x_num_scaled = scaler.transform(x_num_np)
    x_num = torch.tensor(x_num_scaled, dtype=torch.float32)

    return x_cat, x_num