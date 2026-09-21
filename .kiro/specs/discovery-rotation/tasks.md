# Discovery rotation — tasks

Status: specification and review complete; all implementation tasks unselected.
Read [requirements](requirements.md), [design](design.md) and [review](review.md).
The user's vote-purge constraint applies to every task. No commit or deployment
is authorised by this specification.

## DR-1 — Server target context, eligibility and rotation

- [ ] Implement only when this slice is selected.

**Requirements:** DR-R0, DR-R1, DR-R2, DR-R5. **Dependency:** approved specification.

**Outcome:** Discovery returns an authoritative target context plus
calendar-eligible recipes in the specified single order. It preserves continuous
pre-votes and unchanged purge behaviour, returns `TargetWeekFull` when the
explicit target has no capacity, and has no implicit next-week opening.

**Files/effects:** `api/src/RecipeApi/Services/DiscoveryService.cs`;
`api/src/RecipeApi/Services/ScheduleService.cs` only for the explicit
single-`VotingOpen` conflict guard; `api/src/RecipeApi/Controllers/DiscoveryController.cs`;
Discovery DTOs; `specs/openapi.yaml`; generated Discovery client;
`api/src/RecipeApi.Tests/Services/DiscoveryServiceTests.cs`;
`api/src/RecipeApi.Tests/Integration/DiscoveryIntegrationTests.cs`;
new focused `api/src/RecipeApi.Tests/Integration/DiscoveryPostgresTests.cs` if no
existing fixture can host the real-database cases. Direct test construction of
DiscoveryService may be updated for the clock in affected tests only.

**Context:** current view in `api/database/schema.sql`, `DiscoveryRecipe`,
`Recipe`, `RecipeVote`, `CalendarEvent`, `IClock`, `ScheduleService.LockScheduleAsync`
and `ValidateDayAsync`, plus the established PostgreSQL test fixture pattern.

**Work:** first document the response envelope and write failing acceptance tests;
then resolve the one explicit voting target and its capacity in the same Discovery
read as the local shared eligibility query and batched ranking inputs. Preserve
both purge methods byte-for-byte and do not call open-voting from lock. Reject a
second open target without changing plans or votes. Include standing pre-votes,
arbitrary-future target selection, full-capacity/null-recipe/skipped boundaries,
saved-rating order, plan/cook maximum, date boundaries, tie stability, requester
filters and categories. On consensus, resolve the selected target for the
existing smart-default path without changing its threshold, ranking or assignment.
The lock test must retain an unselected voted recipe to prove the purge remains
global.

**Checks:** focused API unit/HTTP tests and real PostgreSQL cases. Record whether
database tests ran, failed or were blocked. Prove recipe DTO compatibility and
the serialized envelope/context; regenerate and typecheck the affected client.
Use `task test:api` for applicable broad API coverage when the slice is complete.

**Stop:** no PWA, Search, planner ranking/assignment, migration, purge rewrite,
automatic week opening or new vote/session persistence. If a schema change beyond
the response contract appears necessary, reconcile this design before writing one;
do not expand this task silently. DR-2 remains separately selectable.

## DR-2 — Present the server's first recipe and full-plan state

- [ ] Implement only when this slice is selected.

**Requirements:** DR-R0, DR-R3, DR-R5. **Dependency:** DR-1.

**Outcome:** store, visible cards, swipe callbacks and buttons agree that
`response.recipes[0]` is front. A target-full response renders the existing
"That's a wrap!" completion shell with the dated full-plan copy and Go to Planner,
not the ordinary exhausted-stack refresh/capture choices.

**Files/effects:** `pwa/src/lib/api/discovery.ts` and its tests for the generated
response mapping; `pwa/src/store/discoveryStore.ts` and its tests for target
context; `pwa/src/app/(app)/discovery/page.tsx`;
`pwa/src/components/discovery/DiscoveryCard.tsx` only if a front-card test attribute
or layering correction is needed; its existing component tests,
`pwa/src/app/(app)/discovery/page.test.tsx` (new if absent), and
`pwa/e2e/discovery.spec.ts`.

**Work:** write the six-card first-vote and target-full regressions before
changing presentation. Update first-four rendering, stack indices,
visible-removal badge and both buttons consistently. Preserve the existing
"That's a wrap!" title and Go to Planner action; distinguish only the body copy
and suppress both refresh controls for target-full. Assert the second vote as
well as the first. Avoid visual redesign or broad component refactoring.

**Checks:** focused PWA tests and Discovery E2E with correct front-card/POST and
full-plan/no-refresh assertions, plus applicable lint/type checks. Existing
animations and accessibly named voting controls remain functional.

**Stop:** do not claim live convergence complete; DR-3 owns invalidation and
reconciliation. Do not touch unrelated recipe-import-reporting tests.

## DR-3 — Reconcile live Discovery order

- [ ] Implement only when this slice is selected.

**Requirements:** DR-R4, DR-R5. **Dependency:** DR-2.

**Outcome:** existing SSE signals cause a guarded server refresh, preserving an
eligible front card and promoting recipes from anywhere in the remaining stack,
while full target plans empty and refill only from authoritative context.

**Files/effects:** `pwa/src/store/discoveryStore.ts` and its tests;
`pwa/src/hooks/useScheduleStream.ts` and its tests;
`pwa/src/app/(app)/discovery/page.tsx` and `page.test.tsx` in that directory;
`pwa/e2e/discovery.spec.ts`; `pwa/e2e/mock-api.ts` only for required stateful
Discovery fixtures/event helpers. Existing API wrapper may receive a narrowly
necessary request-plumbing change, without altering the response-envelope
contract established by DR-1.

**Work:** tests first for deep promotion, zero count, front stability and removal,
ordinary-empty recovery, target-full-to-open recovery after slot removal, reconnect,
same-member voting races, member changes, unmount/remount and failed-write
recovery. Prove old-context voting is disabled during an identity switch. Replace
local ranking with a revision-triggered GET and full reconciliation. Guard all
loading paths consistently; stop category scanning only for `TargetWeekFull`.
Coalesce concurrent invalidations. Preserve Search, QuickFind and planner dispatch
behaviour.

**Checks:** store/hook/page unit tests and Discovery E2E, including out-of-order
GET completion, vote POST identity, current-front eligibility, zero-to-nonzero
ordinary and target-full stack recovery, and a threshold-crossing planner event
regression. Confirm a week lock refreshes Discovery even without
`fill_the_gap_invalidated` and does not open another target.

**Stop:** no further API/DTO/event contract beyond DR-1, initial interest-badge
metadata, local ranking formula, generic request framework, planner ranking or
purge change.

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

**Scope review:** prove both purge implementations, no automatic week opening,
planner smart-default ranking/assignment, Search policy and database schema/views
were preserved; distinguish the intentional target-week resolution for existing
smart defaults from a ranking/assignment change; account for the intentional
OpenAPI/generated-client envelope change. Explain each changed production file
and unexpected diff. Preserve unrelated staged and unstaged content. Record
passed/failed/blocked/not-run/not-applicable evidence.

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

### Specification amendment — 2026-09-20

- User decision: Discovery remains continuously votable; votes with no selected
  week are standing pre-votes. Locking never opens a week. An explicitly opened
  future week is the sole target, and a full target shows the existing "That's a
  wrap!" state with plan-complete copy rather than refresh.
- Amendment baseline: `/private/tmp/wfs-discovery-rotation-revision-u6zr6V`
  (HEAD, worktree status and pre-amendment copies of these three files). The
  baseline had no tracked or untracked worktree changes reported by Git.
- This amendment changes specification only. Application tests, generated-client
  work, implementation preparation/finish and live qualification remain not run.
