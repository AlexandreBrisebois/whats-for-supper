# Tasks

## 1. Recover every mounted Search mode

**Outcome and scenarios:** Broaden received-invalidation refresh and current-request failure/retry, retaining successful-empty behavior.
**Owners and boundaries:** Recipes page, generated-client search wrapper, freshness store and existing SSE hook. No API contract or server ranking changes.
**Dependencies and prerequisites:** Pinned Node/Next and repository tests; apply existing PWA instructions.
**Acceptance boundary:** Page unit tests for request/state ordering and Playwright for actual `week_updated` listener → POST search → visible result/retry, with HTTP transport fixtures.

- [x] 1.1 Add typed/Similar and initial-inflight invalidation regression plus failed refresh retry tests to `recipes/page.test.tsx`; observe intended failures with `task test:unit -- 'src/app/(app)/recipes/page.test.tsx'` before implementation.
- [x] 1.2 Update the existing refresh/request state owner and explicit retry presentation; pass page tests covering filters/preferences/week context, no refresh loop, obsolete success/failure, and successful-empty preservation.
- [x] 1.3 Add and pass browser SSE invalidation recovery scenarios for browse, typed and Similar with retained input, failure/retry and superseded responses using schema-compliant schedule/search fixtures; run affected page/hook tests and `task test:e2e -- search-invalidation-recovery.spec.ts`.

## 2. Final integration and verification

- [x] 2.1 Record red/green evidence, run scoped preparation, review complete diff, and run `task verify -- <reviewed paths>` for the authorized batch; reconcile all required acceptance and record its evidence path.

## Workflow follow-up

- Sync main Search spec, archive after acceptance, remove completed WFS-BL-006 and update backlog references.
- Validate final OpenSpec/docs state and publish through the connector to the existing branch/PR.

Red evidence: page suite failed 5 new refresh/retry cases and passed 33 existing tests before production changes (`/tmp/wfs-006-red.log`).

Green evidence: 41 page tests and 36 existing SSE hook tests passed. Three mode-specific browser refresh/error/retry scenarios passed; pending-first-response scenario passed after accounting for development Strict Mode duplicate initial requests. Real week_updated listener exercised with fixture payload and mocked POST boundary. Lint passed. Final harness remains pending.

Final combined harness: `.task/agent-finish/runs/0f943ace68114fba8f878ecc0f3a5a58.json` passed all applicable checks with stable content: 824 unit tests, 937 API tests (62 opt-in skips), 267 browser tests (13 existing skips), contracts/Kiota, live endpoint parity and 65 PostgreSQL tests with zero skips (`.task/database-tests/runs/a2b008734b5f4548965c83748831a843/result.json`). The earlier run `bcb4652b1eb14125af19c7fcc3bdf78d.json` failed fixture formatting/type cast and input stability after unit execution; those were corrected before the passing run. External providers, production/native-device behavior and universal event delivery are not qualified. Subsequent archival/docs edits receive separate documentation verification.
