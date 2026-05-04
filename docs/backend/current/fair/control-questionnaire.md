# Control Questionnaire

The control questionnaire captures security control maturity in four FAIR-aligned domains:

- Prevent
- Detect
- Respond
- Contain

Each answer is a maturity score from `0` to `5`. The UI presents contextual answer choices, while the backend stores and scores the numeric maturity values.

## Frontend Files

- `frontend/src/components/controls/SecurityQuestionnairePage.tsx`
- `frontend/src/lib/controlQuestionnaire.ts`
- `frontend/src/api/controls.ts`

## Backend Files

- `backend/app/api/controls.py`
- `backend/app/services/control_questionnaire.py`
- `backend/app/schemas.py`

## Questionnaire JSON Shape

The visible/copyable payload uses nested domains:

```json
{
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
}
```

## Local Frontend Storage

The frontend stores answers in `localStorage` under:

```text
vulncontext.controlQuestionnaire
```

The local format is flat because the FAIR control scorer expects flat keys:

```json
{
  "prevent_patch_maturity": 4,
  "prevent_mfa_maturity": 5,
  "detect_siem_maturity": 4
}
```

`controlQuestionnaire.ts` contains helpers for:

- default values
- reading from local storage
- writing to local storage
- converting flat context to nested context
- converting nested context back to flat context for UI state

## Backend Scoring

File:

- `backend/app/services/control_questionnaire.py`

The service:

1. normalizes nested or flat answers
2. bounds each value between `0` and `5`
3. computes domain scores on a `0-1` scale
4. computes confidence
5. flattens the context for `ControlScoring`
6. returns both nested answers and flat context

Domain score formula:

```text
domain_score = average(domain_answers) / 5
```

Control score formula:

```text
control_score =
  0.35 * prevent_score +
  0.25 * detect_score +
  0.25 * respond_score +
  0.15 * contain_score
```

The service delegates the final weighted control score to:

- `backend/app/services/fair/controls/control_scoring.py`

## Controls API

File:

- `backend/app/api/controls.py`

### Score Only

```http
POST /controls/questionnaire-score
```

Scores a submitted questionnaire but does not save it.

### Save Current Assessment

```http
PUT /controls/current
```

Computes scores and saves the current assessment to Supabase.

Expected Supabase table:

```text
control_assessments
```

Expected columns:

```text
id
created_at
updated_at
control_score
confidence
prevent_score
detect_score
respond_score
contain_score
answers
```

The endpoint uses:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

The Supabase client is created lazily when the endpoint runs. Missing Supabase environment variables return a `503` for this endpoint instead of breaking backend startup.

### Retrieve Current Assessment

```http
GET /controls/current
```

Returns the most recently updated assessment. If no row exists, it returns a default computed assessment without inserting a row.

### Legacy Save Alias

```http
POST /controls/save
```

Alias for saving the current assessment.

### Latest Saved Row

```http
GET /controls/saved/latest
```

Returns the latest saved control assessment row, or `null` if none exists.

## Frontend Save Behavior

The Controls page:

- loads the current saved assessment when the page opens
- writes changes to local storage immediately
- auto-saves to Supabase when an answer changes
- provides a `Save Changes` button for manual save
- saves reset values when reset is clicked

This means the UI can work locally, but real persistence depends on Supabase environment variables and the `control_assessments` table.
