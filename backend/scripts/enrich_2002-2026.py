import os
import gzip
import json
import re
import time
import pandas as pd


# file path configurations
BRINQA_CSV = "../data/bql_export_unique_cve_findingDefinitions.csv"
NVD_DIR = "../data/NVD_Download"
OUT_CSV = "../data/bql_export_all_finding_with_CVEID__cvss_enriched_nvd2002_2026.csv"

YEAR_START = 2002
YEAR_END = 2026
SLEEP_BETWEEN_FILES = 0.0

# If you do NOT want CVSSv4 at all, set to False
KEEP_V4 = False

# Helper funtions
CVE_YEAR_RE = re.compile(r"^CVE-(\d{4})-\d+$")

def parse_cve_list(x):
    if pd.isna(x):
        return []
    if isinstance(x, list):
        return x
    try:
        return json.loads(x)
    except Exception:
        return []

def cve_year(cve_id: str):
    m = CVE_YEAR_RE.match(str(cve_id).strip())
    if m:
        return int(m.group(1))
    else:
        return None
# check the missing values
def notna(v):
    return v is not None and not pd.isna(v)

def has_complete_v3(row):
    needed = [
        "cvssV3AttackComplexity",
        "cvssV3AttackVector",
        "cvssV3AvailabilityImpact",
        "cvssV3BaseScore",
        "cvssV3ConfidentialityImpact",
        "cvssV3ExploitCodeMaturity",
        "cvssV3IntegrityImpact",
        "cvssV3PrivilegesRequired",
        "cvssV3UserInteraction",
    ]
    results = []
    for c in needed:
        value = row.get(c)
        results.append(notna(value))
    return all(results)

def has_complete_v2(row):
    needed = [
        "cvssV2BaseScore",
        "cvssV2AccessVector",
        "cvssV2AccessComplexity",
        "cvssV2Authentication",
        "cvssV2ConfidentialityImpact",
        "cvssV2IntegrityImpact",
        "cvssV2AvailabilityImpact",
        # "cvssV2Exploitability",
    ]
    results = []
    for c in needed:
        value = row.get(c)
        results.append(notna(value))
    return all(results)

def has_complete_cvss_any(row):
    return has_complete_v3(row) or has_complete_v2(row)

# Handle the compressed or unCompressed file opening
def load_json_maybe_gz(path):
    if path.endswith(".gz"):
        with gzip.open(path, "rt", encoding="utf-8") as f:
            return json.load(f)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# Build NVD lookup from 2002 to 2026
# Priority: v4 -> v3.1 -> v3.0 -> v2
def build_nvd_lookup_for_files(paths) -> pd.DataFrame:
    rows = []
    total_vulns = 0

    for p in sorted(paths):
        print("Loading NVD feed:", p)
        data = load_json_maybe_gz(p)

        vulns = data.get("vulnerabilities", [])
        total_vulns += len(vulns)
        print("  vulnerabilities:", len(vulns))

        for v in vulns:
            cve = v.get("cve", {}) or {}
            cve_id = cve.get("id")
            if not cve_id:
                continue

            metrics = cve.get("metrics", {}) or {}

            # cvssV4
            if KEEP_V4:
                m40 = metrics.get("cvssMetricV40")
                if m40:
                    entry = m40[0] or {}
                    cvss = entry.get("cvssData", {}) or {}
                    rows.append({
                        "cveId": cve_id,
                        "nvd_cvss_priority": 3,
                        "nvd_cvss_version": "v4",
                        "cvssV4BaseScore": cvss.get("baseScore"),
                        "cvssV4AttackVector": cvss.get("attackVector"),
                        "cvssV4AttackComplexity": cvss.get("attackComplexity"),
                        "cvssV4AttackRequirements": cvss.get("attackRequirements"),
                        "cvssV4PrivilegesRequired": cvss.get("privilegesRequired"),
                        "cvssV4UserInteraction": cvss.get("userInteraction"),
                        "cvssV4ExploitMaturity": cvss.get("exploitMaturity"),
                        "cvssV4Automatable": cvss.get("automatable"),
                        "cvssV4VulnerableSystemConfidentialityImpact": cvss.get("vulnConfidentialityImpact"),
                        "cvssV4VulnerableSystemIntegrityImpact": cvss.get("vulnIntegrityImpact"),
                        "cvssV4VulnerableSystemAvailabilityImpact": cvss.get("vulnAvailabilityImpact"),
                    })
                    continue

            # CVSS v3.1
            m31 = metrics.get("cvssMetricV31")
            if m31:
                entry = m31[0] or {}
                cvss = entry.get("cvssData", {}) or {}
                rows.append({
                    "cveId": cve_id,
                    "nvd_cvss_priority": 2,
                    "nvd_cvss_version": "v3.1",
                    "cvssV3BaseScore": cvss.get("baseScore"),
                    "cvssV3AttackVector": cvss.get("attackVector"),
                    "cvssV3AttackComplexity": cvss.get("attackComplexity"),
                    "cvssV3PrivilegesRequired": cvss.get("privilegesRequired"),
                    "cvssV3UserInteraction": cvss.get("userInteraction"),
                    "cvssV3ConfidentialityImpact": cvss.get("confidentialityImpact"),
                    "cvssV3IntegrityImpact": cvss.get("integrityImpact"),
                    "cvssV3AvailabilityImpact": cvss.get("availabilityImpact"),
                    "cvssV3ExploitCodeMaturity": entry.get("exploitCodeMaturity"),
                })
                continue

            #CVSS v3.0
            m30 = metrics.get("cvssMetricV30")
            if m30:
                entry = m30[0] or {}
                cvss = entry.get("cvssData", {}) or {}
                rows.append({
                    "cveId": cve_id,
                    "nvd_cvss_priority": 2,
                    "nvd_cvss_version": "v3.0",
                    "cvssV3BaseScore": cvss.get("baseScore"),
                    "cvssV3AttackVector": cvss.get("attackVector"),
                    "cvssV3AttackComplexity": cvss.get("attackComplexity"),
                    "cvssV3PrivilegesRequired": cvss.get("privilegesRequired"),
                    "cvssV3UserInteraction": cvss.get("userInteraction"),
                    "cvssV3ConfidentialityImpact": cvss.get("confidentialityImpact"),
                    "cvssV3IntegrityImpact": cvss.get("integrityImpact"),
                    "cvssV3AvailabilityImpact": cvss.get("availabilityImpact"),
                    "cvssV3ExploitCodeMaturity": entry.get("exploitCodeMaturity"),
                })
                continue

            #CVSS v2
            m2 = metrics.get("cvssMetricV2")
            if m2:
                entry = m2[0] or {}
                cvss = entry.get("cvssData", {}) or {}
                rows.append({
                    "cveId": cve_id,
                    "nvd_cvss_priority": 1,
                    "nvd_cvss_version": "v2",
                    "cvssV2BaseScore": cvss.get("baseScore"),
                    "cvssV2AccessVector": cvss.get("accessVector"),
                    "cvssV2AccessComplexity": cvss.get("accessComplexity"),
                    "cvssV2Authentication": cvss.get("authentication"),
                    "cvssV2ConfidentialityImpact": cvss.get("confidentialityImpact"),
                    "cvssV2IntegrityImpact": cvss.get("integrityImpact"),
                    "cvssV2AvailabilityImpact": cvss.get("availabilityImpact"),
                    # "cvssV2Exploitability": entry.get("exploitabilityScore"),
                })

        if SLEEP_BETWEEN_FILES:
            time.sleep(SLEEP_BETWEEN_FILES)

    lookup = pd.DataFrame(rows)
    print("Total vulnerabilities scanned:", total_vulns)
    print("Total lookup rows:", len(lookup))

    if lookup.empty:
        return lookup

    lookup = lookup.sort_values(["cveId", "nvd_cvss_priority"], ascending=[True, False])
    lookup = lookup.drop_duplicates("cveId", keep="first")
    print("Unique CVEs in lookup:", lookup["cveId"].nunique())
    return lookup


# -------------------------
# Main
# -------------------------
df = pd.read_csv(BRINQA_CSV, low_memory=False)
df.replace(r"^\s*$", pd.NA, regex=True, inplace=True)

# Ensure CVSS cols exist (no harm if they already do)
CVSS_V3_COLS = [
       "cvssV3AttackComplexity",
        "cvssV3AttackVector",
        "cvssV3AvailabilityImpact",
        "cvssV3BaseScore",
        "cvssV3ConfidentialityImpact",
        "cvssV3ExploitCodeMaturity",
        "cvssV3IntegrityImpact",
        "cvssV3PrivilegesRequired",
        "cvssV3UserInteraction",
]

CVSS_V2_COLS = [
            "cvssV2BaseScore",
            "cvssV2AccessVector",
            "cvssV2AccessComplexity",
            "cvssV2Authentication",
            "cvssV2ConfidentialityImpact",
            "cvssV2IntegrityImpact",
            "cvssV2AvailabilityImpact",
            # "cvssV2Exploitability",
]
CVSS_V4_COLS = [
    "cvssV4BaseScore","cvssV4AttackVector","cvssV4AttackComplexity","cvssV4AttackRequirements",
    "cvssV4PrivilegesRequired","cvssV4UserInteraction","cvssV4ExploitMaturity","cvssV4Automatable",
    "cvssV4VulnerableSystemConfidentialityImpact","cvssV4VulnerableSystemIntegrityImpact","cvssV4VulnerableSystemAvailabilityImpact",
]

TARGET_COLS = (CVSS_V4_COLS if KEEP_V4 else []) + CVSS_V3_COLS + CVSS_V2_COLS
for c in TARGET_COLS:
    if c not in df.columns:
        df[c] = pd.NA

df["_has_complete_cvss"] = df.apply(has_complete_cvss_any, axis=1)

# Add stable row_id for joining back later
df["row_id"] = df.index.astype("int64")

# Explode CVEs
df["cveId"] = df["cveId"].astype(str).str.strip()
df["cve_year"] = df["cveId"].apply(cve_year)


need = df[df["_has_complete_cvss"] == False].copy()

print("Total Brinqa rows:", len(df))
# print("Exploded CVE rows in range:", len(exploded))
print("Rows needing enrichment:", len(need))

# Locate NVD files
paths = []
for y in range(YEAR_START, YEAR_END + 1):
    cand = os.path.join(NVD_DIR, f"nvdcve-2.0-{y}.json.gz")
    if os.path.exists(cand):
        paths.append(cand)
        continue
    # cand2 = os.path.join(NVD_DIR, f"nvdcve-2.0-{y}.json")
    # if os.path.exists(cand2):
    #     paths.append(cand2)

if not paths:
    raise FileNotFoundError(
        f"No NVD files found in {NVD_DIR} for years {YEAR_START}-{YEAR_END}."
    )

nvd_lookup = build_nvd_lookup_for_files(paths)
if nvd_lookup.empty:
    raise RuntimeError("NVD lookup is empty; check NVD files.")

# Merge NVD into "need"
# we do left join, meaning keep every row of need, even if no match look_up enrichment values
# suffixes, if columns name of nvd_lookup and need dataframe are the same, then we add a suffixes
need = need.merge(nvd_lookup, on="cveId", how="left", suffixes=("", "_nvd"))


need = need.set_index("row_id")

filled_any = 0
for col in TARGET_COLS:
    nvd_col = f"{col}_nvd"
    if nvd_col in need.columns:
        # check how many columns already fill with values
        before = df[col].notna().sum()
        # check if the Brinqa's data exist in that columns, unchanged, otherwise map the values from NVD db
        df[col] = df[col].where(df[col].notna(), df["row_id"].map(need[nvd_col]))
        # keep track how many columns filled after the operations
        after = df[col].notna().sum()
        # keep track how many values were filled
        filled_any += (after - before)


# Reorder columns so CVSS stays together (v3 block + v2 block; v4 optional)
cvss_block = (CVSS_V4_COLS if KEEP_V4 else []) + CVSS_V3_COLS + CVSS_V2_COLS
other_cols = []
for c in df.columns:
    if c not in cvss_block:
        other_cols.append(c)
cvss_cols = []
for c in cvss_block:
    if c in df.columns:
        cvss_cols.append(c)
        
df = df[other_cols + cvss_cols]

# only use columns that actually exist
cvss_v3_cols = []
for c in CVSS_V3_COLS:
    if c in df.columns:
        cvss_v3_cols.append(c)

cvss_v2_cols = []
for c in CVSS_V2_COLS:
    if c in df.columns:
        cvss_v2_cols.append(c)

# count how many populated fields each version has per row
df["_cvss_v3_count"] = df[cvss_v3_cols].notna().sum(axis=1) if cvss_v3_cols else 0
df["_cvss_v2_count"] = df[cvss_v2_cols].notna().sum(axis=1) if cvss_v2_cols else 0

# v3 is considered complete only if all v3 fields are populated
# df["_has_complete_v3_final"] = (
#     df[cvss_v3_cols].notna().all(axis=1) if cvss_v3_cols else False
# )

# Rule:
# 1) if v3 is more completed than v2, keep v3
# 2) else if v2 has more populated fields than v3 -> keep v2, clear v3
use_v3 = df["_cvss_v3_count"] >= df["_cvss_v2_count"]
use_v2 = ~use_v3

# clear v2 where v3 wins
if cvss_v2_cols:
    df.loc[use_v3, cvss_v2_cols] = pd.NA

# clear v3 where v2 wins
if cvss_v3_cols:
    df.loc[use_v2, cvss_v3_cols] = pd.NA
    
# Cleanup helper cols
df = df.drop(columns=["_cve_list", "_has_complete_cvss", "row_id", "_cvss_v3_count", "_cvss_v2_count"], errors="ignore")

df.to_csv(OUT_CSV, index=False)
print("Saved:", OUT_CSV)
print("Total filled CVSS cells:", int(filled_any))