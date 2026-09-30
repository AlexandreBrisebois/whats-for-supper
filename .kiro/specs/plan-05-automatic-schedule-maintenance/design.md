# PLAN-05 — Automatic schedule maintenance: design baseline

## Status

Baseline proposed/current-behavior design derived from [`requirements.md`](requirements.md). It records current integration evidence and candidate verification seams. **Implementation is not authorized.**

## Verified current integration map

- `api/src/RecipeApi/Services/Processors/FinalizeOverdueMealsProcessor.cs`
- `api/src/RecipeApi/Services/ScheduleService.cs`
- `api/src/RecipeApi/Services/DreamingWorkflowSeeder.cs`
- `api/src/RecipeApi/Workflows/dreaming.yaml`
- `api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs`
- `api/src/RecipeApi.Tests/Services/DreamingWorkflowSeederTests.cs`

### Ownership and flow

1. The route/component accepts interaction and keeps only ephemeral presentation state.
2. The relevant Zustand store or API wrapper translates feature intent into generated-client or explicit HTTP calls.
3. The current API controller operation validates household/member context and delegates to its service or workflow.
4. Durable ownership remains server schedule persistence and workflow scheduler state; response data and `/api/stream` events reconcile participating clients where the feature is shared.
5. Tests adjacent to the listed source and controller/service tests are the preferred executable evidence; `specs/openapi.yaml` is the contract authority for exposed operations.

## Behavior design

### Success

- Render confirmed data with stable identity and retain relevant member, week, date, or recipe context through navigation.
- Disable only conflicting work while a mutation is pending; apply the accepted response, then reconcile matching shared events idempotently.
- Report success only for an accepted operation. Browser-only conveniences such as clipboard/share do not redefine server success.

### Empty, loading, errors, and recovery

- Loading retains safe confirmed content where available and exposes a perceivable busy state.
- Empty state distinguishes “no configured/assigned data” from loading and failure.
- Authentication/authorization failure returns to the appropriate access or identity recovery path; validation/conflict errors preserve inputs and explain the next action.
- Network/server failure restores the last confirmed state. Retry reuses feature context but does not blindly replay a mutation whose outcome is unknown.
- Late results are ignored when their member, week, slot, recipe, request generation, or mounted surface no longer matches.

### Concurrency

- Server responses/events are authoritative. Optimistic changes require a pre-mutation snapshot or equivalent rollback data.
- Matching SSE events may confirm local work; echoed or older events must not cause duplicate effects or visual regression.
- A reconnect/snapshot converges client state without overwriting a newer guarded optimistic write; conflicts are surfaced rather than silently dropping displaced information.

### Security and privacy

- Household credentials use the existing authentication mechanism; member identity scopes personalized operations but is not a replacement for household authentication.
- Secrets and signed invitation material are not logged, rendered after consumption, placed in telemetry, or sent to unrelated origins.
- Destructive or household-wide changes require explicit intent and server authorization; inputs are contract-validated.

### Accessibility and localization

- Semantic headings, labels, focus management, keyboard activation, live status/error announcements, and non-color state indicators cover every interactive flow.
- Copy is localized through current locale facilities. Dates are transported in contract format and presented in the member locale without changing schedule-day identity.

### Performance and operations

- Avoid duplicate fetch/mutation calls and unbounded suggestion/list rendering. Preserve store selectors and targeted event updates to limit rerenders.
- Do not log credentials or full private payloads. Operational signals should distinguish validation, conflict, authorization, dependency, and unexpected failures without inventing success.

## Requirement traceability

| Requirements | Design seam |
|---|---|
| PLAN-05-AC-01, PLAN-05-AC-02, PLAN-05-AC-03 | Route/component → store/API → controller/service → authoritative state |
| PLAN-05-AC-04 | Pending guard, confirmed snapshot, actionable error, retry |
| PLAN-05-AC-05 | Context keys, optimistic guard, SSE echo/reconnect reconciliation |
| PLAN-05-AC-06 | Semantic controls, focus/live regions, locale-safe copy and dates |
| PLAN-05-AC-07 | Authentication/member scope, context-preserving navigation, non-target preservation |

## Verified facts versus future decisions

**Verified facts:** the files above currently own the visible/client/server seams; generated API code is derived from `specs/openapi.yaml`; shared schedule behavior uses `/api/stream`; server schedule persistence and workflow scheduler state is the observed state boundary.

**Future decisions (not implementation commitments):** final product copy, retention/audit policy, conflict UX, service-level targets, telemetry schema, and any new family-facing entry point or contract field require approval. The open questions in requirements block affected future tasks.
