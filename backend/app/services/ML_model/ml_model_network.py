from __future__ import annotations

import torch
import torch.nn as nn


class BaseRiskNetwork(nn.Module):
    def __init__(
        self,
        num_numeric_features: int,
        cat_cardinalities: list,
        embed_dims: list,
        hidden_dims=[256, 128, 64],
        dropout=0.3,
        out_dim=1,
    ):
        super().__init__()

        assert len(cat_cardinalities) == len(embed_dims)

        embedding_layers = []

        for card, ed in zip(cat_cardinalities, embed_dims):
            embedding = nn.Embedding(
                num_embeddings=card,
                embedding_dim=ed,
            )
            embedding_layers.append(embedding)

        self.embeddings = nn.ModuleList(embedding_layers)

        mlp_input_dim = num_numeric_features + sum(embed_dims)

        layers = []
        prev = mlp_input_dim

        for h in hidden_dims:
            layers += [
                nn.Linear(prev, h),
                nn.ReLU(),
                nn.BatchNorm1d(h),
                nn.Dropout(dropout),
            ]
            prev = h

        layers.append(nn.Linear(prev, out_dim))

        self.mlp = nn.Sequential(*layers)

    def forward(self, x_cat, x_num):
        emb_list = [
            emb(x_cat[:, i])
            for i, emb in enumerate(self.embeddings)
        ]

        x = torch.cat(emb_list + [x_num], dim=1)

        return self.mlp(x)