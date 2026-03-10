import os
import json
import ast
import re
from typing import Any, Dict, List, Optional

import pandas as pd
from bql_Client import BrinqaBQLClient, chunked

API_URL = "https://ucsc.brinqa.net/api/caasm/bql"

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
VULNS_PATH = os.path.join(BASE_DIR, "vulnerabilities_export.csv")
HOSTS_PATH = os.path.join(BASE_DIR, "hosts_export.csv")
OUT_PATH = os.path.join(BASE_DIR, "model2_training_dataset_trimmed.csv")

# Reduce to avoid request limits
CONTAINER_BATCH_SIZE = 200

CVE_RE = re.compile(r"\bCVE-\d{4}-\d{4,7}\b", re.IGNORECASE)

"""
Parse Brinqa CSV cells that might contain: real python list/dict (already parsed), JSON string, python-literal string, empty/None
Return parsed object or original string.
"""
def safe_parse_any(x: Any) -> Any:
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return None
    # If the panda dataframe already converted to python dict or list, do nothing
    if isinstance(x, (list, dict)):
        return x
    s = str(x).strip()
    if s in ("", "[]", "{}", "None", "null", "nan"):
        if s == "[]":
            return []
        if s == "{}":
            return {}
        return None
    try:
        # try to parse the jason object to python object
        return json.loads(s)
    except Exception:
        try:
            # python literal parsing if the json object failed
            return ast.literal_eval(s)
        except Exception:
            return s  # leave as raw string


def safe_parse_list(x: Any) -> List[Any]:
    v = safe_parse_any(x)
    if v is None:
        return []
    if isinstance(v, list):
        return v
    if isinstance(v, dict):
        return [v]
    return []


def extract_display_values(x: Any) -> List[str]:
    """
    Normalize Brinqa "reference objects" into list of display strings.
    Works for:
      - [{'displayName':'Prod', '$metadata':{'displayValue':'Prod'}}]
      - [{'__dataModel__':..., '$metadata': {'displayValue': 'Unknown'}, 'displayName':'Unknown'}]
      - JSON string of above
    """
    # Convert the input to a list of objects
    items = safe_parse_list(x)
    out: List[str] = []

    for it in items:
        if not isinstance(it, dict):
            continue

        dn = it.get("displayName")
        if dn and str(dn).strip():
            out.append(str(dn).strip())
            continue

        md = it.get("$metadata") or {}
        if isinstance(md, str):
            md = safe_parse_any(md)
        if isinstance(md, dict):
            dv = md.get("displayValue")
            if dv and str(dv).strip():
                out.append(str(dv).strip())
                continue
    # Delete the duplication of the asset
    seen = set()
    deduped = []
    for v in out:
        if v not in seen:
            seen.add(v)
            deduped.append(v)
    return deduped

"""
Normalize publicIpAddresses from hosts_export.csv into a list of IP strings.
"""
def extract_ip_list(x: Any) -> List[str]:
    v = safe_parse_any(x)
    if v is None:
        return []
    if isinstance(v, list):
        result = []
        for i in v:
            s = str(i).strip()
            if s:
                result.append(s)
        return result
    # if it was just a single IP address, just return it
    if isinstance(v, str):
        s = v.strip()
        if not s or s.lower() in ("none", "null", "nan", "[]"):
            return []
        return [s]
    return []
"""
internet_exposed = 1 if host has any public IP address, else 0
"""
def is_internet_exposed(host_row: pd.Series) -> int:
    ips = extract_ip_list(host_row.get("publicIpAddresses"))
    if len(ips) > 0:
        return 1
    else:
        return 0
"""
Return a single string for CSV/model features.
Handles: reference objects (dict/list/JSON-string) and plain strings like "AWS"
"""
def join_display_values(x: Any, sep: str = "|") -> Optional[str]:
    # Normalize all the values from the cvs to python object
    v = safe_parse_any(x)

    # plain scalar string/number
    if isinstance(v, (str, int, float)) and v is not None and not (isinstance(v, float) and pd.isna(v)):
        s = str(v).strip()
        if s and s.lower() not in ("none", "null", "nan"):
            return s
        else:
            return None

    # reference objects
    vals = extract_display_values(v)
    if vals:
        return sep.join(vals)
    else:
        return None



# CVE_ID extraction
def extract_cve_id(row: pd.Series) -> Optional[str]:
    for c in (row.get("displayName"), row.get("summary")):
        if c is None or (isinstance(c, float) and pd.isna(c)):
            continue
        m = CVE_RE.search(str(c))
        if m:
            return m.group(0).upper()

    md = row.get("$metadata")
    md_obj = safe_parse_any(md)
    if isinstance(md_obj, dict):
        m = CVE_RE.search(str(md_obj.get("displayValue", "")))
        if m:
            return m.group(0).upper()

    return None


# The target might contains nested asset references, we need to flattens them and later join with the host/container info
def extract_target_rows(vuln_df: pd.DataFrame) -> pd.DataFrame:
    out = []
    for _, r in vuln_df.iterrows():
        targets = safe_parse_list(r.get("targets"))
        for t in targets:
            if not isinstance(t, dict):
                continue
            md = t.get("$metadata") or {}
            if isinstance(md, str):
                md = safe_parse_any(md)
            # If the parsing failed, reset the metadata to empty dictionary to prevent the crash later
            if not isinstance(md, dict):
                md = {}
            out.append({
                "vulnerability_id": r.get("id"),
                "vulnerability_uid": r.get("uid"),
                "target_model": md.get("dataModelName"),
                "target_id": t.get("id"),
                "target_displayName": t.get("displayName"),
            })
    return pd.DataFrame(out)

# look for the host_id in the container
def container_host_id(container_obj: Dict[str, Any]) -> Optional[int]:
    # direct hostId
    hid = container_obj.get("hostId")
    if hid not in (None, "", "null"):
        try:
            return int(hid)
        except Exception:
            pass
    return None

# To create a dictionary, key is the container ID and values is the object included all the data fields related to container
def build_container_lookup(client: BrinqaBQLClient, container_ids: List[int]) -> Dict[int, Dict[str, Any]]:
    if not container_ids:
        return {}
    # It tell the brinqa's server the type of object you are querying
    calling_context = {
        "rootContextType": "DATA_MODEL",
        "rootContextName": "containerDefaultList",
        "viewType": "LIST",
        "rootDataModel": "Container",
        "returnDataModel": "Container",
    }

    clean_ids = []
    for x in container_ids:
        clean_ids.append(int(x))
    unique_ids_set = set(clean_ids)
    unique_ids = sorted(unique_ids_set)

    # The data fields want to fetch for the related container
    FIELDS = ["id", "hostId", "environments", "profiles", "technologies", "type"]

    print(f"Container lookup: {len(unique_ids)} unique container ids")

    container_by_id: Dict[int, Dict[str, Any]] = {}
    # batch the API request to speed up the speed and prevent exceed API limits
    for i, batch in enumerate(chunked(unique_ids, CONTAINER_BATCH_SIZE), start=1):
        clauses = " OR ".join(f"c.id = {int(x)}" for x in batch)
        # To return all the container Id with the corresponding IDs
        query = f'FIND Container AS c WHERE ({clauses}) AND c.__appName__ = "caasm"'
        # request body send to the brinqa api
        payload = {
            "callingContext": calling_context,
            "query": query,
            "limit": 5000,
            "skip": 0,
            "returningFields": FIELDS,
            "format": "dataset",
            "refresh": True,
        }
        rows = client.post(payload)
        for obj in rows:
            cid = obj.get("id")
            if cid is None:
                continue
            container_by_id[int(cid)] = obj
        print(f"  batch {i}: +{len(rows)} (lookup size {len(container_by_id)})")

    return container_by_id

# Main
def main():
    if not os.path.exists(VULNS_PATH):
        raise FileNotFoundError(f"Missing input: {VULNS_PATH} (run export_vulnerabilities.py)")
    if not os.path.exists(HOSTS_PATH):
        raise FileNotFoundError(f"Missing input: {HOSTS_PATH} (run export_hosts.py)")

    client = BrinqaBQLClient(
        api_url=API_URL,
        origin="https://ucsc.brinqa.net",
        referer="https://ucsc.brinqa.net/caasm",
        timeout_sec=90,
    )

    # Read CSVs
    vulns = pd.read_csv(VULNS_PATH, low_memory=False)
    hosts = pd.read_csv(HOSTS_PATH, low_memory=False)

    # Normalize blanks, replace all the empty block with Null value
    vulns.replace(r"^\s*$", pd.NA, regex=True, inplace=True)
    hosts.replace(r"^\s*$", pd.NA, regex=True, inplace=True)

    # Extract CVE ID
    vulns["cve_id"] = vulns.apply(extract_cve_id, axis=1)
    
    # print("displayName", vulns["displayName"].str.contains("CVE-", na=False).sum())
    # print("summary",vulns["summary"].str.contains("CVE-", na=False).sum())

    # Host lookup, a dictionary with host_id as key and data fields object as values
    hosts_by_id = {}
    # loop through evey row of the dataframe, (index, object)
    # r is the object that contain all data fields.
    for _, r in hosts.iterrows():
        host_id = r.get("id")
        if pd.notna(host_id):
            host_id = int(host_id)
            hosts_by_id[host_id] = r

    # Expand targets
    vt = extract_target_rows(vulns)
    # we want to do a left join on the vuln_target dataframe and the vuln definition df based on vuln_ID
    merged = vt.merge(vulns, left_on="vulnerability_id", right_on="id", how="left", suffixes=("", "_v"))

    # Collect container ids
    container_target_ids: List[int] = []
    for _, r in merged.iterrows():
        if str(r.get("target_model") or "").strip().lower() == "container" and pd.notna(r.get("target_id")):
            try:
                container_target_ids.append(int(r.get("target_id")))
            except Exception:
                pass

    # Make a container dictionary
    container_by_id = build_container_lookup(client, container_target_ids)

    # Build output row
    out_rows = []

    for _, r in merged.iterrows():
        target_model = str(r.get("target_model") or "").strip()
        target_id = r.get("target_id")

        linked_host_id = None
        asset_env = None
        asset_profiles = None
        asset_type = None

        internet_exposed = 0

        # If target is Host
        if target_model.lower() == "host" and pd.notna(target_id):
            linked_host_id = int(target_id)

            if linked_host_id in hosts_by_id:
                hrow = hosts_by_id[linked_host_id]
                asset_env = join_display_values(hrow.get("environments"))
                asset_profiles = join_display_values(hrow.get("profiles"))
                asset_type = join_display_values(hrow.get("type"))
                internet_exposed = is_internet_exposed(hrow)

        # If target is Container and the container run on the host
        elif target_model.lower() == "container" and pd.notna(target_id):
            cid = int(target_id)
            cobj = container_by_id.get(cid) or {}
            
            if cobj:
                linked_host_id = container_host_id(cobj)
            else:
                linked_host_id = None

            asset_env = join_display_values(cobj.get("environments"))
            asset_profiles = join_display_values(cobj.get("profiles"))
            asset_type = join_display_values(cobj.get("type"))

            # compute exposure via mapped host
            if linked_host_id is not None and linked_host_id in hosts_by_id:
                internet_exposed = is_internet_exposed(hosts_by_id[linked_host_id])

        row_out = {
            "cve_id": r.get("cve_id"),
            "target_model": target_model,
            "ageInDays": r.get("ageInDays"),

            "asset_environments": asset_env,
            "asset_profiles": asset_profiles,
            "asset_type": asset_type,

            "internet_exposed": internet_exposed,
        }

        # Host enrichment fields
        if linked_host_id is not None and linked_host_id in hosts_by_id:
            h = hosts_by_id[linked_host_id].to_dict()
            row_out.update({
                "host_osFamily": join_display_values(h.get("osFamily")),
                "host_cloudProvider": join_display_values(h.get("cloudProvider")),
            })

        out_rows.append(row_out)

    out_df = pd.DataFrame(out_rows)
    out_df.to_csv(OUT_PATH, index=False)

    print(f"wrote {OUT_PATH}")
    print("Rows:", len(out_df))
    print("Rows with cve_id:", int(out_df["cve_id"].notna().sum()))
    print("Target models:\n", out_df["target_model"].value_counts().head(10).to_string())


if __name__ == "__main__":
    main()