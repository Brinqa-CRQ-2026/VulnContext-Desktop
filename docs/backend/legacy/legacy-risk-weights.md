# Legacy Risk Weights And Rescoring

This documents the pre-refactor risk-weight feature before it was deferred from the active runtime.

## What It Did

- Exposed stored scoring weights through `/risk-weights`
- Allowed updating weights through `PUT /risk-weights`
- Recomputed `internal_risk_score` and `internal_risk_band` for all findings after a weight update

## Where It Lived

- `backend/app/api/risk_weights.py`
- `backend/app/core/risk_weights.py`
- `backend/app/scoring.py`
- parts of `backend/app/api/common.py`

## Runtime Dependencies

- `risk_scoring_config`
- `scored_findings`

## Inputs And Outputs

- Input: weight values for CVSS, EPSS, KEV, asset criticality, and context score
- Output: persisted config row plus rescored finding rows

## Core Rules

- weights had to be between `0` and `1`
- display risk preferred `internal_risk_score` over vendor `risk_score`
- risk bands were derived from the recomputed internal score

## External Dependencies

- no direct network dependency
- depended on already-enriched finding fields existing locally

## Reimplementation Requirements

- restore a persisted scoring-config table
- restore rich finding fields such as CVSS, EPSS, KEV, and context score
- restore rescoring logic and a route that updates all findings safely
