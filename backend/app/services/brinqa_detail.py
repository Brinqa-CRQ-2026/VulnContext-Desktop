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
    "trackingmethod",
    "uuid",
]
SERVICENOW_FIELDS = [
    "uid",
    "application",
    "businessservice",
    "category",
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


def _brinqa_enabled() -> bool:
    return bool(BEARER_TOKEN)


def _build_headers(asset_id: str | None = None) -> dict[str, str]:
    headers = {
        "accept": "application/json, text/plain, */*",
        "authorization": f"Bearer {BEARER_TOKEN}",
        "content-type": "application/json;charset=UTF-8",
        "origin": BASE_URL,
        "referer": f"{BASE_URL}/caasm/hosts/{asset_id}" if asset_id else f"{BASE_URL}/caasm",
        "user-agent": "Mozilla/5.0",
        "x-requested-with": "XMLHttpRequest",
    }
    return headers


def _create_session() -> requests.Session:
    session = requests.Session()
    if SESSION_COOKIE:
        session.cookies.update({"JSESSIONID": SESSION_COOKIE})
    return session


def _fetch_related_source(
    session: requests.Session,
    asset_id: str,
    *,
    resource_name: str,
    integration_name: str,
    model_name: str,
) -> dict[str, str] | None:
    response = session.post(
        RELATED_API_URL,
        headers=_build_headers(asset_id),
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
) -> dict[str, Any] | None:
    response = session.post(
        url,
        headers=_build_headers(asset_id),
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
        )


class BrinqaAssetDetailService:
    def _resolve_source_id(
        self,
        session: requests.Session,
        asset: models.Asset,
        *,
        current_id: str | None,
        resource_name: str,
        integration_name: str,
        model_name: str,
    ) -> str | None:
        if current_id:
            return current_id
        resolved = _fetch_related_source(
            session,
            asset.asset_id,
            resource_name=resource_name,
            integration_name=integration_name,
            model_name=model_name,
        )
        return resolved.get("source_id") if resolved else None

    def get_detail(self, asset: models.Asset) -> DetailResult:
        if not _brinqa_enabled():
            return DetailResult(payload=None, fetched_at=None, source=None)

        session = _create_session()
        payload: dict[str, Any] = {}
        try:
            qualys_id = self._resolve_source_id(
                session,
                asset,
                current_id=asset.qualys_vm_host_id,
                resource_name="qualysvmhosts",
                integration_name="qualys vm",
                model_name="QualysVmHost",
            )
            if qualys_id:
                qualys = _fetch_model_detail(
                    session,
                    url=QUALYS_DETAIL_API_URL_TEMPLATE.format(qualys_id=qualys_id),
                    object_id=qualys_id,
                    asset_id=asset.asset_id,
                    fields=QUALYS_FIELDS,
                )
                if qualys:
                    payload.update(
                        {
                            "uid": qualys.get("uid"),
                            "dnsname": qualys.get("dnsname"),
                            "tracking_method": qualys.get("trackingmethod"),
                            "uuid": qualys.get("uuid"),
                            "last_authenticated_scan": qualys.get("lastauthenticatedscan"),
                            "last_scanned": qualys.get("lastscanned"),
                        }
                    )

            servicenow_id = self._resolve_source_id(
                session,
                asset,
                current_id=asset.servicenow_host_id,
                resource_name="servicenowhosts",
                integration_name="servicenow",
                model_name="ServicenowHost",
            )
            if servicenow_id:
                servicenow = _fetch_model_detail(
                    session,
                    url=SERVICENOW_DETAIL_API_URL_TEMPLATE.format(servicenow_id=servicenow_id),
                    object_id=servicenow_id,
                    asset_id=asset.asset_id,
                    fields=SERVICENOW_FIELDS,
                )
                if servicenow:
                    payload.update(
                        {
                            "uid": payload.get("uid") or servicenow.get("uid"),
                            "uuid": payload.get("uuid") or servicenow.get("uuid"),
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
                        }
                    )
        except requests.RequestException:
            payload = {}
        finally:
            session.close()

        return DetailResult(
            payload=payload or None,
            fetched_at=datetime.now(timezone.utc) if payload else None,
            source="brinqa" if payload else None,
        )


finding_detail_service = BrinqaFindingDetailService()
asset_detail_service = BrinqaAssetDetailService()
