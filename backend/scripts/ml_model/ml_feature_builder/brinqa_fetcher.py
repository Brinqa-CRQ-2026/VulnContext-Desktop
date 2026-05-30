from typing import Any

from bql_Client import BrinqaBQLClient, chunked

from config import (
    CONTAINER_BATCH_SIZE,
    FINDING_DEF_FIELDS,
    HOST_FIELDS,
    LIMIT,
    VULN_FIELDS,
)


def fetch_hosts(client: BrinqaBQLClient) -> list[dict[str, Any]]:
    return client.paged_dataset(
        calling_context={
            "rootContextType": "DATA_MODEL",
            "rootContextName": "hostDefaultList",
            "viewType": "LIST",
            "rootDataModel": "Host",
            "returnDataModel": "Host",
        },
        query='FIND Host AS h WHERE h.__appName__ = "caasm"',
        returning_fields=HOST_FIELDS,
        limit=LIMIT,
        refresh=True,
        # max_pages= 1,
    )


def fetch_vulnerability_page(
    client: BrinqaBQLClient,
    *,
    skip: int,
    limit: int,
) -> list[dict[str, Any]]:
    payload = {
        "callingContext": {
            "rootContextType": "DATA_MODEL",
            "rootContextName": "vulnerabilityDefaultList",
            "viewType": "LIST",
            "rootDataModel": "Vulnerability",
            "returnDataModel": "Vulnerability",
        },
        "query": 'FIND Vulnerability AS v WHERE v.__appName__ = "caasm"',
        "limit": limit,
        "skip": skip,
        "returningFields": VULN_FIELDS,
        "format": "dataset",
        "refresh": True,
    }

    return client.post(payload)


def fetch_finding_definitions(client: BrinqaBQLClient) -> list[dict[str, Any]]:
    return client.paged_dataset(
        calling_context={
            "rootContextType": "DATA_MODEL",
            "rootContextName": "findingDefinitionDefaultList",
            "viewType": "LIST",
            "rootDataModel": "FindingDefinition",
            "returnDataModel": "FindingDefinition",
        },
        query="FIND FindingDefinition AS f WHERE f.cveIds IS NOT NULL",
        returning_fields=FINDING_DEF_FIELDS,
        limit=LIMIT,
        refresh=True,
        # max_pages = 1,
    )


def build_container_lookup(
    client: BrinqaBQLClient,
    container_ids: list[int],
) -> dict[int, dict[str, Any]]:
    if not container_ids:
        return {}

    unique_ids = sorted(set(int(x) for x in container_ids))

    calling_context = {
        "rootContextType": "DATA_MODEL",
        "rootContextName": "containerDefaultList",
        "viewType": "LIST",
        "rootDataModel": "Container",
        "returnDataModel": "Container",
    }

    fields = ["id", "hostId", "environments", "profiles", "technologies", "type"]

    container_by_id = {}

    for batch in chunked(unique_ids, CONTAINER_BATCH_SIZE):
        clauses = " OR ".join(f"c.id = {int(x)}" for x in batch)
        query = f'FIND Container AS c WHERE ({clauses}) AND c.__appName__ = "caasm"'

        payload = {
            "callingContext": calling_context,
            "query": query,
            "limit": 5000,
            "skip": 0,
            "returningFields": fields,
            "format": "dataset",
            "refresh": True,
        }

        rows = client.post(payload)

        for row in rows:
            container_id = row.get("id")
            if container_id is not None:
                container_by_id[int(container_id)] = row

    return container_by_id