import os
import json
import time
import requests
import pandas as pd
import re
from dotenv import load_dotenv

API_URL = "https://ucsc.brinqa.net/api/caasm/bql"

PAGE_SIZE = 5000
MAX_PAGES = None

QUERY = """
FIND FindingDefinition AS f
WHERE f.cveIds IS NOT NULL
"""
# Load the variables from the .env
load_dotenv()

BEARER_TOKEN = os.getenv("BRINQA_BEARER_TOKEN")

if not BEARER_TOKEN:
    raise ValueError("Missing BRINQA_BEARER_TOKEN env var.")


headers = {
    "accept": "application/json, text/plain, */*", # tell servers what response format the client can accept
    "accept-language": "en-US,en;q=0.9", # tell servers the client's prefered language for response
    "content-type": "application/json;charset=UTF-8", # tell servers the format of my request body
    "origin": "https://ucsc.brinqa.net", # indicate which website initialized the request
    "referer": "https://ucsc.brinqa.net/caasm/findingDefinitions", # Show the page where the request come from
    "user-agent": "Mozilla/5.0", # mimic the browser like request, because some server will block the automated script
    "x-requested-with": "XMLHttpRequest", # Indicates the request came from AJAX, the JavaScript request in a browser.
    "authorization": f"Bearer {BEARER_TOKEN}", # the jwt token proved you are authorized.
}

Returning_Fields = [
    "displayName",
    "description",
    "cveIds",
    "exploitsExists",
    "associatedCvesMaximumEpssLikelihood",
    "associatedCvesIsCisaExploitable",

    # CVSS v3
    "cvssV3AttackComplexity",
    "cvssV3AttackVector",
    "cvssV3AvailabilityImpact",
    "cvssV3BaseScore",
    "cvssV3ConfidentialityImpact",
    "cvssV3ExploitCodeMaturity",
    "cvssV3IntegrityImpact",
    "cvssV3PrivilegesRequired",
    "cvssV3UserInteraction",

    # CVSS v2
    "cvssV2BaseScore",
    "cvssV2AccessVector",
    "cvssV2AccessComplexity",
    "cvssV2Authentication",
    "cvssV2ConfidentialityImpact",
    "cvssV2IntegrityImpact",
    "cvssV2AvailabilityImpact",
    # "cvssV2Exploitability",
]

# system-generated fields from the Brinqa API that I want to ignore
SYSTEM_COLS = ["$actions", "$metadata", "__dataModel__", "id"]

# a compiled regular expression (regex) to detect valid CVE identifiers
CVE_RE = re.compile(r"^CVE-\d{4}-\d{4,7}$", re.IGNORECASE)


def extract_records(payload):
    # if payload is a dictionary
    if isinstance(payload, dict):
        # check if "data" exists and is a list
        if isinstance(payload.get("data"), list):
            return payload["data"]  # return the list of records
        return [payload]  # wrap single record in a list

    # if payload is already a list of records
    if isinstance(payload, list):
        return payload
    # otherwise something unexpected happened
    raise ValueError(f"Unexpected JSON type: {type(payload)}")

"""Parse cveIds cell into a Python list."""
def safe_parse_list(x):
    # To handle the missing values
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return []
    if isinstance(x, list):
        return x
    s = str(x).strip()
    # handle empty and null string
    if s in ("", "[]", "None", "null", "nan"):
        return []
    try:
        # Convert the Json object into the python object
        v = json.loads(s)
        return v if isinstance(v, list) else []
    except Exception:
        return []


def is_cve_string(s: object) -> bool:
    if s is None or (isinstance(s, float) and pd.isna(s)):
        return False
    return bool(CVE_RE.match(str(s).strip()))


all_rows = []
# control the pagination offset
skip = 0
page = 0

while True:
    page += 1
    if MAX_PAGES is not None and page > MAX_PAGES:
        break
    # create a json payload object send to the Brinqa API, so it knows what data I want and where to start
    json_data = {
        "allowBqlUsingKeyword": None,
        "callingContext": {
            "rootContextType": "DATA_MODEL",
            "rootContextName": "findingDefinitionDefaultList",
            "viewType": "LIST",
            "rootDataModel": "FindingDefinition",
            "returnDataModel": "FindingDefinition",
        },
        "query": QUERY.strip(),
        "countOnly": None, # Disabled it, so we can get the actual record, instead of the dataset count
        "limit": PAGE_SIZE,
        "skip": skip,
        "returningFields": Returning_Fields,
        "format": "dataset", # Specifies how the API should format the response.
        "refresh": True, # Ensures fresh data instead of cached results.
    }
    
    # initialize a post request with the API_URL we extract from Brinqa's server, request header and body
    resp = requests.post(API_URL, headers=headers, json=json_data)
    # Raise a python exception if the API returned a error code
    resp.raise_for_status()
    # Convert the return response from Json format to Dictionary format
    payload = resp.json()
    
    # print("format of the payload", payload)

    records = extract_records(payload)
    n = len(records)

    print(f"Page {page}: skip={skip} -> got {n} rows")

    if n == 0:
        break

    all_rows.extend(records)
    skip += n
    time.sleep(0.1)

# Convert all the data we got from Dictionary to dataframe format, s table structure
df = pd.DataFrame.from_records(all_rows)

# Drop system cols if they show up
cols_to_drop = []
for c in SYSTEM_COLS:
    if c in df.columns:
        cols_to_drop.append(c)
# inplace=True: Modify the existing DataFrame instead of creating a new one.
# Error = 'ignore': prevents errors if a column does not exist.
df.drop(columns=cols_to_drop, inplace=True, errors="ignore")

# Ensure all requested columns exist
for col in Returning_Fields:
    if col not in df.columns:
        df[col] = pd.NA

# Convert the Json object to python list
df["cveIds_parsed"] = df["cveIds"].apply(safe_parse_list)
# In json object, all the cveID are stored together, we need to manually separate them to different row 
df = df.explode("cveIds_parsed").rename(columns={"cveIds_parsed": "cveId"})
# normalize the cveID
df["cveId"] = df["cveId"].astype(str).str.strip().str.upper()
# making sure the cveID match with the regEx expression
df = df[df["cveId"].str.match(CVE_RE, na=False)].copy()

df["displayName_is_cve"] = df["displayName"].apply(is_cve_string)

# prefer displayName is NOT a CVE
df = df.sort_values(
    by=["cveId", "displayName_is_cve"],
    ascending=[True, True],
)

# keep one row per CVE, the one with CWE_ID linked, 
df = df.drop_duplicates(subset=["cveId"], keep="first").copy()

# clean displayName
df.loc[df["displayName"].apply(is_cve_string), "displayName"] = "Unknown"

# final output
OUT_FIELDS = ["cveId"]
for c in Returning_Fields:
    if c != "cveIds":
        OUT_FIELDS.append(c)
        
valid_columns = []
for c in OUT_FIELDS:
    if c in df.columns:
        valid_columns.append(c)
OUT_FIELDS = valid_columns

df = df[OUT_FIELDS].copy()

out_path = "../data/bql_export_unique_cve_findingDefinitions.csv"

if "associatedCvesIsCisaExploitable" in df.columns:
    df["associatedCvesIsCisaExploitable"] = (
        df["associatedCvesIsCisaExploitable"]
        .astype(str)# convert everything to string
        .str.strip()# remove spaces
        .str.upper()# normalize to all upercase
        .map({"TRUE": 1, "FALSE": 0})
        .fillna(0)
        .astype(int)
    )
    
df.to_csv(out_path, index=False)

print("Saved to", out_path)
print("Unique CVEs:", df["cveId"].nunique())
print("Columns:", list(df.columns))