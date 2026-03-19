# VulnContext Desktop: Basic Overview and Proposed Direction

## What This Project Does Overall

VulnContext Desktop is a vulnerability triage application. Its main purpose is to help review vulnerability findings, score them, sort them by priority, and let a user click into a finding to see more detail.

Right now, the app has:

- a backend API
- a frontend desktop/web UI
- local scoring logic
- a local database used to store imported findings and related scoring data

At a high level, the project is meant to show the most important findings first so a user can work through them in priority order.

## Current Limitation

The current setup is limited because we are manually importing only a small sample of data from Brinqa.

Current known limitation:

- we are manually inputting only about 2,000 findings from Brinqa

Because of that, the application is not yet working from the full live Brinqa dataset. It is working from a partial local copy, which means:

- the data can become stale
- the local database is storing more finding detail than we may actually want to keep
- the app is not yet using Brinqa as the live source of truth

## Proposed Direction

The preferred direction is to stop storing the full finding data locally and instead use Brinqa directly as the source of truth through authenticated Brinqa login HTTP requests.

The main idea is:

- use Brinqa login/authenticated HTTP requests to fetch data directly from Brinqa
- avoid storing all Brinqa finding data locally
- store only the minimum local data needed for scoring and ranking

## What Should Be Stored Locally

The local database should store only a small scoring-oriented dataset for each finding, such as:

- vulnerability or finding ID
- associated score
- the specific fields/features we use to calculate or explain that score

This keeps the local system lightweight and focused only on what the app itself needs to rank findings.

## What Should Come From Brinqa On Demand

All other finding data should be fetched from Brinqa when needed instead of being stored locally.

That includes:

- full finding details
- extra metadata not required for scoring
- detail-page information shown after a user clicks a finding

In other words, Brinqa should provide the detailed record at view time, and the local app should mainly keep enough data to sort and prioritize findings.

## Intended UI / Data Flow

The target workflow would be:

1. Pull or refresh the scoring-related dataset from Brinqa.
2. Store only the finding ID, score, and the limited scoring inputs locally.
3. Sort findings by score.
4. Show only the top 20 findings on the main page by default.
5. Paginate the remaining findings based on the same score-sorted order.
6. When a user clicks a finding, fetch the full detailed information directly from the Brinqa server.

## Why This Approach May Be Better

Potential benefits of this approach:

- avoids keeping a large duplicate copy of Brinqa data locally
- keeps detailed finding information fresher because it comes from Brinqa directly
- reduces local storage needs
- makes Brinqa the source of truth for full finding data
- keeps the local app focused on prioritization, ranking, and workflow

## Main Questions To Evaluate

These are the main things that need to be evaluated before implementation:

- how Brinqa authentication should be handled securely
- whether Brinqa exposes the needed APIs for list, search, pagination, and detail retrieval
- whether score inputs can be fetched efficiently without copying the full dataset locally
- how often the local scoring dataset should be refreshed
- how to handle caching, latency, rate limits, and session expiration
- whether the app should keep a small local cache for performance or offline use

## Summary

The current project is a vulnerability prioritization app, but today it is working from a manually loaded sample of about 2,000 Brinqa findings.

The desired next step is to move toward a hybrid approach where:

- local storage is limited to finding IDs, scores, and only the fields needed for scoring
- Brinqa is used directly for full finding details and additional metadata
- the main page shows the top 20 findings first
- pagination stays score-based
- clicking a finding loads its detailed information from Brinqa in real time

The main decision to make now is whether this Brinqa-first architecture is the best course of action technically, operationally, and from a product/performance perspective.
