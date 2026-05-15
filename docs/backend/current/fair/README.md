# FAIR Pipeline Documentation

This folder documents the current FAIR-style loss prediction pipeline and how the backend connects it to the React frontend.

The pipeline is used in two UI areas:

- the Controls questionnaire, which captures control maturity and stores/retrieves the current assessment
- the Finding detail page, which can generate a predicted annualized loss distribution for an individual finding

## Documents

- [pipeline-overview.md](pipeline-overview.md)
  End-to-end flow from frontend controls and finding detail UI through backend FAIR simulation.
- [control-questionnaire.md](control-questionnaire.md)
  Questionnaire format, scoring, Supabase upload/retrieve endpoints, and frontend storage.
- [frequency-engine.md](frequency-engine.md)
  TEF, vulnerability, escalation, and LEF pipeline.
- [magnitude-engine.md](magnitude-engine.md)
  Primary and secondary loss magnitude simulation and UI sliders.
- [risk-engine.md](risk-engine.md)
  Annual loss distribution, percentiles, and chart response shape.
- [frontend-backend-contract.md](frontend-backend-contract.md)
  API contracts and file-level connection points between React and FastAPI.

## Current Backend Entry Points

Controls:

- `POST /controls/questionnaire-score`
- `PUT /controls/current`
- `GET /controls/current`
- `POST /controls/save`
- `GET /controls/saved/latest`

Finding-level FAIR loss:

- `POST /findings/{finding_id}/fair-loss`

## Current Frontend Entry Points

- `frontend/src/components/controls/SecurityQuestionnairePage.tsx`
- `frontend/src/components/dashboard/FindingDetailPage.tsx`
- `frontend/src/api/controls.ts`
- `frontend/src/api/findings.ts`
- `frontend/src/lib/controlQuestionnaire.ts`
