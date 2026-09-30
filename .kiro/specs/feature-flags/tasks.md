# Feature Flags — Tasks

**Status:** Tasks 1–6 approved for coupled implementation on 2026-09-30.

**Requirements:** [requirements.md](requirements.md)

**Design:** [design.md](design.md)

## Approval gate

The approval gate is resolved in the requirements. The implementation must deliver
the feature-flag capability and the `single-page-recipe-steps` proving feature from
[`../single-page-recipe-view/tasks.md`](../single-page-recipe-view/tasks.md) together.
Task 7 remains a later lifecycle task and is not authorized now.

## Task 1 — Approve the proving slice and contract

**Required; depends on:** approval gate

**Requirements:** FF-01–FF-05, FF-13

- Define the first flag's legacy behavior, feature behavior, owner, environment
  variable, member copy, graduation criterion, and deletion checklist.
- Add typed OpenAPI schemas and `GET /api/feature-flags` plus
  `PATCH /api/feature-flags/{key}` operations, including examples and error shapes.
- Update schema-compliant mock builders before consumer tests.
- Generate the PWA client only through the repository's approved generation flow.

**Meaningful assertions:** required/nullable fields are exact; authenticated member
identity is not accepted from request data; generated client and mocks match OpenAPI.

**Checks:** OpenAPI validation, generated-client drift, mock drift, API/PWA compile.

**Stop if:** ownership or exact behavior of the proving flag is not approved.

## Task 2 — Add member override persistence

**Required; depends on:** Task 1 contract

**Requirements:** FF-04, FF-05, FF-13

- Add the `feature_flag_overrides` schema, EF model/configuration, psqldef migration,
  and repository/service operations described in the design.
- Preserve unrelated `family_settings` behavior.
- Write tests before implementation, including real PostgreSQL integration coverage.

**Meaningful assertions:** two members can hold different values for one key; upsert
is atomic; concurrent writes leave one valid row; deleting a member cascades; stale
keys do not enable anything.

**Checks:** database diff/idempotence checks and focused API test target with the
actual PostgreSQL test fixture.

**Stop if:** the database procedure cannot demonstrate the real schema behavior.

## Task 3 — Implement registry, resolver, and endpoints

**Required; depends on:** Tasks 1–2

**Requirements:** FF-01–FF-05, FF-07, FF-11, FF-13

- Implement startup parsing, immutable registry, member-aware resolver, diagnostics,
  and contracted endpoints.
- Route the proving feature's backend behavior, if any, through the resolver at one
  workflow boundary.
- Document the environment variable in local, Compose, and selected deployment
  configuration with default `off`.

**Meaningful assertions:** full mode/override matrix; invalid config fails closed and
warns; unknown/non-opt-in patches return the contracted status; manipulated clients
cannot enable server behavior.

**Checks:** focused API unit/integration tests, API build, contract reconciliation,
and a live endpoint parity probe against the selected runtime.

**Stop if:** frontend and backend would obtain deployment state from different
authorities.

## Task 4 — Add PWA provider and proving boundary

**Required; depends on:** Task 3 and generated client

**Requirements:** FF-03, FF-05–FF-07

- Add the authenticated-layout provider/store and `useFeatureFlag` hook.
- Split the proving feature into named legacy and feature implementations with one
  boundary.
- Default to the legacy path during loading/failure and invalidate state on identity
  changes.
- Write unit tests before implementation.

**Meaningful assertions:** exactly one path renders; stale identity state never
renders for a newly selected member; failed loading leaves the legacy workflow
usable; no code below the boundary reads the key.

**Checks:** focused Vitest suites, PWA lint/typecheck, and relevant impact tests.

**Stop if:** the selected feature cannot maintain backward-compatible persistence or
side effects while both paths exist.

## Task 5 — Reframe Settings and add Preview features

**Required; depends on:** Task 4 mutation API

**Requirements:** FF-04, FF-08–FF-10

- Introduce household-oriented section labels and consistent peer widths.
- Do not render the empty Failed Captures card; preserve actionable failure states.
- Add the collapsed Preview features disclosure and accessible switch rows.
- Add pending, confirmed, rollback/error, retry, and `409` refresh behavior.
- Add localized copy and stable test IDs without weakening semantic assertions.
- Wire **Send feedback** only if its destination was approved; otherwise record it as
  the optional Task 5A rather than inventing a channel.

**Meaningful assertions:** section absent with zero opt-in flags; disclosure exposes
correct state; one tap persists; errors affect one row; 44px targets and keyboard
operation work; essential text contrast passes; ordinary settings remain above
previews and immediately usable.

**Checks:** focused component tests, accessibility checks, Settings Playwright suite,
and mobile/wide screenshots reviewed against Solar Earth tokens.

**Stop if:** member-facing copy names internal flags or the preview control displaces
routine meal settings from the initial viewport without progressive disclosure.

## Task 5A — Add contextual feedback handoff

**Optional; depends on:** approved feedback destination

**Requirement:** FF-10

- Add a feedback action carrying only flag key and build version context.
- Verify that no household content or environment value is included.

**Checks:** focused component/navigation test and privacy payload assertion.

## Task 6 — Deployment and rollback validation

**Required; depends on:** Tasks 1–5

**Requirements:** FF-02, FF-05, FF-07, FF-11

- Exercise `off`, `opt-in`, and `on` in deployment-equivalent configuration.
- Verify a mode change takes effect after the documented deployment/restart boundary.
- Record operator instructions, owner, rollback command/process, and diagnostics.

**Meaningful assertions:** `off` hides toggle and runs legacy; `opt-in` isolates two
members; `on` hides toggle and runs feature for both; snapshot failure stays usable.

**Checks:** full applicable repository completion gate plus deployment smoke tests
for each mode. Record any live-service/database checks separately from static parity.

## Task 7 — Graduate the proving flag

**Required lifecycle task; select only after criterion approval**

**Requirement:** FF-12

- Set mode `on` and complete the agreed observation period.
- Delete the decision boundary and legacy path, then make the feature path canonical.
- Delete flag copy, registry/config entry, environment plumbing, override rows, and
  obsolete dual-path tests.
- Keep generic feature-flag infrastructure only if another registered flag uses it
  or an approved immediate consumer exists; otherwise propose its removal rather
  than retaining speculative machinery.

**Meaningful assertions:** promoted behavior works without a flag snapshot; no stale
toggle appears; existing member workflows and data remain valid.

**Checks:** full applicable completion gate and repository searches for the exact key
and environment variable, with zero active-code/config hits.

**Stop if:** rollback still depends on the flag or the graduation criterion has not
been explicitly accepted.

## Traceability

| Requirement | Design area | Task(s) |
|---|---|---|
| FF-01 | Registry and resolution | 1, 3 |
| FF-02 | Registry; rollout | 3, 6 |
| FF-03 | Contract; PWA state | 1, 3, 4 |
| FF-04 | Contract; Settings interaction | 2, 3, 5 |
| FF-05 | Resolution; caching | 2–4, 6 |
| FF-06 | PWA decision boundary | 4 |
| FF-07 | Loading and consistency | 3, 4, 6 |
| FF-08 | Settings interaction | 5 |
| FF-09 | Settings interaction | 5 |
| FF-10 | Settings interaction | 5A |
| FF-11 | Security/privacy; rollout | 3, 6 |
| FF-12 | Graduation workflow | 7 |
| FF-13 | Security/privacy | 1–3 |
