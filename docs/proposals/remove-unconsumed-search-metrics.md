# Pending proposal: remove unconsumed search metrics

Implementation approval pending. Preserved verbatim from the three F1 sections of the completed OTel removal proposal. This local draft is excluded from the completed-work commit. Its unchecked tasks are not accepted or implemented; ordinary search logging and all five metric instruments remain unchanged.

## Proposed follow-up F1: remove unconsumed search metric instruments

**Status: proposal only; implementation approval pending.** The original thirteen removal tasks remain accepted. This follow-up is new scope prompted by the owner's later request to remove telemetry without a listener; it does not retroactively change the earlier decision/evidence to retain independent search meters. No runtime change is authorized by these draft tasks. The logging recommendation issue is handled separately by the coordinator.

Source inspection now finds one WFS-owned meter (`RecipeApi.Search`), four millisecond histograms and one fallback counter. `LoggingSearchTelemetry` is their only production writer; no repository OTel/non-OTel listener, exporter, aggregation reader or test consumer of those instruments exists. Its separate `ILogger.LogInformation` call has active console/file sinks and remains useful ordinary logging. The term “dead logs” therefore applies here to unconsumed metric recording, not to all methods/types named telemetry.

**Proposed change if approved:** delete only `SearchTelemetryMetrics` and its metric-recording/tag-building/helper code in `LoggingSearchTelemetry`. Preserve `ISearchTelemetry`, `SearchTelemetryEvents`, their producers/payloads, `StubSearchTelemetry`, ordinary Serilog/console output, duration calculations and all product behavior. No dependency, REST contract, generated client, database or deployment change is needed. No WFS-owned `ActivitySource`, `ActivityListener`, `DiagnosticListener`, browser performance-mark/observer or other metric instrument was found in the searched current source; framework/library diagnostic facilities remain outside this bounded proposal.

Trade-off: remove unused instrument registration and recording/tag-construction work, with no measured performance claim or change to log volume. A separately attached external tool such as dotnet-counters/EventPipe could in principle consume .NET meters without OTel; deployed external tooling was not inspected. This would remove its ability to subscribe to `RecipeApi.Search`, even though no such consumer is configured in this repository. Preserve built-in framework instrumentation and Next's optional OTel API peer rather than remove unrelated framework dependencies.

If approved, reconcile the standard-export delta's independent-diagnostics wording to explicitly preserve ordinary search logs while allowing these five instruments to retire; update the actual logging inventory and search runbook after implementation. Until then, their current “meters remain” statements are accurate.


## Proposed follow-up F1 — inventory and minimal removal, not yet approved

This section proposes a later revision to Decision1's meter-retention choice only. The completed removal and its thirteen accepted tasks keep their original acceptance identity. Ordinary search/index diagnostic logging stays within the preservation boundary.

### Actual current instruments and consumers

All five live under static `SearchTelemetryMetrics` in `api/src/RecipeApi/Services/ISearchTelemetry.cs:26–34`. The static `Meter` is named `RecipeApi.Search`. Only `api/src/RecipeApi/Services/LoggingSearchTelemetry.cs:10–29` records them:

| Instrument | Type/unit | Trigger/value | Measurement tags |
| --- | --- | --- | --- |
| `recipe.search.response.duration` | `Histogram<double>`, ms | SearchCompleted; `durationMs` when its payload value is a long | `search.result_path`, `search.latency_population`, `search.configuration_version` |
| `recipe.search.lexical.duration` | `Histogram<double>`, ms | SearchCompleted; long `lexicalDurationMs` | Same three tags |
| `recipe.search.semantic_attempt.duration` | `Histogram<double>`, ms | SearchCompleted; long `semanticAttemptDurationMs` | Same three tags |
| `recipe.search.reranking.duration` | `Histogram<double>`, ms | SearchCompleted; long `rerankingDurationMs` | Same three tags |
| `recipe.search.fallback.count` | `Counter<long>`, no unit specified | SearchFallbackServed; add1 | `search.failure_class`, `search.configuration_version` |

There is no in-repository MeterListener/ActivityListener/OTel subscription or other reader for these instruments. Search/index services emit diagnostic event dictionaries through `ISearchTelemetry`; they do not read the meter values. `SearchTelemetryTests` and `StubSearchTelemetry` consume those dictionaries directly and never attach a metric listener. `TelemetryRetirementTests` checks actual ordinary logging and absence of export/providers. None is a consumer of these histograms/counter.

No other application-owned meter/counter/histogram/observable instrument, ActivitySource, ActivityListener, DiagnosticListener/EventCounter, browser performance-mark/measure or PerformanceObserver declaration was found in current API/PWA source or configured consumers. This source conclusion does not prove that an external diagnostic process is absent from a deployment. Framework/runtime/library instruments can exist without explicit WFS declarations and are not candidates for deleting framework packages.

### Proposed edit boundary

- `Services/ISearchTelemetry.cs`: remove `SearchTelemetryMetrics` and its `System.Diagnostics.Metrics` using only. Keep the interface and all event constants, including the existing health-threshold constant, unchanged.
- `Services/LoggingSearchTelemetry.cs`: remove the metric-specific completed/fallback branches, TagList construction, histogram helper and now-unused Diagnostics usings. Retain the exact ordinary `logger.LogInformation("{EventName} {@Payload}", eventName, payload)` behavior for every event.
- Preserve DI registration in Program, all ISearchTelemetry callsites in search/index/management, correlation/configuration/duration payload fields and test stubs. Do not rename these owners merely because their names contain telemetry.
- Preserve Stopwatches in RecipeSearchService/SearchIndexWorkflow (ordinary diagnostic duration payloads), GroceryExtraService elapsed-budget logic and browser deployment-calendar `performance.now()` timing. They have product/log consumers and do not require an OTel listener.
- No manifest/lock, API/OpenAPI/client, schema/database, UI/Home/Tonight or deployment edits. The separately completed Mystery night files stay untouched.

### First observable follow-up slice and tests, if approved

Before removal, add `LoggingSearchTelemetryTests.cs` using the built-in .NET MeterListener only in test code. Observe published `RecipeApi.Search` instruments and double/long measurements while calling the real logging adapter with completed/fallback payloads; assert no publication or measurement after retirement. Capture a real ILogger sink at the same boundary and require unchanged Information event name/template/payload for completed, fallback and ordinary index/unknown events. This should fail on the current five published instruments, not on missing services or changed log expectations. No new package or production listener is needed.

After the two-file removal, run the focused new adapter tests plus existing SearchTelemetryTests and actual Program TelemetryRetirementTests; preserve their log/diagnostic assertions. Run the applicable repository gate against the complete follow-up path set only when implementation is approved and coordinate its evidence identity with other work. No test execution or runtime freeze is part of this review.

### Compatibility and trade-off

Metric removal stops publication of this meter and its five instruments to any later attached .NET listener, including non-OTel tooling. No configured repository consumer is lost; an external operator's tooling is unknown. Ordinary search logs still contain the same durations/counts/fallback reasons for diagnosis. Log volume, local retention, privacy exposure and business/audit state do not change. This is removal of unused metric work, not measured optimization and not authorization to reduce ordinary diagnostic logs.


## 6. Proposed follow-up F1: unconsumed search metrics — approval pending

**New scope, not implemented or accepted.** The original thirteen tasks above remain complete. These three unchecked tasks are a proposed follow-up for separate implementation approval; artifact readiness and their presence do not authorize running them. Do not acquire a whole-worktree freeze or touch the completed Mystery night files during this review. The coordinator owns the separate logging-recommendation issue.

**Proposed outcome:** No WFS-owned `RecipeApi.Search` meter/instrument is published or recorded; ordinary search/index Information logs and payloads, all other ordinary diagnostics and business behavior remain unchanged. No external consumer is configured in the repository; deployment-attached diagnostics are unverified.

- [ ] 6.1 **PROPOSED — await implementation approval.** Reconcile the standard-export delta's preservation wording for logs versus metric instruments, then add focused `api/src/RecipeApi.Tests/Services/LoggingSearchTelemetryTests.cs` with a test-only MeterListener and real ILogger capture. Exercise completed/fallback/index events using representative synthetic long duration payloads; require zero `RecipeApi.Search` publication/measurements and unchanged Information log template/name/payload. Run `task test:api -- --filter FullyQualifiedName~LoggingSearchTelemetryTests` and record intended red on current instrument publication before source edits, not an infrastructure failure.
- [ ] 6.2 **PROPOSED — await implementation approval; depends on6.1.** Remove only the SearchTelemetryMetrics class/using and adapter metric branches/TagLists/RecordDuration helper/usings from the two inventoried production files. Preserve interface/event constants, DI/callers/stubs, Stopwatches/budgets, payloads and ordinary logger call. Run `task test:api -- --filter 'FullyQualifiedName~LoggingSearchTelemetryTests|FullyQualifiedName~SearchTelemetry|FullyQualifiedName~TelemetryRetirement'` green with no weakened log assertions; inspect the diff for zero UI/database/contract/package changes and search current source for remaining WFS meter/ActivitySource/listener definitions.
- [ ] 6.3 **PROPOSED — await implementation approval; depends on6.2.** Update actual logging inventory/source index and `docs/operations/hybrid-recipe-search-rollout.md` to distinguish retained search logs/timing from removed instruments and unknown external consumers. Reconcile approved deltas and follow-up evidence without relabeling the original13-task gate. Run scoped formatting/preparation as applicable, strict OpenSpec validation and `task verify -- <complete-reviewed-follow-up-paths>` at coordinated stable identity; report required checks/skips/blockers and record_path. No deployment, external diagnostic-tool mutation, ordinary-log cleanup, staging/commit/push or premature sync/archive.
