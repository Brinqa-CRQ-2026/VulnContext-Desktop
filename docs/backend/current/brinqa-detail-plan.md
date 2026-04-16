# Brinqa Detail Plan

This document describes the intended future shape of Brinqa detail enrichment.

## Current state

The current backend does not fetch live Brinqa detail payloads at request time.

Current behavior:

- `GET /findings/{id}` returns thin persisted finding data only
- `GET /assets/{asset_id}` returns thin persisted asset data only
- `detail_source` and `detail_fetched_at` remain `null`
- no request-time network dependency on Brinqa exists in the active runtime

This is intentional for now.

## Why it is disabled

The previous attempt was only a best-effort sketch and was not reliable enough to treat as a real product feature.

Main concerns:

- no validated field contract for returned Brinqa payloads
- no stable error-handling policy for auth, timeout, and partial payload cases
- unclear performance expectations for request-time fetches
- unclear cache design and invalidation strategy

## What a correct future implementation should do

If Brinqa detail is reintroduced later, it should meet these requirements:

1. Clearly define which fields are request-time-only.
2. Keep `assets` and `findings` as the source of truth for the main API.
3. Treat Brinqa detail as optional enrichment layered on top of thin persisted rows.
4. Fail closed to thin data when Brinqa is unavailable, slow, or misconfigured.
5. Use explicit timeouts and structured logging.
6. Add tests for success, timeout, auth failure, empty payload, and malformed payload cases.

## Expected detail targets

### Finding detail

Possible future fields:

- `summary`
- `description`
- `severity`
- `source_status`
- `cvss_*`
- `epss_*`
- `attack_*`
- KEV-related metadata if Brinqa is the right source for it

### Asset detail

Possible future fields:

- `dnsname`
- `public_ip_addresses`
- `private_ip_addresses`
- any other host-level detail not already persisted in `assets`

## Preferred implementation approach

If this comes back, implement it as:

- a small service module with a narrow request contract
- thin response normalization in one place
- optional in-memory cache only after correctness is established
- no direct coupling between Brinqa payload shape and API response shape

The route layer should continue to work correctly even if the detail service returns nothing.
