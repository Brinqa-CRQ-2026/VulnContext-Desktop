from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import requests
from sqlalchemy.orm import Session

from app import models

BASE_URL = os.getenv("BRINQA_BASE_URL", "https://ucsc.brinqa.net").rstrip("/")
BQL_API_URL = f"{BASE_URL}/api/caasm/bql"
RELATED_API_URL = f"{BASE_URL}/api/caasm/bql/related"
QUALYS_DETAIL_API_URL_TEMPLATE = f"{BASE_URL}/api/caasm/model/qualysVmHosts/{{qualys_id}}/"
SERVICENOW_DETAIL_API_URL_TEMPLATE = f"{BASE_URL}/api/caasm/model/servicenowHosts/{{servicenow_id}}/"

BEARER_TOKEN = os.getenv("BRINQA_BEARER_TOKEN", "").strip()
SESSION_COOKIE = os.getenv("BRINQA_JSESSIONID", "").strip()

RELATED_QUERY = "Find SourceModel as s THAT SOURCED_FROM << Host"
QUALYS_FIELDS = [
    "uid",
    "dnsname",
    "hostnameIdentifier",
    "lastauthenticatedscan",
    "lastscanned",
    "macAddressesIdentifier",
    "trackingmethod",
    "uuid",
]
SERVICENOW_FIELDS = [
    "uid",
    "application",
    "businessservice",
    "category",
    "complianceflags",
    "devicetype",
    "division",
    "itSme",
    "itdirector",
    "internalorexternal",
    "location",
    "owner",
    "pci",
    "pii",
    "serviceteam",
    "uuid",
    "virtualorphysical",
]
FINDING_DETAIL_FIELDS = [
    "summary",
    "description",
    "recordLink",
    "sourceStatus",
    "severity",
    "dueDate",
    "attackPatternNames",
    "attackTechniqueNames",
    "attackTacticNames",
    "riskOwnerName",
    "remediationOwnerName",
    "remediationStatus",
]


@dataclass
class DetailResult:
    payload: dict[str, Any] | None
    fetched_at: datetime | None
    source: str | None
    error: str | None = None
    status: str | None = None
    reason: str | None = None


@dataclass(frozen=True)
class SourceAttempt:
    name: str
    payload: dict[str, Any] | None
    reason: str | None
    source_id: str | None = None
    succeeded: bool = False
    unauthorized: bool = False
    upstream_error: bool = False


class BrinqaRequestError(Exception):
    def __init__(self, reason: str, *, unauthorized: bool = False):
        super().__init__(reason)
        self.reason = reason
        self.unauthorized = unauthorized


@dataclass(frozen=True)
class BrinqaAuthContext:
    bearer_token: str
    session_cookie: str | None = None


def _clean(value: Any) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _flatten_value(value: Any) -> Any:
    if isinstance(value, list):
        parts = []
        for item in value:
            if isinstance(item, dict):
                parts.append(
                    str(
                        item.get("displayName")
                        or item.get("name")
                        or item.get("title")
                        or item.get("id")
                        or item
                    )
                )
            else:
                parts.append(str(item))
        return " | ".join(parts)

    if isinstance(value, dict):
        return (
            value.get("displayName")
            or value.get("name")
            or value.get("title")
            or value.get("id")
            or str(value)
        )

    return value


def _normalize_record(record: dict[str, Any]) -> dict[str, Any]:
    return {key: _flatten_value(value) for key, value in record.items()}


def _resolve_bearer_token(auth: BrinqaAuthContext | None = None) -> str:
    if auth and auth.bearer_token.strip():
        return auth.bearer_token.strip()
    return BEARER_TOKEN


def _resolve_session_cookie(auth: BrinqaAuthContext | None = None) -> str:
    if auth and auth.session_cookie and auth.session_cookie.strip():
        return auth.session_cookie.strip()
    return SESSION_COOKIE


def _brinqa_enabled(auth: BrinqaAuthContext | None = None) -> bool:
    return bool(_resolve_bearer_token(auth))


def _build_headers(
    asset_id: str | None = None,
    auth: BrinqaAuthContext | None = None,
) -> dict[str, str]:
    headers = {
        "accept": "application/json, text/plain, */*",
        "authorization": f"Bearer {_resolve_bearer_token(auth)}",
        "content-type": "application/json;charset=UTF-8",
        "origin": BASE_URL,
        "referer": f"{BASE_URL}/caasm/hosts/{asset_id}" if asset_id else f"{BASE_URL}/caasm",
        "user-agent": "Mozilla/5.0",
        "x-requested-with": "XMLHttpRequest",
    }
    return headers


def _create_session(auth: BrinqaAuthContext | None = None) -> requests.Session:
    session = requests.Session()
    session_cookie = _resolve_session_cookie(auth)
    if session_cookie:
        session.cookies.update({"JSESSIONID": session_cookie})
    return session


def _fetch_related_source(
    session: requests.Session,
    asset_id: str,
    *,
    resource_name: str,
    integration_name: str,
    model_name: str,
    auth: BrinqaAuthContext | None = None,
) -> dict[str, str] | None:
    response = session.post(
        RELATED_API_URL,
        headers=_build_headers(asset_id, auth),
        json={
            "allowBqlUsingKeyword": None,
            "callingContext": None,
            "query": RELATED_QUERY,
            "countOnly": None,
            "limit": None,
            "returningFields": ["uid", "dataModelTitle", "sourceIcon", "dataIntegrationTitle"],
            "skip": None,
            "orderBy": None,
            "filter": None,
            "text": None,
            "mainId": asset_id,
            "format": "dataset",
            "source": None,
            "relationshipQuery": RELATED_QUERY,
        },
        timeout=20,
    )
    response.raise_for_status()

    data = response.json()
    rows = data.get("data") if isinstance(data, dict) else None
    if not isinstance(rows, list):
        return None

    target_model = model_name.lower()
    target_resource = resource_name.lower()
    target_integration = integration_name.lower()

    for row in rows:
        if not isinstance(row, dict):
            continue
        metadata = row.get("$metadata") or {}
        row_model = str(metadata.get("dataModelName") or row.get("dataModelTitle") or "").lower()
        row_resource = str(metadata.get("resource") or "").lower()
        row_integration = str(row.get("dataIntegrationTitle") or "").lower()
        if (
            target_model in row_model
            or row_resource == target_resource
            or row_integration == target_integration
        ):
            return {
                "source_id": _clean(row.get("id")) or "",
            }
    return None


def _fetch_model_detail(
    session: requests.Session,
    *,
    url: str,
    object_id: str,
    asset_id: str,
    fields: list[str],
    auth: BrinqaAuthContext | None = None,
) -> dict[str, Any] | None:
    response = session.post(
        url,
        headers=_build_headers(asset_id, auth),
        json={
            "fields": fields,
            "callingContext": {
                "rootContextType": "DATA_MODEL",
                "rootContextObjectId": object_id,
            },
        },
        timeout=20,
    )
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, dict) or not data:
        return None
    return _normalize_record(data)


def _parse_date_text(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _normalize_request_error(exc: requests.RequestException, *, reason: str) -> BrinqaRequestError:
    response = getattr(exc, "response", None)
    status_code = getattr(response, "status_code", None)
    if status_code in {401, 403}:
        return BrinqaRequestError("brinqa_unauthorized", unauthorized=True)
    return BrinqaRequestError(reason)


class BrinqaFindingDetailService:
    def _local_enrichment_payload(self, db: Session, finding: models.Finding) -> dict[str, Any]:
        payload: dict[str, Any] = {}
        cve_id = _clean(finding.cve_id)
        if not cve_id:
            return payload

        nvd = db.get(models.NvdRecord, cve_id)
        if nvd is not None:
            payload["cvss_score"] = nvd.cvss_score
            payload["cvss_severity"] = nvd.cvss_severity

        epss = db.get(models.EPSSScore, cve_id)
        if epss is not None:
            payload["epss_score"] = epss.epss
            payload["epss_percentile"] = epss.percentile
            if epss.is_kev is not None:
                payload["is_kev"] = bool(epss.is_kev)

        kev = db.get(models.KevRecord, cve_id)
        if kev is not None:
            payload["is_kev"] = True
            payload["kev_date_added"] = kev.date_added
            payload["kev_due_date"] = kev.due_date
            payload["kev_vendor_project"] = kev.vendor_project
            payload["kev_product"] = kev.product
            payload["kev_vulnerability_name"] = kev.vulnerability_name
            payload["kev_short_description"] = kev.short_description

        return payload

    def _brinqa_fallback_payload(self, finding: models.Finding) -> dict[str, Any]:
        if not _brinqa_enabled():
            return {}

        session = _create_session()
        try:
            response = session.post(
                BQL_API_URL,
                headers=_build_headers(finding.asset_id),
                json={
                    "allowBqlUsingKeyword": None,
                    "callingContext": {
                        "rootContextType": "DATA_MODEL",
                        "rootContextName": "vulnerabilityDefaultList",
                        "viewType": "LIST",
                        "rootDataModel": "Vulnerability",
                        "returnDataModel": "Vulnerability",
                    },
                    "query": (
                        'FIND Vulnerability AS v WHERE v.__appName__ = "caasm" '
                        f"AND v.id = {finding.finding_id} WITH DISTINCT v"
                    ),
                    "countOnly": None,
                    "limit": 1,
                    "returningFields": FINDING_DETAIL_FIELDS,
                    "skip": 0,
                    "orderBy": None,
                    "filter": None,
                    "text": None,
                    "mainId": None,
                    "format": "dataset",
                    "source": None,
                    "relationshipQuery": None,
                    "refresh": False,
                },
                timeout=20,
            )
            response.raise_for_status()
            payload = response.json()
            rows = payload.get("results") or payload.get("items") or payload.get("data") or []
            if not isinstance(rows, list) or not rows:
                return {}
            row = rows[0]
            if not isinstance(row, dict):
                return {}
            normalized = _normalize_record(row)
            return {
                "summary": normalized.get("summary"),
                "description": normalized.get("description"),
                "record_link": normalized.get("recordLink"),
                "source_status": normalized.get("sourceStatus"),
                "severity": normalized.get("severity"),
                "due_date": normalized.get("dueDate"),
                "attack_pattern_names": normalized.get("attackPatternNames"),
                "attack_technique_names": normalized.get("attackTechniqueNames"),
                "attack_tactic_names": normalized.get("attackTacticNames"),
                "risk_owner_name": normalized.get("riskOwnerName"),
                "remediation_owner_name": normalized.get("remediationOwnerName"),
                "remediation_status": normalized.get("remediationStatus"),
            }
        except requests.RequestException:
            return {}
        finally:
            session.close()

    def get_detail(self, db: Session, finding: models.Finding) -> DetailResult:
        payload = self._local_enrichment_payload(db, finding)
        source = "local" if payload else None

        brinqa_payload = self._brinqa_fallback_payload(finding)
        if brinqa_payload:
            payload = {**brinqa_payload, **payload}
            source = "local+brinqa" if source else "brinqa"

        return DetailResult(
            payload=payload or None,
            fetched_at=datetime.now(timezone.utc) if payload else None,
            source=source,
            error=None,
        )


class BrinqaAssetDetailService:
    def _fetch_source_attempt(
        self,
        session: requests.Session,
        asset: models.Asset,
        *,
        source_name: str,
        current_id: str | None,
        resource_name: str,
        integration_name: str,
        model_name: str,
        detail_url: str,
        detail_fields: list[str],
        payload_builder,
        auth: BrinqaAuthContext | None = None,
    ) -> SourceAttempt:
        try:
            source_id = self._resolve_source_id(
                session,
                asset,
                current_id=current_id,
                resource_name=resource_name,
                integration_name=integration_name,
                model_name=model_name,
                auth=auth,
            )
        except requests.RequestException as exc:
            normalized = _normalize_request_error(exc, reason=f"{source_name}_lookup_failed")
            return SourceAttempt(
                name=source_name,
                payload=None,
                reason=normalized.reason,
                unauthorized=normalized.unauthorized,
                upstream_error=not normalized.unauthorized,
            )

        if not source_id:
            return SourceAttempt(
                name=source_name,
                payload=None,
                reason=f"{source_name}_source_missing",
            )

        try:
            detail = _fetch_model_detail(
                session,
                url=detail_url.format(**{f"{source_name}_id": source_id}),
                object_id=source_id,
                asset_id=asset.asset_id,
                fields=detail_fields,
                auth=auth,
            )
        except requests.RequestException as exc:
            normalized = _normalize_request_error(exc, reason=f"{source_name}_detail_failed")
            return SourceAttempt(
                name=source_name,
                payload=None,
                reason=normalized.reason,
                source_id=source_id,
                unauthorized=normalized.unauthorized,
                upstream_error=not normalized.unauthorized,
            )

        if not detail:
            return SourceAttempt(
                name=source_name,
                payload=None,
                reason=f"{source_name}_detail_failed",
                source_id=source_id,
                upstream_error=True,
            )

        return SourceAttempt(
            name=source_name,
            payload=payload_builder(detail),
            reason=None,
            source_id=source_id,
            succeeded=True,
        )

    def _qualys_payload(self, qualys: dict[str, Any]) -> dict[str, Any]:
        return {
            "uid": qualys.get("uid"),
            "dnsname": qualys.get("dnsname"),
            "mac_addresses": qualys.get("macAddressesIdentifier"),
            "tracking_method": qualys.get("trackingmethod"),
            "uuid": qualys.get("uuid"),
            "last_authenticated_scan": qualys.get("lastauthenticatedscan"),
            "last_scanned": qualys.get("lastscanned"),
        }

    def _servicenow_payload(self, servicenow: dict[str, Any]) -> dict[str, Any]:
        return {
            "uid": servicenow.get("uid"),
            "uuid": servicenow.get("uuid"),
            "owner": servicenow.get("owner"),
            "service_team": servicenow.get("serviceteam"),
            "division": servicenow.get("division"),
            "it_sme": servicenow.get("itSme"),
            "it_director": servicenow.get("itdirector"),
            "location": servicenow.get("location"),
            "internal_or_external": servicenow.get("internalorexternal"),
            "device_type": servicenow.get("devicetype"),
            "category": servicenow.get("category"),
            "virtual_or_physical": servicenow.get("virtualorphysical"),
            "compliance_flags": servicenow.get("complianceflags"),
            "pci": servicenow.get("pci"),
            "pii": servicenow.get("pii"),
        }

    def _resolve_source_id(
        self,
        session: requests.Session,
        asset: models.Asset,
        *,
        current_id: str | None,
        resource_name: str,
        integration_name: str,
        model_name: str,
        auth: BrinqaAuthContext | None = None,
    ) -> str | None:
        if current_id:
            return current_id
        resolved = _fetch_related_source(
            session,
            asset.asset_id,
            resource_name=resource_name,
            integration_name=integration_name,
            model_name=model_name,
            auth=auth,
        )
        return resolved.get("source_id") if resolved else None

    def get_detail(
        self,
        asset: models.Asset,
        auth: BrinqaAuthContext | None = None,
    ) -> DetailResult:
        if not _brinqa_enabled(auth):
            return DetailResult(
                payload=None,
                fetched_at=None,
                source=None,
                status="missing_token",
                reason="missing_auth_token",
            )

        session = _create_session(auth)
        try:
            qualys_attempt = self._fetch_source_attempt(
                session,
                asset,
                source_name="qualys",
                current_id=asset.qualys_vm_host_id,
                resource_name="qualysvmhosts",
                integration_name="qualys vm",
                model_name="QualysVmHost",
                detail_url=QUALYS_DETAIL_API_URL_TEMPLATE,
                detail_fields=QUALYS_FIELDS,
                payload_builder=self._qualys_payload,
                auth=auth,
            )
            servicenow_attempt = self._fetch_source_attempt(
                session,
                asset,
                source_name="servicenow",
                current_id=asset.servicenow_host_id,
                resource_name="servicenowhosts",
                integration_name="servicenow",
                model_name="ServicenowHost",
                detail_url=SERVICENOW_DETAIL_API_URL_TEMPLATE,
                detail_fields=SERVICENOW_FIELDS,
                payload_builder=self._servicenow_payload,
                auth=auth,
            )
        finally:
            session.close()

        attempts = [qualys_attempt, servicenow_attempt]
        if any(attempt.unauthorized for attempt in attempts):
            return DetailResult(
                payload=None,
                fetched_at=None,
                source=None,
                error="brinqa_unauthorized",
                status="unauthorized_token",
                reason="brinqa_unauthorized",
            )

        payload: dict[str, Any] = {}
        successful_sources: list[str] = []
        for attempt in attempts:
            if not attempt.succeeded or not attempt.payload:
                continue
            successful_sources.append(attempt.name)
            if attempt.name == "qualys":
                payload.update(attempt.payload)
                continue
            payload.update(
                {
                    **attempt.payload,
                    "uid": payload.get("uid") or attempt.payload.get("uid"),
                    "uuid": payload.get("uuid") or attempt.payload.get("uuid"),
                }
            )

        if len(successful_sources) == len(attempts):
            return DetailResult(
                payload=payload or None,
                fetched_at=datetime.now(timezone.utc) if payload else None,
                source="+".join(successful_sources),
                status="success",
                reason="both_sources_succeeded",
            )

        if len(successful_sources) == 1:
            failed_attempt = next(attempt for attempt in attempts if not attempt.succeeded)
            return DetailResult(
                payload=payload or None,
                fetched_at=datetime.now(timezone.utc) if payload else None,
                source=successful_sources[0],
                status="partial_success",
                reason=failed_attempt.reason or "partial_source_unavailable",
            )

        if all(attempt.reason and attempt.reason.endswith("_source_missing") for attempt in attempts):
            return DetailResult(
                payload=None,
                fetched_at=None,
                source=None,
                status="no_related_source",
                reason="no_related_source",
            )

        first_upstream_reason = next(
            (
                attempt.reason
                for attempt in attempts
                if attempt.upstream_error and attempt.reason
            ),
            None,
        )
        return DetailResult(
            payload=None,
            fetched_at=None,
            source=None,
            error=first_upstream_reason or "upstream_request_failed",
            status="upstream_error",
            reason=first_upstream_reason or "upstream_request_failed",
        )


finding_detail_service = BrinqaFindingDetailService()
asset_detail_service = BrinqaAssetDetailService()
