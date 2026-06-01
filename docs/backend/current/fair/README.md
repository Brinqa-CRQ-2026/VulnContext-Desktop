# FAIR Pipeline Documentation

This folder documents the current FAIR-style loss prediction pipeline and how the backend connects it to the React frontend.

The pipeline is used in two UI areas:

- the Security Score, which captures control maturity and stores/retrieves the current assessment
- the Business Service detail page, which generates annualized loss exposure for one business-service scenario
- application, asset, and finding pages, which show TEF, LEF, vulnerability, and Security Score without assigning dollar loss

## Documents

- [pipeline-overview.md](pipeline-overview.md)
  End-to-end flow from Security Score and topology UI through backend FAIR simulation.
- [security-score.md](security-score.md)
  Security Score format, scoring, Supabase upload/retrieve endpoints, and frontend storage.
- [frequency-engine.md](frequency-engine.md)
  TEF, vulnerability, escalation, and LEF pipeline.
- [hierarchy-scoring.md](hierarchy-scoring.md)
  Layer-by-layer scoring for findings, assets, applications, and business services.
- [magnitude-engine.md](magnitude-engine.md)
  Primary and secondary loss magnitude simulation and UI sliders.
- [risk-engine.md](risk-engine.md)
  Annual loss distribution, percentiles, and chart response shape.
- [frontend-backend-contract.md](frontend-backend-contract.md)
  API contracts and file-level connection points between React and FastAPI.

## Current Backend Entry Points

Controls:

- `POST /controls/security-score`
- `PUT /controls/current`
- `GET /controls/current`
- `POST /controls/save`
- `GET /controls/saved/latest`

Scope FAIR:

- `POST /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/fair-loss`
- `POST /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}/fair-loss`
- `POST /assets/{asset_id}/fair-loss`
- `POST /findings/{finding_id}/fair-loss`

## Current Frontend Entry Points

- `frontend/src/components/controls/SecurityScorePage.tsx`
- `frontend/src/components/dashboard/FindingDetailPage.tsx`
- `frontend/src/api/controls.ts`
- `frontend/src/api/findings.ts`
- `frontend/src/lib/securityScore.ts`
