import os
import pandas as pd

ASSET_CSV = "../data/model2_training_dataset_trimmed.csv"
INTRINSIC_CSV = "../data/bql_export_all_finding_with_CVEID__cvss_enriched_nvd2002_2026.csv"
OUT_CSV = "../data/joined_asset_intrinsic.csv"


DROP_EXACT_DUPES = True

asset = pd.read_csv(ASSET_CSV, low_memory=False)
intr = pd.read_csv(INTRINSIC_CSV, low_memory=False)


if "cve_id" not in asset.columns:
    raise KeyError("Asset CSV must contain column: cve_id")

if "cveId" not in intr.columns:
    raise KeyError("Intrinsic CSV must contain column: cveId")

# Rename intrinsic column to match asset
intr = intr.rename(columns={"cveId": "cve_id"})

# Drop rows missing CVE
asset = asset[asset["cve_id"].notna()].copy()
intr = intr[intr["cve_id"].notna()].copy()

# Ensure intrinsic is unique by CVE
dup_mask = intr["cve_id"].duplicated(keep=False)

if dup_mask.any():
    dup_cves = intr.loc[dup_mask, "cve_id"].unique()[:10]
    raise ValueError(
        f"Intrinsic CSV has duplicate CVEs. Example duplicates: {dup_cves}"
    )

# Join asset + intrinsic
joined = asset.merge(
    intr,
    on="cve_id",
    how="inner",
    suffixes=("_asset", "_intrinsic")
)


# drop anything duplication in the join datasets if there are any
if DROP_EXACT_DUPES:
    before = len(joined)
    joined = joined.drop_duplicates()
    print("Dropped duplicate rows:", before - len(joined))


# save output
os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)

joined.to_csv(OUT_CSV, index=False)


print("Wrote:", OUT_CSV)
print("Asset rows:", len(asset))
print("Intrinsic CVEs:", intr["cve_id"].nunique())
print("Joined rows:", len(joined))
print("Joined unique CVEs:", joined["cve_id"].nunique())