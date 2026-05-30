import os
import requests
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
"This module provides a small reusable Python client for calling the Brinqa CAASM BQL endpoint and retrieving results as Python lists/dicts. It also includes a helper function to split a list of IDs into smaller batches."

""" 1) `BrinqaBQLClient`
A thin wrapper around `requests.Session()` that:
- adds required headers for Brinqa CAASM calls,
- injects an Authorization Bearer token,
- sends POST requests to the BQL API,
- normalizes different response shapes into a standard `List[Dict]`,
- supports paginated fetching with `skip/limit`.

#### `__init__(...)`
Creates the HTTP session and sets headers.

**Parameters**
- `api_url`: BQL endpoint 
- `origin`: origin header used by the UI 
- `referer`: referer header 
- `token_env`: environment variable name for the bearer token 
- `timeout_sec`: request timeout

"""
class BrinqaBQLClient:
    def __init__(
        self,
        api_url: str,
        origin: str,
        referer: str,
        token_env: str = "BRINQA_BEARER_TOKEN",
        timeout_sec: int = 90,
    ):
        # Load the variables from the .env
        load_dotenv()
        token = os.getenv(token_env)
        if not token:
            raise ValueError(f"Set {token_env} env var.")

        self.api_url = api_url
        self.timeout_sec = timeout_sec

        self.session = requests.Session()
        self.session.headers.update({
            "accept": "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8",
            "origin": origin,
            "referer": referer,
            "user-agent": "Mozilla/5.0",
            "x-requested-with": "XMLHttpRequest",
            "authorization": f"Bearer {token}",
        })
    # Sends a POST request to the BQL API and returns results as a list of dictionaries
    def post(self, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
      r = self.session.post(self.api_url, json=payload, timeout=self.timeout_sec)

      if r.status_code != 200:
          raise RuntimeError(f"BQL error {r.status_code}: {r.text[:2000]}")

      data = r.json()

      # 1) If backend returns an error object as JSON (still 200), show it
      if isinstance(data, dict):
          if "error" in data and data["error"]:
              raise RuntimeError(f"BQL logical error (200): {data.get('error')} | {data.get('message')}")

          # 2) unwrap known envelopes
        #   if isinstance(data.get("results"), list):
        #       return data["results"]
          if isinstance(data.get("items"), list):
              return data["items"]

          # retrieve the list values that stored in the data object
          d = data.get("data")
          if isinstance(d, list):
              return d
          if isinstance(d, dict):
              # try common nested keys
            #   for k in ("results", "items", "rows"):
            if isinstance(d.get("items"), list):
                return d["items"]

          # if a single object was returned, normalize to list
          if "id" in data:
              return [data]

          # still unknown: include a short preview so we can see what it is
          preview = str(data)[:500]
          raise RuntimeError(f"Unexpected response shape (dict). Preview: {preview}")

      # If it's already a list, return it
      if isinstance(data, list):
          return data

      raise RuntimeError(f"Unexpected response type: {type(data)}")
    
    def paged_dataset(
        self,
        calling_context: Dict[str, Any],
        query: str,
        returning_fields: List[str],
        limit: int = 1000,
        refresh: bool = True,
        max_pages: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        all_rows: List[Dict[str, Any]] = []
        skip = 0
        page = 0
        while True:
            page += 1
            payload = {
                "callingContext": calling_context,
                "query": query,
                "limit": limit,
                "skip": skip,
                "returningFields": returning_fields,
                "format": "dataset",
                "refresh": refresh,
            }
            rows = self.post(payload)
            all_rows.extend(rows)

            print(f"Fetched page {page}: {len(rows)} rows (total {len(all_rows)})")

            if len(rows) < limit:
                break
            if max_pages is not None and page >= max_pages:
                break

            skip += limit

        return all_rows

# Split a list to a batch based on the given size
def chunked(seq: List[int], size: int) -> List[List[int]]:
  chunks = []
  for i in range(0, len(seq), size):
      chunk = seq[i:i + size]
      chunks.append(chunk)
  return chunks