# SFD-7 contract sync and regression verification

Scope: user-selected SFD-7 on 2026-09-20. The starting worktree was already
dirty with the completed SFD feature slices. Its full staged/unstaged/untracked
content was captured before SFD-7 work at
`/private/tmp/wfs-sfd7-baseline-20260920T000000` (HEAD
`31e5d4a718ab78575eaa72451545c12d1a0a2f59`; staged patch empty).

## SFD-7 corrections

- OpenAPI now marks the always-serialized `isPromotionEligible` search-result
  boolean as required, matching `RecipeSearchResultDto`; this resolved the
  static API/schema drift check without changing server behavior.
- E2E filter metadata uses named Main-vocabulary constants rather than inline
  entity-like IDs. This preserves the approved string vocabulary and makes the
  generic GUID mock audit apply only to actual entity identifiers.
- Search's schedule-invalidation refresh is deferred with cancellable timer
  cleanup, preserving request-generation guards while complying with the React
  no-synchronous-state-update effect rule. No Discovery source was changed.

## Contract and test evidence

- **Passed:** `task agent:prepare` (with the compatible local .NET runtime):
  Kiota generation and API/PWA formatting completed; no formatting delta.
  `task gen:client:check` subsequently reported the generated client current.
- **Passed:** `task review`: static route, schema and mock drift checks;
  reconciliation (including `/api/recipes/search/filters`); API lint; PWA
  format/typecheck/lint; 521 passed/4 skipped PWA unit tests; 710 passed/23
  skipped API tests; 46 agent-harness tests.
- **Passed:** disposable `pgvector/pgvector:pg18` PostgreSQL at port 55439:
  `WFS_TEST_POSTGRES_CONNECTION=... dotnet test ... --filter
  'FullyQualifiedName~RecipeSearchFilterMaterializerPostgresTests|FullyQualifiedName~RecipeLexicalSearchPostgresTests|FullyQualifiedName~RecipeSearchIntegrationTests'`
  returned 55 passed, 0 failed, 0 skipped. It covers durable materialization
  clean-install/compatibility, Cuisine/Meal hard predicates, concept fallback,
  sparse Quick traversal, continuation rechecks, and HTTP search guards.
  The uniquely named databases and the container were removed after the run.
- **Passed:** current-worktree Playwright against a dedicated temporary PWA at
  `127.0.0.1:3001`: `BASE_URL=http://127.0.0.1:3001 task test:e2e --
  e2e/recipes.spec.ts e2e/discovery.spec.ts` returned 22 passed/4 skipped.
  The new recipe route covers fixed section order/disclosure, fallback metadata,
  hidden Cuisine until materialized options, custom Main/concept mapping, and
  request payloads. All 10 Discovery tests passed; its source diff is empty.
- **Blocked:** `task agent:drift:endpoints`: no API at
  `http://127.0.0.1:5001/openapi/v1.json`. Static reconciliation, the isolated
  database tests, and mocked E2E do not establish live endpoint parity.

## Acceptance assessment

The passing unit/E2E/database evidence covers filter order and disclosure,
configuration fallback, hidden Cuisine, Main concept fallback, Quick traversal,
Search-only calendar promotion guards, unchanged vote evidence, stale request
protection, and continuation deduplication/restart handling. Search uses its
own promotion freshness store; Discovery service/store/page behavior is not
modified and its regression suite passed.

## Integrated browse performance

Live before/after performance qualification is **blocked**, not failed or
passed. The SFD-5a baseline recorded zero representative samples because the
local API/browser endpoints were unreachable; the SFD-7 live endpoint probe is
still unreachable. Therefore initial/continuation p50/p95, database duration
and payload, and visible-scroll waits remain sample count 0 under no matched
dataset/device/network scenario. Source and mocked coverage confirms the
integrated final settings (12 initial, 24 browse continuation, 400px prefetch,
Quick before limits/cursors), but it does not demonstrate a live improvement.

## Scope review

Compared to the captured baseline, SFD-7 changed only this evidence file plus:
`specs/openapi.yaml` requiredness; the two recipes E2E mock/test files; and the
Search page's deferred invalidation callback/dependency list. All other tracked
and untracked feature files predate SFD-7 and remain preserved. `git diff
--check` passed. No commit or deployment was performed.
