import os
import re
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[3]

API_URL = "https://ucsc.brinqa.net/api/caasm/bql"
LIMIT = 1000
PAGE_SIZE = 1000
CONTAINER_BATCH_SIZE = 200

NVD_DIR = os.path.join(BACKEND_ROOT, "data", "NVD_Download")
YEAR_START = 2002
YEAR_END = 2026

CVE_RE = re.compile(r"\bCVE-\d{4}-\d{4,7}\b", re.IGNORECASE)

HOST_FIELDS = [
    "id", "uid", "displayName", "name", "type",
    "operatingSystem", "osFamily", "cloudProvider", "cloudRegion",
    "environments", "profiles", "tags", "technologies", "publicIpAddresses",
]

VULN_FIELDS = [
    "id", "uid", "displayName", "name", "summary", "ageInDays", "targets",
]

FINDING_DEF_FIELDS = [
    "displayName", "description", "cveIds",

    "cvssV3AttackComplexity",
    "cvssV3AttackVector",
    "cvssV3AvailabilityImpact",
    "cvssV3BaseScore",
    "cvssV3ConfidentialityImpact",
    "cvssV3IntegrityImpact",
    "cvssV3PrivilegesRequired",
    "cvssV3UserInteraction",

    "cvssV2BaseScore",
    "cvssV2AccessVector",
    "cvssV2AccessComplexity",
    "cvssV2Authentication",
    "cvssV2ConfidentialityImpact",
    "cvssV2IntegrityImpact",
    "cvssV2AvailabilityImpact",
]