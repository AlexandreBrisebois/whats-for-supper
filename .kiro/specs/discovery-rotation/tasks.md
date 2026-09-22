# Discovery card order — tasks

Status: reframed proposal; implementation is unselected. Read [requirements](requirements.md) and [design](design.md). No commit, deployment, or successor implementation is authorized.

## DCO-1 — Make the first Discovery result the front card

- [x] Implement only when this task is selected.

**Requirements:** DCO-R1, DCO-R2.

**Outcome:** The current server-ranked first recipe is the front card and is the recipe voted by every Discovery control.

**Authorized effects:** pwa/src/app/(app)/discovery/page.tsx, focused page/component tests, and pwa/e2e/discovery.spec.ts plus the smallest mock-fixture support required. Inspect existing test locations before creating files. No API, generated-client, store, backend or schema edit is authorized.

**Work:** First add the six-recipe regression with an older first item and recently cooked final item. Replace final-four/reverse stack mapping with first-four/direct-index mapping. Route Like and Dislike controls to recipes[0]; verify front-card swipe uses the same recipe. Preserve all styles, accessible control names, animations and empty-state behaviour.

**Checks:** Run focused PWA tests and the Discovery E2E test. Assert displayed-front ID/name, POST ID, second-vote ID, visible four IDs and no reversal. Then run applicable PWA type/lint checks. Record each result as passed, failed, blocked, not-run or not-applicable.

**Stop:** Do not change server sort, discovery API contract, vote semantics, SSE/store logic, calendar policy, target context, card component design or planner behaviour. A later slice owns every such change.

**DCO-1 implementation evidence — 2026-09-21:**

- Passed: focused Discovery page/component unit tests (6), PWA typecheck, PWA lint, static route/mock reconciliation, and Discovery Playwright suite (11), including the six-recipe first-item/front-card/two-vote regression.
- Blocked: `task agent:prepare` detected concurrent unknown-scope changes in `docker/compose/ci-overrides.yml`; it made no formatting or generation changes. Therefore `task agent:finish` is not run under the one-shot completion protocol.
- Not applicable: API, OpenAPI, generated-client, backend, schema, database, server-order, and live-service validation; this is a presentation-only slice.

## Proposed follow-up selection order

The successor packages and dependencies are proposed in [design](design.md#successor-vertical-specifications). Select and author one package at a time, beginning with that package's tracer bullet.

## Specification evidence — 2026-09-21

- This revision supersedes the earlier voting-context-first reframing. A pre-revision copy of this package and its patch is retained at /private/tmp/wfs-discovery-card-order-revision-20260921T110929Z.
- Current-source inspection confirmed the defect: the page renders recipes.slice(-4), calculates front from recipes.length - 1 - globalIndex, and the control buttons vote recipes[recipes.length - 1]. The service currently orders vote count descending then last-cooked ascending.
- No application code, OpenAPI contract, generated client, test or runtime validation was changed or run by this specification-only revision.
