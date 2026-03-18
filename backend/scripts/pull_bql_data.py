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
print("push test")
API_URL = "https://ucsc.brinqa.net/api/caasm/bql"

# Change result size here
LIMIT = 300

# Insert your BQL query string here
QUERY = """
FIND FindingDefinition AS f
"""

# Paste token without "Bearer "
BEARER_TOKEN = ""

headers = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/json;charset=UTF-8',
    'origin': 'https://ucsc.brinqa.net',
    'priority': 'u=1, i',
    'referer': 'https://ucsc.brinqa.net/caasm/findingDefinitions',
    'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
    'x-requested-with': 'XMLHttpRequest',
}

if not BEARER_TOKEN:
    raise ValueError("Set BEARER_TOKEN in CONFIG before running.")

headers['authorization'] = f'Bearer {BEARER_TOKEN}'

json_data = {
    'allowBqlUsingKeyword': None,
    'callingContext': {
        'rootContextType': 'DATA_MODEL',
        'rootContextName': 'findingDefinitionDefaultList',
        'viewType': 'LIST',
        'rootDataModel': 'FindingDefinition',
        'returnDataModel': 'FindingDefinition',
    },
    'query': QUERY.strip(),
    'countOnly': None,
    'limit': LIMIT,
    'returningFields': [
        'name',
        'description',
        'findingType',
        'riskFactors',
        'riskScore',
        'complianceStatus',
        'publishedDate',
        'sourceLastModified',
        'weaknesses',
        'uid',
        'updatedBy',
        'technologies',
        'tags',
        'summary',
        'sources',
        'sourceUids',
        'sourceStatus',
        'severityScore',
        'source',
        'sourceCreatedDate',
        'sourcesIcons',
        'severity',
        'riskScoringModel',
        'riskRating',
        'riskFactorOffset',
        'references',
        'recommendation',
        'percentageImpacted',
        'profiles',
        'patchPublishedDate',
        'patchAvailable',
        'numberOutOfCompliance',
        'openFindingCount',
        'normalizedCweIds',
        'maximumCveRiskScore',
        'normalizedAffectedProducts',
        'malware',
        'lifecycleStatus',
        'lifecyclePurgeDate',
        'lifecycleInactiveDate',
        'lastUpdated',
        'flowState',
        'firstDetected',
        'exploitsExists',
        'exploits',
        'exploitedInTheWild',
        'displayName',
        'dateCreated',
        'daysToFirstDetection',
        'dataIntegrationTitles',
        'dataModelName',
        'cweIds',
        'cvssV4VulnerabilityResponseEffort',
        'cvssV4VectorSource',
        'cvssV4Vector',
        'cvssV4ValueDensity',
        'cvssV4UserInteraction',
        'cvssV4ThreatScore',
        'cvssV4Severity',
        'cvssV4Safety',
        'cvssV4PrivilegesRequired',
        'cvssV4Recovery',
        'cvssV4ProviderUrgency',
        'cvssV4VulnerableSystemIntegrityImpact',
        'cvssV4SubsequentSystemIntegrityImpact',
        'cvssV4ExploitMaturity',
        'cvssV4BaseScore',
        'cvssV4SubsequentSystemConfidentialityImpact',
        'cvssV4VulnerableSystemConfidentialityImpact',
        'cvssV4VulnerableSystemAvailabilityImpact',
        'cvssV4SubsequentSystemAvailabilityImpact',
        'cvssV4Automatable',
        'cvssV4AttackRequirements',
        'cvssV4AttackVector',
        'cvssV4AttackComplexity',
        'cvssV3Severity',
        'cvssV3TemporalScore',
        'cvssV3UserInteraction',
        'cvssV3Vector',
        'cvssV3ReportConfidence',
        'cvssV3RemediationLevel',
        'cvssV3PrivilegesRequired',
        'cvssV3ConfidentialityImpact',
        'cvssV3ExploitCodeMaturity',
        'cvssV3IntegrityImpact',
        'cvssV3BaseScore',
        'cvssV3AvailabilityImpact',
        'cvssV3AttackVector',
        'cvssV3AttackComplexity',
        'cvssV2Severity',
        'cvssV2Vector',
        'cvssV2TemporalScore',
        'cvssV2ReportConfidence',
        'cvssV2ConfidentialityImpact',
        'cvssV2Exploitability',
        'cvssV2IntegrityImpact',
        'cvssV2RemediationLevel',
        'cvssV2AvailabilityImpact',
        'cvssV2BaseScore',
        'cvssV2Authentication',
        'cvssV2AccessVector',
        'cveRecords',
        'cvssV2AccessComplexity',
        'cveIds',
        'createdBy',
        'cpeRecords',
        'connectorNames',
        'connectorCategories',
        'cveRecords.attackTechniques',
        'baseRiskScore',
        'categories',
        'category',
        'cisaExpiryDueDate',
        'cveRecords.attackTechniques.attackTactics',
        'cveRecords.attackPatterns',
        'associatedCvesMaximumEpssLikelihood',
        'associatedCvesIsCisaExploitable',
        'affected',
        'riskFactors.value',
        'riskFactors.icon',
    ],
    'skip': None,
    'orderBy': None,
    'filter': None,
    'text': None,
    'mainId': None,
    'format': 'dataset',
    'source': None,
    'relationshipQuery': None,
    'refresh': True,
}

response = requests.post(API_URL, headers=headers, json=json_data)

# Note: json_data will not be serialized by requests
# exactly as it was in the original request.
#data = '{"allowBqlUsingKeyword":null,"callingContext":{"rootContextType":"DATA_MODEL","rootContextName":"findingDefinitionDefaultList","viewType":"LIST","rootDataModel":"FindingDefinition","returnDataModel":"FindingDefinition"},"query":"FIND FindingDefinition AS f","countOnly":null,"limit":25,"returningFields":["name","description","findingType","riskFactors","riskScore","complianceStatus","publishedDate","sourceLastModified","weaknesses","uid","updatedBy","technologies","tags","summary","sources","sourceUids","sourceStatus","severityScore","source","sourceCreatedDate","sourcesIcons","severity","riskScoringModel","riskRating","riskFactorOffset","references","recommendation","percentageImpacted","profiles","patchPublishedDate","patchAvailable","numberOutOfCompliance","openFindingCount","normalizedCweIds","maximumCveRiskScore","normalizedAffectedProducts","malware","lifecycleStatus","lifecyclePurgeDate","lifecycleInactiveDate","lastUpdated","flowState","firstDetected","exploitsExists","exploits","exploitedInTheWild","displayName","dateCreated","daysToFirstDetection","dataIntegrationTitles","dataModelName","cweIds","cvssV4VulnerabilityResponseEffort","cvssV4VectorSource","cvssV4Vector","cvssV4ValueDensity","cvssV4UserInteraction","cvssV4ThreatScore","cvssV4Severity","cvssV4Safety","cvssV4PrivilegesRequired","cvssV4Recovery","cvssV4ProviderUrgency","cvssV4VulnerableSystemIntegrityImpact","cvssV4SubsequentSystemIntegrityImpact","cvssV4ExploitMaturity","cvssV4BaseScore","cvssV4SubsequentSystemConfidentialityImpact","cvssV4VulnerableSystemConfidentialityImpact","cvssV4VulnerableSystemAvailabilityImpact","cvssV4SubsequentSystemAvailabilityImpact","cvssV4Automatable","cvssV4AttackRequirements","cvssV4AttackVector","cvssV4AttackComplexity","cvssV3Severity","cvssV3TemporalScore","cvssV3UserInteraction","cvssV3Vector","cvssV3ReportConfidence","cvssV3RemediationLevel","cvssV3PrivilegesRequired","cvssV3ConfidentialityImpact","cvssV3ExploitCodeMaturity","cvssV3IntegrityImpact","cvssV3BaseScore","cvssV3AvailabilityImpact","cvssV3AttackVector","cvssV3AttackComplexity","cvssV2Severity","cvssV2Vector","cvssV2TemporalScore","cvssV2ReportConfidence","cvssV2ConfidentialityImpact","cvssV2Exploitability","cvssV2IntegrityImpact","cvssV2RemediationLevel","cvssV2AvailabilityImpact","cvssV2BaseScore","cvssV2Authentication","cvssV2AccessVector","cveRecords","cvssV2AccessComplexity","cveIds","createdBy","cpeRecords","connectorNames","connectorCategories","cveRecords.attackTechniques","baseRiskScore","categories","category","cisaExpiryDueDate","cveRecords.attackTechniques.attackTactics","cveRecords.attackPatterns","associatedCvesMaximumEpssLikelihood","associatedCvesIsCisaExploitable","affected","riskFactors.value","riskFactors.icon"],"skip":null,"orderBy":null,"filter":null,"text":null,"mainId":null,"format":"dataset","source":null,"relationshipQuery":null,"refresh":true}'
#response = requests.post(API_URL, headers=headers, data=data)

response.raise_for_status()

data = response.json()

# adjust depending on actual structure
records = data.get("results") or data.get("items") or data.get("data") or data

df = pd.DataFrame(records)

df.to_csv("../data/bql_export.csv", index=False)

print("Saved to backend/data/bql_export.csv")
