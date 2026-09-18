# Hybrid recipe-search operations runbook

## Configuration and privacy

`WFS_ENABLE_SEMANTIC_RETRIEVAL` is process-start configuration. Change it only
through approved environment configuration and record
`WFS_SEARCH_CONFIGURATION_VERSION` with the change. Never put a user query,
continuation token, or their derivative in configuration, dashboards, alerts,
probe output, or incident notes.

| Flag | Default | Purpose |
| --- | --- | --- |
| `WFS_ENABLE_SEMANTIC_RETRIEVAL` | `true` | Independently serve semantic fusion; set `false` to retain lexical serving. |
| `WFS_SEARCH_CONFIGURATION_VERSION` | `hybrid-search-v1` | Low-cardinality configuration version attached to telemetry. |

`OpenTelemetry:Endpoint` enables metric export for the `RecipeApi.Search` meter.
The dashboard and alert definitions are in `ops/observability/`.

## Supported operation and rollback

1. Verify the release uses the intended additive schema and run reconciliation; do
   not reset or re-import recipes.
2. PostgreSQL lexical retrieval is always the serving and fallback path. Confirm
   lexical p95 is below 250 ms and ready-document coverage is adequate.
3. Confirm hybrid p95 below 600 ms and semantic-failure fallback p95 below 600 ms
   separately before enabling semantic serving for a new environment.

To stop semantic retrieval, set `WFS_ENABLE_SEMANTIC_RETRIEVAL=false` and restart
the API. Database lexical retrieval remains active. A compatible prior application
artifact must be verified against the retained additive schema before release.

## Backfill and coverage

Trigger `POST /api/management/backfill-search` only in an approved environment.
It dispatches the resumable reconciliation workflow; it is not a migration or
recipe re-import. Track eligible recipes, ready canonical documents, and ready
compatible embeddings from `recipe_search_completed` telemetry. Investigate stalled
workflow tasks, failed indexing telemetry, and configuration/model mismatch before
cutover. Coverage is incomplete until the recorded ready-document numerator covers
the eligible-recipe denominator.

## Provider or vector failure

Caller cancellation is not a fallback. It must propagate. A semantic timeout or
provider/vector error is `semantic_budget_exhausted` or
`semantic_provider_or_vector_error`; the response path must be `fallback-lexical`.
Its latency includes the failed semantic attempt. If fallback alerts fire, disable
semantic serving first, retain a lexical path, and inspect the component-duration
panel and provider/vector health. The semantic budget remains 300 ms for embedding
plus vector retrieval.

## Slow queries

Use the three independent p95 populations from the dashboard:

- lexical-only: below 250 ms;
- hybrid: below 600 ms;
- semantic-failure fallback: below 600 ms, including the failed semantic attempt.

For a breach, identify the affected result path and configuration version, inspect
lexical, semantic-attempt, and reranking duration histograms, then capture a
production-like `EXPLAIN (ANALYZE, BUFFERS)` only in an approved environment. Do
not use in-memory test results as query-plan evidence.

## On-call diagnostics

Record environment, deployment artifact, configuration version, cohort, and time
window. Check synthetic lexical and hybrid probes, fallback/failure class, p95
population, readiness coverage, zero-result rate, and workflow backlog. Do not
record raw request content. Escalate before changing semantic configuration.
