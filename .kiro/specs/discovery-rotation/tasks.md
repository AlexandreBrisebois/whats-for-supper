# Discovery rotation — tasks

Status: specification and review complete; all implementation tasks unselected.
Read [requirements](requirements.md), [design](design.md) and [review](review.md).
The user's vote-purge constraint applies to every task. No commit or deployment
is authorised by this specification.

## DR-1 — Server eligibility and rotation

- [ ] Implement only when this slice is selected.

**Requirements:** DR-R1, DR-R2, DR-R5. **Dependency:** approved specification.

**Outcome:** the existing GET returns calendar-eligible recipes in the specified
single order, with identical response shape and unchanged purge behaviour.

**Files/effects:** `api/src/RecipeApi/Services/DiscoveryService.cs`;
`specs/openapi.yaml` GET Discovery/category descriptions only;
`api/src/RecipeApi.Tests/Services/DiscoveryServiceTests.cs`;
`api/src/RecipeApi.Tests/Integration/DiscoveryIntegrationTests.cs`;
new focused `api/src/RecipeApi.Tests/Integration/DiscoveryPostgresTests.cs` if no
existing fixture can host the real-database cases. Direct test construction of
DiscoveryService may be updated for the clock in affected tests only.

**Context:** current view in `api/database/schema.sql`, `DiscoveryRecipe`,
`Recipe`, `RecipeVote`, `CalendarEvent`, `IClock`, `ScheduleService.LockScheduleAsync`
and `ValidateDayAsync`, plus the established PostgreSQL test fixture pattern.

**Work:** first document the GET semantics and write failing acceptance tests;
then add the local shared eligibility query and batched ranking inputs. Preserve
both purge methods byte-for-byte. Include saved-rating order, plan/cook maximum,
date boundaries, tie stability, requester filters and categories. The lock test
must retain an unselected voted recipe to prove the purge remains global.

**Checks:** focused API unit/HTTP tests and real PostgreSQL cases. Record whether
database tests ran, failed or were blocked. Prove the serialized shape unchanged;
no schema/client edits expected. Use `task test:api` for applicable broad API
coverage when the slice is complete.

**Stop:** no PWA, Search, planner algorithm, migration, purge or voting-lifecycle
edits. If a schema change appears necessary, reconcile this design before writing
one; do not expand this task silently. DR-2 remains separately selectable.

## DR-2 — Present the server's first recipe first

- [ ] Implement only when this slice is selected.

**Requirements:** DR-R3, DR-R5. **Dependency:** DR-1.

**Outcome:** store, visible cards, swipe callbacks and buttons agree that index
zero is front; layout and interactions remain otherwise unchanged.

**Files/effects:** `pwa/src/app/(app)/discovery/page.tsx`;
`pwa/src/components/discovery/DiscoveryCard.tsx` only if a front-card test attribute
or layering correction is needed; its existing component tests,
`pwa/src/app/(app)/discovery/page.test.tsx` (new if absent), and
`pwa/e2e/discovery.spec.ts`.

**Work:** write the six-card first-vote regression before changing presentation.
Update first-four rendering, stack indices, visible-removal badge and both
buttons consistently. Assert the second vote as well as the first. Avoid visual
redesign or broad component refactoring.

**Checks:** focused PWA tests and Discovery E2E with correct front-card/POST
assertions, plus applicable lint/type checks. Existing animations and accessibly
named voting controls remain functional.

**Stop:** do not claim live convergence complete; DR-3 owns invalidation and
reconciliation. Do not touch unrelated recipe-import-reporting tests.

## DR-3 — Reconcile live Discovery order

- [ ] Implement only when this slice is selected.

**Requirements:** DR-R4, DR-R5. **Dependency:** DR-2.

**Outcome:** existing SSE signals cause a guarded server refresh, preserving an
eligible front card and promoting recipes from anywhere in the remaining stack.

**Files/effects:** `pwa/src/store/discoveryStore.ts` and its tests;
`pwa/src/hooks/useScheduleStream.ts` and its tests;
`pwa/src/app/(app)/discovery/page.tsx` and `page.test.tsx` in that directory;
`pwa/e2e/discovery.spec.ts`; `pwa/e2e/mock-api.ts` only for required stateful
Discovery fixtures/event helpers. Existing API wrapper may receive a narrowly
necessary request-plumbing change, without altering its public payload shape.

**Work:** tests first for deep promotion, zero count, front stability and removal,
purge/empty recovery, reconnect, same-member voting races, member changes,
unmount/remount and failed-write recovery. Prove old-context voting is disabled
during an identity switch. Replace local ranking with a revision-triggered GET and
full reconciliation. Guard all loading paths consistently; coalesce concurrent
invalidations. Preserve Search, QuickFind and planner dispatch behaviour.

**Checks:** store/hook/page unit tests and Discovery E2E, including out-of-order
GET completion, vote POST identity, current-front eligibility, zero-to-nonzero
stack recovery and a threshold-crossing planner event regression. Confirm a
week lock refreshes Discovery even without `fill_the_gap_invalidated`.

**Stop:** no new API/DTO/event, initial interest-badge metadata, local ranking
formula, generic request framework, planner ranking or purge change.

## DR-4 — Verify the selected implementation and scope

- [ ] Run only after DR-1–DR-3 are implemented and this verification is selected.

**Requirements:** all. **Dependency:** DR-3.

**Files/effects:** this task evidence and corrections confined to the selected
Discovery slices; no new feature scope. One writer executes dependent tasks
sequentially; no parallel production work is needed.

**Checks:** inspect Taskfile targets and isolated runtime setup; run focused
cases before broad `task test:api`, `task test:unit` and
`task test:e2e -- e2e/discovery.spec.ts` as applicable. Before final verification,
inspect/run `task agent:prepare`, review actual changes against the starting
content snapshot, then run the single `task agent:finish` completion entrypoint.
Its selected checks and identity are authoritative for that invocation; focused
real PostgreSQL and feature acceptance evidence remain separate obligations.
Do not describe InMemory/HTTP/mock success as deployed-runtime qualification.

**Scope review:** prove both purge implementations, planner smart defaults,
Search policy, database schema/views and generated files were preserved. Explain
each changed production file and unexpected diff. Preserve unrelated staged and
unstaged content. Record passed/failed/blocked/not-run/not-applicable evidence.

**Stop:** report actual checks and remaining limitations; do not commit, deploy
or select follow-up planner work.

## Specification evidence — 2026-09-20

- Authoring: followed `.agents/prompts/spec-writer.md` and shared specification
  workflow. Review: followed `.agents/prompts/spec-reviewer.md` sequentially.
- User decision: single active-vote-first order; global purge unchanged.
- Starting HEAD: `419ae3f6ef65c8d9c8387c9178f718e36f12398a`; baseline snapshot:
  `/private/tmp/wfs-discovery-spec-baseline-20260920T201801` (HEAD, branch,
  staged/unstaged binary patches and untracked contents).
- Pre-existing change: staged `pwa/e2e/recipe-import-reporting.spec.ts`; outside
  scope. Specification work does not authorise preparation that formats it.
- Source/contract trace and semantic review: completed; findings and corrections
  recorded in [review](review.md).
- Documentation validation and final scope evidence: recorded in review.
- Application tests, real database tests, implementation preparation/finish and
  live endpoint qualification: not run; application behaviour was not modified.
