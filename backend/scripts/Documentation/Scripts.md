
---

# Files

## bql_Client.py

Reusable API client for Brinqa BQL.

Responsibilities:
- Handles authentication (Bearer token)
- Sends POST requests
- Normalizes API response formats
- Handles pagination (skip/limit)
- Provides `chunked()` helper for batching

All other scripts(beside bql_finding) depend on this client.

---

## export_hosts.py

Exports all Host objects from CAASM.

Output:
- Host ID
- OS
- Cloud provider/region
- IP addresses
- Environments
- Technologies
- Scan coverage
- Open finding count

Purpose:
Provides host-level metadata used later for enrichment.

## export_vuln.py

Exports all Vulnerability objects from CAASM.

Output:
- Vulnerability ID
- Display name / summary
- Severity
- Status
- Confidence
- Timeline fields (firstFound, lastFound, ageInDays)
- `targets` field (links to Host or Container)

Purpose:
Provides vulnerability instance data and target relationships.

## bql_vuln_asset_.py

Builds the final training dataset.
 What it does:
  1. Loads hosts_export.csv
  2. Loads vulnerabilities_export.csv
  3. Extracts CVE IDs
  4. Expands vulnerability targets
  5. Resolves Container → Host mapping
  6. Enriches with host metadata
  7. Writes final dataset

Each row contains:

### Keys
- cve_id
- vulnerability_id
- target_model
- target_id
- linked_host_id

### Vulnerability Signals
- severity
- ageInDays
- status
- confidence
- firstFound
- lastFound

### Container Context (if applicable)
- asset_environments
- asset_profiles
- asset_technologies

### Host Context
- operatingSystem
- osFamily
- cloudProvider
- cloudRegion
- ipAddresses


## bql_cveIDonly_.py
This script retrieves vulnerability **FindingDefinition** records from the Brinqa CAASM API and exports a **clean dataset with one row per CVE**.

The script:

1. Queries the Brinqa API using BQL.
2. Retrieves vulnerability metadata and CVSS metrics.
3. Parses and normalizes `cveIds`.
4. Explodes multiple CVEs into separate rows.
5. Removes duplicates so each CVE appears only once.
6. Saves the final dataset to CSV.

The output file is used as the **intrinsic vulnerability dataset** for later joining with asset context data.

---

## Output

The script generates:

```
../data/bql_export_unique_cve_findingDefinitions.csv
```

Each row represents **one unique CVE** with associated vulnerability attributes.

Example columns include:

* `cveId`
* `displayName`
* `description`
* `exploitsExists`
* `associatedCvesMaximumEpssLikelihood`
* `associatedCvesIsCisaExploitable`

### CVSS v3 fields

* `cvssV3BaseScore`
* `cvssV3AttackVector`
* `cvssV3AttackComplexity`
* `cvssV3PrivilegesRequired`
* `cvssV3UserInteraction`
* `cvssV3ConfidentialityImpact`
* `cvssV3IntegrityImpact`
* `cvssV3AvailabilityImpact`
* `cvssV3ExploitCodeMaturity`

### CVSS v2 fields

* `cvssV2BaseScore`
* `cvssV2AccessVector`
* `cvssV2AccessComplexity`
* `cvssV2Authentication`
* `cvssV2ConfidentialityImpact`
* `cvssV2IntegrityImpact`
* `cvssV2AvailabilityImpact`

---

## Environment Setup

Create a `.env` file containing your Brinqa API token:

```
BRINQA_BEARER_TOKEN=your_token_here
```

Install required dependencies:

```
pip install pandas requests python-dotenv
```

---

## Running the Script

From the `scripts` directory:

```
python fetch_finding_definitions.py
```

The script will:

* paginate through the API
* fetch all records
* process CVE data
* save the cleaned CSV

---

## Data Processing Steps

The script performs the following transformations:

1. **API Pagination**

   * Retrieves results in batches (`PAGE_SIZE = 5000`).

2. **System Field Removal**

   * Drops internal API fields such as:
   * `$metadata`
   * `$actions`
   * `__dataModel__`
   * `id`

3. **CVE Parsing**

   * Converts the `cveIds` JSON list into Python lists.
   * Splits multiple CVEs into separate rows.

4. **CVE Normalization**

   * Uppercases CVE IDs.
   * Filters only valid CVE patterns.

5. **Deduplication**

   * Keeps one row per CVE.
   * Prefers rows whose `displayName` is not simply the CVE ID.

6. **Data Cleaning**

   * Replaces `displayName` values equal to the CVE ID with `"Unknown"`.

7. **Binary Conversion**

   * Converts `associatedCvesIsCisaExploitable` to numeric:

     * `TRUE → 1`
     * `FALSE → 0`

# enrich_2002-2026

## Overview

This script enriches a Brinqa-exported CVE dataset with **CVSS metrics from the NVD (National Vulnerability Database)**.

The script:

1. Loads CVE records exported from Brinqa.
2. Loads NVD vulnerability feeds (2002–2026).
3. Extracts CVSS metrics (v3/v2, optionally v4).
4. Fills missing CVSS fields in the Brinqa dataset.
5. Keeps the **most complete CVSS version per CVE (v3 preferred over v2)**.
6. Writes the enriched dataset to a new CSV file.

---

## Input Files

### 1. Brinqa CVE Dataset

```text
../data/bql_export_unique_cve_findingDefinitions.csv
```

Contains vulnerability records exported from Brinqa, including CVE IDs and some CVSS fields.

Example columns:

* `cveId`
* `displayName`
* `description`
* `cvssV3BaseScore`
* `cvssV2BaseScore`

---

### 2. NVD Feeds

Directory containing yearly NVD JSON files:

```text
../data/NVD_Download/
```

## Output

```text
../data/bql_export_all_finding_with_CVEID__cvss_enriched_nvd2002_2026.csv
```

The output file contains the original Brinqa data plus CVSS metrics enriched from NVD.

---

## CVSS Selection Logic

Some CVEs may contain both CVSS v3 and CVSS v2 metrics.

The script keeps only the **more complete version**:

Rule:

1. Count populated fields in CVSS v3 and v2.
2. If v3 has **more or equal populated fields**, keep v3 and clear v2.
3. If v2 has **more populated fields**, keep v2 and clear v3.

This ensures each row uses **one consistent CVSS version**.

---

## Running the Script

From the `scripts` directory:

```bash
python enrich_cvss_from_nvd.py
```

## Purpose in the Pipeline

This script produces the **intrinsic vulnerability feature dataset**, which is later joined with **asset context data** to create the final machine learning dataset.

```text
Brinqa CVE Data
        +
NVD CVSS Metrics
        =
Intrinsic Vulnerability Dataset
```
---

# join_CVE_asset.py

This script joins **asset context data** with **intrinsic vulnerability data** using the CVE ID as the key.
The result is a combined dataset that contains both **asset features** and **vulnerability features**, which can be used for  machine learning models.

---

## Input Files

### Asset Dataset

```
../data/model2_training_dataset_trimmed.csv
```

Contains asset-level context for vulnerabilities.
Each row represents a vulnerability observed on a specific asset.


---

### Intrinsic Vulnerability Dataset

```
../data/bql_export_all_finding_with_CVEID__cvss_enriched_nvd2002_2026.csv
```

Contains intrinsic properties of vulnerabilities such as CVSS metrics.

---

## Processing Steps

1. Load both datasets.
2. Validate required columns exist (`cve_id` and `cveId`).
3. Rename `cveId` to `cve_id` in the intrinsic dataset.
4. Remove rows missing CVE IDs.
5. Ensure the intrinsic dataset contains **unique CVEs**.
6. Perform an **inner join on `cve_id`**.
7. Remove exact duplicate rows if any exist.
8. Save the final dataset.

---

## Output

```
../data/joined_asset_intrinsic.csv
```

Each row contains:

```
Asset context features + Intrinsic vulnerability features
```

## Running the Script

From the `scripts` directory:

```
python join_CVE_asset.py
```