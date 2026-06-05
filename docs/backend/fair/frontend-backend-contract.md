# Frontend Backend Contract

This document describes how the React frontend connects to the backend FAIR endpoints.

## Security Score Flow

Frontend files:

- `frontend/src/components/controls/SecurityScorePage.tsx`
- `frontend/src/api/controls.ts`
- `frontend/src/lib/securityScore.ts`

Backend files:

- `backend/app/api/controls.py`
- `backend/app/services/security_score.py`

### Load Current Assessment

The Controls page calls:

```http
GET /controls/current
```

Frontend function:

```ts
getCurrentControlAssessment()
```

If Supabase has a saved row, the frontend converts the nested `answers` back into flat UI state using `fromNestedControlContext()`.

If no row exists, the backend returns default computed answers without inserting a row.

### Save Current Assessment

The Controls page calls:

```http
PUT /controls/current
```

Frontend function:

```ts
saveCurrentControlAssessment(answers)
```

The request body is:

```json
{
  "answers": {
    "prevent": {
      "patch_maturity": 4
    }
  }
}
```

The backend:

1. normalizes answers
2. computes scores
3. saves to Supabase table `control_assessments`
4. returns the saved row shape

### Save Triggers

The UI saves when:

- a security score answer changes
- `Save Changes` is clicked
- reset is clicked

Local storage is still updated immediately so the UI remains usable if backend save fails.

## Finding FAIR Loss Flow

Frontend files:

- `frontend/src/components/business-services/BusinessServiceDetailPage.tsx`
- `frontend/src/components/business-services/ApplicationDetailPage.tsx`
- `frontend/src/components/business-services/AssetFindingsPage.tsx`
- `frontend/src/components/dashboard/FindingDetailPage.tsx`
- `frontend/src/components/fair/FairScopeLossPanel.tsx`
- `frontend/src/components/fair/FairFrequencyPanel.tsx`

Backend files:

- `backend/app/api/topology.py`
- `backend/app/api/findings.py`
- `backend/app/services/fair/loss_prediction.py`
- `backend/app/services/fair/scope_loss_prediction.py`

### Generate FAIR Metrics

Business service pages call:

```http
POST /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/fair-loss
```

Application pages call:

```http
POST /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}/fair-loss
```

Asset pages call:

```http
POST /assets/{asset_id}/fair-loss
```

Finding pages call:

```http
POST /findings/{finding_id}/fair-loss
```

Frontend functions:

```ts
predictBusinessServiceFairLoss(businessUnitSlug, businessServiceSlug, payload)
predictApplicationFairLoss(businessUnitSlug, businessServiceSlug, applicationSlug, payload)
predictAssetFairLoss(assetId, payload)
predictFindingFairLoss(findingId, payload)
```

Request body:

```json
{
  "control_context": {
    "prevent": {
      "patch_maturity": 4,
      "mfa_maturity": 5,
      "segmentation_maturity": 3,
      "hardening_maturity": 4
    },
    "detect": {
      "logging_maturity": 3,
      "siem_maturity": 4,
      "speed_maturity": 3
    },
    "respond": {
      "plan_maturity": 4,
      "speed_maturity": 3,
      "automation_maturity": 2
    },
    "contain": {
      "edr_maturity": 4,
      "privilege_maturity": 3,
      "data_maturity": 5
    }
  },
  "primary_loss_mean": 50000,
  "secondary_loss_mean": 15000,
  "iterations": 10000
}
```

Response body includes:

```text
control_score
vulnerability
tef_mean
lef_mean
loss_mean
loss_p50
loss_p90
loss_p95
loss_p99
worst_loss
lm_mean
primary_mean
secondary_mean
histogram
```

Business service frontend renders:

- expected annual loss
- P90/P95/worst modeled year
- LEF and TEF
- Security Score
- vulnerability
- primary and secondary loss mean sliders

Application, asset, and finding frontends render:

- TEF
- LEF
- vulnerability
- Security Score

They do not ask for monetary loss assumptions in the UI.

## TypeScript API Files

`frontend/src/api/controls.ts` owns security score assessment requests.

`frontend/src/api/findings.ts` owns finding loss prediction requests.

`frontend/src/api/topology.ts` owns business-service, application, and asset FAIR requests.

`frontend/src/api/types.ts` contains:

- `ControlAssessment`
- `FairLossPredictionRequest`
- `FairLossPredictionResponse`

## Backend Schema Files

`backend/app/schemas.py` contains:

- `SecurityScoreRequest`
- `SecurityScoreResponse`
- `ControlAssessmentRequest`
- `ControlAssessmentResponse`
- `FairLossPredictionRequest`
- `FairLossPredictionResponse`

## Error Behavior

Supabase-dependent controls endpoints require:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

If either is missing, controls persistence returns `503`.

If Supabase rejects the query or insert/update, controls persistence returns `502`.
