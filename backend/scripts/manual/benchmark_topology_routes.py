#!/usr/bin/env python3
"""Read-only benchmark for topology and asset drill-down API routes."""

from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
import time
from contextlib import contextmanager
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from fastapi.testclient import TestClient
from sqlalchemy import event, text

from app.core.db import SessionLocal, engine
from app.main import app


@dataclass(frozen=True)
class BenchmarkRoute:
    page: str
    section: str
    method: str
    path: str
    notes: str = ""


@dataclass
class QuerySample:
    elapsed_ms: float
    statement: str


@dataclass
class RouteRun:
    status_code: int
    elapsed_ms: float
    db_ms: float
    query_count: int
    response_bytes: int
    slowest_sql_ms: float
    slowest_sql: str


@dataclass
class RouteResult:
    page: str
    section: str
    method: str
    path: str
    notes: str
    runs: list[RouteRun]


@dataclass
class RepresentativeContext:
    business_unit_name: str | None
    business_unit_slug: str | None
    business_service_name: str | None
    business_service_slug: str | None
    application_name: str | None
    application_slug: str | None
    asset_id: str | None


class QueryRecorder:
    def __init__(self) -> None:
        self.active = False
        self.samples: list[QuerySample] = []

    def before_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        if self.active:
            context._vc_benchmark_started_at = time.perf_counter()

    def after_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        started_at = getattr(context, "_vc_benchmark_started_at", None)
        if self.active and started_at is not None:
            self.samples.append(
                QuerySample(
                    elapsed_ms=(time.perf_counter() - started_at) * 1000,
                    statement=_fingerprint_sql(statement),
                )
            )

    @contextmanager
    def collect(self):
        self.samples = []
        self.active = True
        try:
            yield
        finally:
            self.active = False


def _fingerprint_sql(statement: str) -> str:
    normalized = re.sub(r"\s+", " ", statement).strip()
    return normalized[:260]


def _median(values: Iterable[float]) -> float:
    data = list(values)
    return statistics.median(data) if data else 0.0


def select_representative_context() -> RepresentativeContext:
    with SessionLocal() as db:
        business_unit = db.execute(
            text(
                """
                select name, slug
                from business_units
                order by coalesce(crq_business_unit_finding_count, 0) desc, lower(name)
                limit 1
                """
            )
        ).mappings().first()
        business_service = db.execute(
            text(
                """
                select
                  bs.name,
                  bs.slug,
                  bu.name as business_unit_name,
                  bu.slug as business_unit_slug
                from business_services bs
                join business_units bu on bu.id = bs.business_unit_id
                order by coalesce(bs.crq_business_service_finding_count, 0) desc, lower(bs.name)
                limit 1
                """
            )
        ).mappings().first()
        application = db.execute(
            text(
                """
                select
                  app.name,
                  app.slug,
                  bs.name as business_service_name,
                  bs.slug as business_service_slug,
                  bu.name as business_unit_name,
                  bu.slug as business_unit_slug
                from applications app
                join business_services bs on bs.id = app.business_service_id
                join business_units bu on bu.id = bs.business_unit_id
                order by coalesce(app.crq_application_finding_count, 0) desc, lower(app.name)
                limit 1
                """
            )
        ).mappings().first()
        asset = db.execute(
            text(
                """
                select asset_id
                from assets
                order by coalesce(crq_asset_finding_count, 0) desc, lower(coalesce(hostname, asset_id))
                limit 1
                """
            )
        ).mappings().first()

    context = RepresentativeContext(
        business_unit_name=business_unit["name"] if business_unit else None,
        business_unit_slug=business_unit["slug"] if business_unit else None,
        business_service_name=business_service["name"] if business_service else None,
        business_service_slug=business_service["slug"] if business_service else None,
        application_name=application["name"] if application else None,
        application_slug=application["slug"] if application else None,
        asset_id=asset["asset_id"] if asset else None,
    )

    if application is not None:
        context.business_service_name = application["business_service_name"]
        context.business_service_slug = application["business_service_slug"]
        context.business_unit_name = application["business_unit_name"]
        context.business_unit_slug = application["business_unit_slug"]
    elif business_service is not None:
        context.business_unit_name = business_service["business_unit_name"]
        context.business_unit_slug = business_service["business_unit_slug"]

    return context


def build_routes(context: RepresentativeContext) -> list[BenchmarkRoute]:
    routes = [
        BenchmarkRoute(
            page="Business units overview",
            section="Summary list",
            method="GET",
            path="/topology/business-units",
            notes="First page load; should use persisted BU totals.",
        )
    ]

    if context.business_unit_slug:
        bu = context.business_unit_slug
        routes.extend(
            [
                BenchmarkRoute("Business unit detail", "Header and service cards", "GET", f"/topology/business-units/{bu}"),
                BenchmarkRoute(
                    "Business unit detail",
                    "Risk overview charts",
                    "GET",
                    f"/topology/business-units/{bu}/risk-overview",
                    "Known hotspot candidate: builds distributions/trend from findings.",
                ),
                BenchmarkRoute(
                    "Business unit detail",
                    "Top findings table",
                    "GET",
                    f"/topology/business-units/{bu}/findings?page=1&page_size=5&sort_by=risk_score&sort_order=desc",
                ),
            ]
        )

    if context.business_unit_slug and context.business_service_slug:
        bu = context.business_unit_slug
        service = context.business_service_slug
        service_filter = _query_params(
            business_unit=context.business_unit_name,
            business_service=context.business_service_name,
            direct_only="true",
        )
        routes.extend(
            [
                BenchmarkRoute("Business service detail", "Header and child apps", "GET", f"/topology/business-units/{bu}/business-services/{service}"),
                BenchmarkRoute("Business service detail", "Service analytics", "GET", f"/topology/business-units/{bu}/business-services/{service}/analytics"),
                BenchmarkRoute(
                    "Business service detail",
                    "Direct asset inventory table",
                    "GET",
                    f"/assets?{service_filter}&page=1&page_size=50&sort_by=finding_count&sort_order=desc",
                    "Should not block service header.",
                ),
                BenchmarkRoute(
                    "Business service detail",
                    "Direct asset inventory analytics",
                    "GET",
                    f"/assets/analytics?{service_filter}",
                    "Known hotspot candidate if it loads all assets in Python.",
                ),
            ]
        )

    if context.business_unit_slug and context.business_service_slug and context.application_slug:
        bu = context.business_unit_slug
        service = context.business_service_slug
        application = context.application_slug
        application_filter = _query_params(
            business_unit=context.business_unit_name,
            business_service=context.business_service_name,
            application=context.application_name,
        )
        routes.extend(
            [
                BenchmarkRoute("Application detail", "Header and app summary", "GET", f"/topology/business-units/{bu}/business-services/{service}/applications/{application}"),
                BenchmarkRoute(
                    "Application detail",
                    "Application asset inventory table",
                    "GET",
                    f"/assets?{application_filter}&page=1&page_size=50&sort_by=finding_count&sort_order=desc",
                    "Potential duplicate payload if app detail also embeds assets.",
                ),
                BenchmarkRoute("Application detail", "Application asset inventory analytics", "GET", f"/assets/analytics?{application_filter}"),
            ]
        )

    if context.asset_id:
        asset_id = context.asset_id
        routes.extend(
            [
                BenchmarkRoute("Asset findings", "Asset header", "GET", f"/assets/{asset_id}"),
                BenchmarkRoute(
                    "Asset findings",
                    "Asset enrichment status",
                    "GET",
                    f"/assets/{asset_id}/enrichment",
                    "Runs without an auth token, so it should not call Brinqa upstream.",
                ),
                BenchmarkRoute(
                    "Asset findings",
                    "Findings table",
                    "GET",
                    f"/assets/{asset_id}/findings?page=1&page_size=20&sort_by=risk_score&sort_order=desc",
                ),
                BenchmarkRoute("Asset findings", "Findings analytics", "GET", f"/assets/{asset_id}/findings/analytics"),
            ]
        )

    return routes


def _query_params(**values: str | None) -> str:
    from urllib.parse import urlencode

    return urlencode({key: value for key, value in values.items() if value not in (None, "")})


def run_route(client: TestClient, recorder: QueryRecorder, route: BenchmarkRoute) -> RouteRun:
    with recorder.collect():
        started_at = time.perf_counter()
        response = client.request(route.method, route.path)
        elapsed_ms = (time.perf_counter() - started_at) * 1000

    db_ms = sum(sample.elapsed_ms for sample in recorder.samples)
    slowest = max(recorder.samples, key=lambda sample: sample.elapsed_ms, default=None)
    return RouteRun(
        status_code=response.status_code,
        elapsed_ms=elapsed_ms,
        db_ms=db_ms,
        query_count=len(recorder.samples),
        response_bytes=len(response.content),
        slowest_sql_ms=slowest.elapsed_ms if slowest else 0.0,
        slowest_sql=slowest.statement if slowest else "",
    )


def benchmark_routes(routes: list[BenchmarkRoute], runs: int) -> list[RouteResult]:
    recorder = QueryRecorder()
    event.listen(engine, "before_cursor_execute", recorder.before_cursor_execute)
    event.listen(engine, "after_cursor_execute", recorder.after_cursor_execute)
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            results: list[RouteResult] = []
            for route in routes:
                route_runs = [run_route(client, recorder, route) for _ in range(runs)]
                results.append(
                    RouteResult(
                        page=route.page,
                        section=route.section,
                        method=route.method,
                        path=route.path,
                        notes=route.notes,
                        runs=route_runs,
                    )
                )
            return results
    finally:
        event.remove(engine, "before_cursor_execute", recorder.before_cursor_execute)
        event.remove(engine, "after_cursor_execute", recorder.after_cursor_execute)


def render_markdown(context: RepresentativeContext, results: list[RouteResult]) -> str:
    lines = [
        "# Topology Route Benchmark",
        "",
        "## Representative Context",
        "",
        f"- Business unit: `{context.business_unit_name or 'n/a'}` / `{context.business_unit_slug or 'n/a'}`",
        f"- Business service: `{context.business_service_name or 'n/a'}` / `{context.business_service_slug or 'n/a'}`",
        f"- Application: `{context.application_name or 'n/a'}` / `{context.application_slug or 'n/a'}`",
        f"- Asset ID: `{context.asset_id or 'n/a'}`",
        "",
        "## Route Timings",
        "",
        "| Page | Section | Status | Median ms | Max ms | Median DB ms | Median queries | Median bytes | Slowest SQL sample |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ]

    for result in results:
        statuses = sorted({run.status_code for run in result.runs})
        median_ms = _median(run.elapsed_ms for run in result.runs)
        max_ms = max((run.elapsed_ms for run in result.runs), default=0.0)
        median_db_ms = _median(run.db_ms for run in result.runs)
        median_queries = _median(run.query_count for run in result.runs)
        median_bytes = _median(run.response_bytes for run in result.runs)
        slowest = max(result.runs, key=lambda run: run.slowest_sql_ms, default=None)
        slowest_sql = slowest.slowest_sql if slowest else ""
        lines.append(
            "| "
            + " | ".join(
                [
                    result.page,
                    result.section,
                    ", ".join(str(status) for status in statuses),
                    f"{median_ms:.1f}",
                    f"{max_ms:.1f}",
                    f"{median_db_ms:.1f}",
                    f"{median_queries:.0f}",
                    f"{median_bytes:.0f}",
                    f"`{slowest_sql}`",
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## Backend Hotspots To Inspect First",
            "",
            *_hotspot_lines(results),
            "",
            "## Frontend Loading Checks",
            "",
            "- Use `localStorage.setItem('vcApiTimings', '1')` in the renderer, reload, then inspect `window.__VC_API_TIMINGS__`.",
            "- Confirm page headers render independently from analytics/findings/inventory calls.",
            "- Business unit risk overview, asset inventory analytics, and asset finding analytics should show section-level loading instead of blocking the whole page.",
        ]
    )
    return "\n".join(lines) + "\n"


def _hotspot_lines(results: list[RouteResult]) -> list[str]:
    slowest = sorted(
        results,
        key=lambda result: _median(run.elapsed_ms for run in result.runs),
        reverse=True,
    )[:5]
    if not slowest:
        return ["- No routes were benchmarked."]

    lines = []
    for result in slowest:
        median_ms = _median(run.elapsed_ms for run in result.runs)
        median_queries = _median(run.query_count for run in result.runs)
        lines.append(
            f"- `{result.method} {result.path}`: {median_ms:.1f} ms median, "
            f"{median_queries:.0f} median SQL statements. {result.notes}".rstrip()
        )
    return lines


def to_json_payload(context: RepresentativeContext, results: list[RouteResult]) -> dict[str, Any]:
    return {
        "context": asdict(context),
        "results": [
            {
                "page": result.page,
                "section": result.section,
                "method": result.method,
                "path": result.path,
                "notes": result.notes,
                "runs": [asdict(run) for run in result.runs],
            }
            for result in results
        ],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runs", type=int, default=6, help="Number of runs per route, including the first cold-ish run.")
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    parser.add_argument("--output", type=Path, help="Optional file path for the benchmark report.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.runs < 1:
        raise SystemExit("--runs must be at least 1")

    context = select_representative_context()
    routes = build_routes(context)
    results = benchmark_routes(routes, args.runs)

    if args.format == "json":
        output = json.dumps(to_json_payload(context, results), indent=2)
    else:
        output = render_markdown(context, results)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output, encoding="utf-8")
    else:
        print(output)

    failed = [result for result in results if any(run.status_code >= 400 for run in result.runs)]
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
