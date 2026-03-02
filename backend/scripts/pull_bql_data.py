import requests
import pandas as pd

# =========================
# pull_bql_data.py
# =========================
# This script runs a BQL query against the Brinqa API and exports results
# to CSV at ../data/bql_export.csv. Edit the CONFIG section below, then run:
# python pull_bql_data.py

# =========================
# CONFIG - EDIT THESE
# =========================

API_URL = "https://ucsc.brinqa.net/api/caasm/bql"

# Change result size here
LIMIT = 300

# Insert your BQL query string here
QUERY = """
FIND Finding AS f ORDER BY f.status ASC
"""

# Paste ONE auth method below (leave the other blank)
BEARER_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJCcmlucWEgQ3liZXIgUmlzayBHcmFwaCIsInN1YiI6ImFkYXhnb256QHVjc2MuZWR1IiwibWZhVmVyaWZpZWQiOnRydWUsImV4cCI6MTc3MjU2NzY2MywiaWF0IjoxNzcyNDgxMjYzfQ.5bt_XrCCm3JZ_OUOER-Mn0ED-YNN98a9Dh6MbVokQ44"  # paste token without "Bearer "

headers = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json;charset=UTF-8",
    "origin": "https://ucsc.brinqa.net",
    "priority": "u=1, i",
    "referer": "https://ucsc.brinqa.net/caasm/findings?bql=FIND%20Finding%20AS%20f%20ORDER%20BY%20f.status%20ASC",
    "sec-ch-ua": '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36",
    "x-requested-with": "XMLHttpRequest",
}

if BEARER_TOKEN:
    headers["authorization"] = f"Bearer {BEARER_TOKEN}"

json_data = {
    'allowBqlUsingKeyword': None,
    'callingContext': {
        'rootContextType': 'DATA_MODEL',
        'rootContextName': 'findingDefaultList',
        'viewType': 'LIST',
        'rootDataModel': 'Finding',
        'returnDataModel': 'Finding',
    },
    'query': QUERY.strip(),
    'countOnly': None,
    'limit': LIMIT,
    'returningFields': [
        'status',
        'sourcesIcons',
        'type',
        'targets',
        'riskFactors',
        'riskScore',
        'complianceStatus',
        'riskOwner',
        'remediationOwner',
        'firstFound',
        'lastFound',
        'dueDate',
        'cisaDueDateExpired',
        'confidence',
        'updatedBy',
        'uid',
        'summary',
        'statusCategory',
        'statusConfigurationModel',
        'sources',
        'sourceUids',
        'sourceStatus',
        'slaLevel',
        'slaDefinition',
        'riskRating',
        'severity',
        'sla',
        'riskScoringModel',
        'remediationSLA',
        'riskFactorOffset',
        'results',
        'name',
        'lifecycleStatus',
        'lifecycleInactiveDate',
        'lifecyclePurgeDate',
        'lastUpdated',
        'lastFixed',
        'informedUsers',
        'flowState',
        'expiredExceptionRequest',
        'extendedDueDate',
        'displayName',
        'description',
        'daysToFix',
        'dateCreated',
        'type.cveIds',
        'dataModelName',
        'dataIntegrationTitles',
        'type.cweIds',
        'createdBy',
        'connectorNames',
        'connectorCategories',
        'type.cveRecords.attackTechniques',
        'baseRiskScore',
        'categories',
        'type.cveRecords.attackPatterns',
        'type.cveRecords.attackTechniques.attackTactics',
        'approvedFalsePositiveRequest',
        'approvedRemediationValidationRequest',
        'approvedRiskAcceptanceRequest',
        'assessment',
        'approvedExceptionRequest',
        'ageInDays',
        'id',
        'riskFactors.value',
        'riskFactors.icon',
    ],
    'skip': None,
    'orderBy': [
        'status ASC',
    ],
    'filter': None,
    'text': None,
    'mainId': None,
    'format': 'dataset',
    'source': None,
    'relationshipQuery': None,
}

response = requests.post(API_URL, headers=headers, json=json_data)

response.raise_for_status()

data = response.json()

# adjust depending on actual structure
records = data.get("results") or data.get("items") or data.get("data") or data

df = pd.DataFrame(records)

df.to_csv("../data/bql_export.csv", index=False)

print("Saved to backend/data/bql_export.csv")
