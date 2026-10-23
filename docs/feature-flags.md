# Feature flags: development and lifecycle

The feature-flag system is a reusable product capability. Keep it when individual
previews graduate or are abandoned. Retire a particular flag, not the registry,
resolution service, member-override storage, API, client store or Settings framework.

This guide describes the implementation inspected at
[1d1e786](https://github.com/AlexandreBrisebois/whats-for-supper/commit/1d1e7868632ba093254ef59c56d14c2e88216ea0).
The lifecycle checklists below guide future changes; they do not claim that any
flag has graduated, change deployment defaults, or authorize a rollout.

Canonical behavior belongs in [member preferences](../openspec/specs/member-preferences/spec.md)
and each feature's owning capability. API contracts belong in
[OpenAPI](../specs/openapi.yaml). Follow [AGENT.md](../AGENT.md) and the
[contract/testing policy](../.agents/core/contract-testing.md) for changes.

## Current resolution model

The [registry and service](../api/src/RecipeApi/Services/FeatureFlagService.cs)
own definitions and effective enablement. Every definition records a stable key,
environment-variable name, owner, display name, description, introduction date
and graduation criterion.

| Deployment mode | Effective enabled | Member choice |
| --- | --- | --- |
| `off` | Always false | Retained but ignored; not editable |
| `opt-in` | Saved boolean, or false if absent | Editable in Settings |
| `on` | Always true | Retained but ignored; not editable |

Mode strings are trimmed and case-insensitive. Missing, blank or invalid values
resolve to `off`; invalid values produce a warning. The registry is registered as
a singleton in `api/src/RecipeApi/Program.cs` and reads configuration when
constructed. Do not assume live reload: restart/recreate the API with the changed
environment, then refresh the member snapshot.

Overrides are persisted per `(member_id, flag_key)` in
[feature_flag_overrides](../api/database/schema.sql), with an enabled boolean and
update timestamp. The [model](../api/src/RecipeApi/Models/FeatureFlagOverride.cs)
and [EF mapping](../api/src/RecipeApi/Data/RecipeDbContext.cs) match that ownership;
member deletion cascades to their overrides. Switching deployment modes does not
erase choices. Returning to `opt-in` restores the retained choice. Unknown stored
keys are not exposed by the registry-driven snapshot.

### API and UI behavior

- `GET /api/feature-flags` returns registered effective flags in `data.items`
  for the bound existing member. Missing member context returns 401.
- `PATCH /api/feature-flags/{key}`, with `{ "enabled": true }` or false,
  upserts that member's choice only for registered `opt-in` flags. It returns
  the confirmed flag in `data`. Unknown keys return 404; fixed-mode keys return
  409 without changing the saved choice. A nonexistent member targeting an
  opt-in flag returns 404; missing context returns 401.
- Opt-in snapshots include `memberEnabled`, display name and description.
  Fixed-mode snapshots supply key, effective enabled and mode, without an
  editable choice.
- The [controller](../api/src/RecipeApi/Controllers/FeatureFlagsController.cs)
  also returns 404 for a nonexistent member on GET. That response is not currently
  declared on the OpenAPI GET operation. This is an existing discrepancy, not a
  new contract guarantee or a repair made by this guide.
- The [API adapter](../pwa/src/lib/api/featureFlags.ts) uses generated Kiota
  operations. The [provider](../pwa/src/components/featureFlags/FeatureFlagProvider.tsx)
  loads on member changes and refreshes on window focus.
- The [store](../pwa/src/store/featureFlagStore.ts) clears flags while loading,
  rejects stale results after member-generation changes, and waits for server
  confirmation before changing a choice. A 409 triggers a refresh. Missing flags,
  initial load and load failures resolve false through `useFeatureFlag(key)`.
  Do not claim universal newest-request-wins ordering for overlapping loads of
  the same member.
- [Settings](../pwa/src/components/profile/PreviewFeaturesSection.tsx) lists only
  `opt-in` flags. With none and no load error, the section is hidden, not removed
  from the system. It supports pending/error feedback, retry, translated text
  and server metadata fallback.

Use effective `enabled` for behavior. `memberEnabled` is the editable choice,
not the final decision. Flags control rollout, not authentication or authorization;
keep existing identity, permission and input-validation requirements.

## Current flags and deployment surfaces

Both registry defaults are currently `off`. Actual deployments may override
them; checked-in defaults do not establish the state of a running installation.

| Key | API environment variable | Owner / consumers |
| --- | --- | --- |
| `single-page-recipe-steps` | `WFS_FEATURE_SINGLE_PAGE_RECIPE_STEPS` | cooking-experience; `CooksMode.tsx` |
| `preview-pdf-recipe-import` | `WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT` | recipe-capture; `MinimalCapture.tsx`, `PdfCapturePanel.tsx`, `PdfCaptureController.cs`; PWA manifest also reads the deployment mode |

For an opt-in rollout, supply the flag's variable as `opt-in` to the API process,
restart/recreate it, select an established member and enable the preview under
Settings > Preview features. Confirm the effective GET response and consumer
behavior. Use `off` to suppress it without deleting member choices, or `on`
for everyone while retaining the gate.

Inspect the deployment actually used. A dotenv entry alone does not pass a
variable into a container:

- [apps.yml](../docker/compose/apps.yml) and
  [production.yml](../docker/compose/production.yml) pass the cooking variable
  to the API with an `off` fallback; they do not currently pass the PDF variable.
- The [public Compose template](../release-template/synology/compose.yaml) passes
  both remaining variables to the API and the PDF variable to the PWA, with `off` fallbacks.
  Its [.env.example](../release-template/synology/.env.example) lists cooking and PDF.
- [smoke.env](../docker/compose/smoke.env) explicitly supplies cooking as `off`.
  Keep deployment examples, smoke fixtures and operator instructions
  aligned when a future change touches these surfaces.

PDF has two distinct checks. The
[manifest route](../pwa/src/app/manifest.json/route.ts) calls
[pdfManifest](../pwa/src/lib/pdfManifest.ts) using the PWA server environment.
Both `on` and `opt-in` advertise multipart PDF sharing; other values use the base
link-sharing target. Advertisement does not establish a member's eligibility.
The [PDF API](../api/src/RecipeApi/Controllers/PdfCaptureController.cs) independently
checks established-member identity and effective PDF enablement before reading
the form. Keep API/PWA configuration and installed-app behavior in scope; do not
replace server checks with a client-only gate.

## Add a future flag

1. **Define the bounded experiment.** Use the repository's selected OpenSpec
   workflow to describe observable enabled/disabled behavior, owner, default,
   eligibility, failures, acceptance checks, observation period and retirement
   decision. Keep capability behavior with its owner and generic resolution in
   member preferences. Decide what remains valid when the flag turns off.
2. **Reuse the registry.** Add a unique stable key and environment variable to
   `FeatureFlagRegistry`, using the existing `Create` parser and a definition
   with owner, introduction date and concrete graduation criterion. Add it to
   the registry dictionary. Do not create a parallel flag service or overload an
   unrelated retired key. Default off unless an approved specification says
   otherwise.
3. **Wire deployment deliberately.** Add pass-through and examples for each
   supported runtime that needs the value. Browser consumers normally use the
   API snapshot, not build-time public environment variables. If server-rendered
   discovery/manifest behavior needs a separate PWA input, specify its relation
   to API eligibility and test mismatched configuration.
4. **Integrate a thin vertical slice.** Read `useFeatureFlag('your-stable-key')`
   in client behavior, or the existing store when loading/member state matters.
   Preserve a safe disabled path. If the preview exposes a server operation,
   enforce the same effective decision there; hiding UI is insufficient.
   Handle flag/member changes during an in-progress interaction explicitly.
5. **Expose preview choices through existing Settings.** Registered opt-in entries
   already flow through the generic snapshot and list. Add English/French
   `previewFeatures.flags.<key>.name` and `.description` catalog entries and
   meaningful server fallback metadata. Do not add a second member-choice store.
6. **Keep contracts and persistence honest.** A new string key using the existing
   DTO need not imply a new endpoint or per-flag database column. Review the
   actual change. If API shape/status/behavior or persistence changes, update the
   approved OpenAPI/schema first, regenerate with `task gen:client`, and update
   adapters, consumers and method-sensitive mocks. Never hand-edit generated SDK
   files.
7. **Prove both branches before wider rollout.** Follow tests-first red/green
   increments and the acceptance matrix below. Record actual commands, outcomes,
   configuration and device limits. Move from off to opt-in/on only within the
   approved rollout scope; mode changes alone are not graduation evidence.

## Graduate a feature versus abandon it

These are different product decisions. Record the selected outcome and acceptance
evidence in the issue/OpenSpec change before implementing cleanup.

### Graduate: keep the feature, retire its rollout gate

After the owner accepts the recorded graduation criteria, make the selected
production experience independent of the old flag. Setting its deployment mode
to `on` can be an interim rollout step, but is not complete retirement: the key,
fallback branch, deployment variable and override records still exist.

Keep legitimate long-term user preferences separate from preview eligibility.
For example, [Cook Mode #303](https://github.com/AlexandreBrisebois/whats-for-supper/issues/303)
plans all-steps as the default with a saved member view preference. It is not
equivalent to deleting the focused view or keeping a preview switch forever.
Define preference defaults and treatment of existing users/overrides explicitly;
do not silently reinterpret an old preview boolean as a new durable preference.

[PDF #304](https://github.com/AlexandreBrisebois/whats-for-supper/issues/304)
tracks always-on PDF import. Planner touch hold-to-move has graduated: it is now
unconditional, its rollout configuration and stored choices are retired, and
operators need no Planner preview setup. Feature-specific validation, identity
checks and failure handling remain even when preview checks are retired.

### Abandon: remove the experiment, retain supported behavior

Keep the approved non-preview experience and remove only the abandoned feature's
entry points, implementation, dependencies/assets and gate-specific machinery.
Decide how to handle data already produced, queued/in-flight work, saved links
and installed clients. Do not delete user content or shared infrastructure merely
because a preview is abandoned. State data retention/migration and compatibility
decisions before destructive cleanup.

### Per-flag cleanup checklist for either outcome

- **Behavior:** replace each client/server conditional with the approved surviving
  behavior; remove unreachable alternatives and flag-specific errors/copy.
  Graduation retains the feature; abandonment removes it. Preserve independent
  security, member, validation and recovery checks.
- **Registration/configuration:** remove only this definition, dictionary entry,
  variable reads, Compose pass-through, dotenv examples, fixtures and operator
  instructions. Search for both the stable key and environment-variable name,
  including scripts and install/share surfaces. Document obsolete environment
  variables for operators and the restart/upgrade sequence.
- **Settings/locales:** remove this preview's labels and assumptions. The generic
  Settings section must still work with zero, one or several remaining previews.
  If the feature becomes a permanent preference, give it an approved preference
  contract/UI and migration rather than leaving a hidden preview control.
- **Overrides:** choose a scoped data migration or explicitly documented deferred
  cleanup for this key only. Unregistered stored keys currently do not appear in
  snapshots, but removing a definition does not delete those rows. Check backups,
  rollback needs and new-preference migration before cleanup. Keep the
  `feature_flag_overrides` table, model and service for future flags.
- **API/client compatibility:** inventory old PWA bundles, installed manifests,
  cached snapshots and mixed-version API/PWA deployments. Today an unknown
  PATCH key returns 404 and a missing client flag resolves false; simply deleting
  a registry entry can send an old client down its disabled path. Specify
  sequencing, refresh/update guidance and any bounded compatibility period before
  removal. Do not promise automatic cache migration or universal rollback.
- **Tests/mocks:** replace retired-flag branch assertions with permanent-feature
  or supported-fallback assertions, remove only obsolete fixtures, and retain
  shared resolver/API/store/Settings coverage using remaining or purpose-built
  test definitions. Cover stale override records and old-client behavior chosen
  by the compatibility plan.
- **Specifications/docs:** update affected owning capability requirements,
  member-preferences flag-specific requirements, API descriptions/examples and
  generated clients where contracts change. Preserve historical archives as
  history; reconcile current developer/operator/user guidance and issue status.
- **Scope:** do not remove the shared registry, service, API/controller/DTOs,
  provider/store/adapter, persistence or Settings framework just because no
  currently shipped feature needs a gate.

For the current keys, search these additional seams:
cooking's `CooksMode`, instruction-view tests and cooking/member-preferences
specs; PDF's capture components/controller, manifest route/helper, share/install
tests, renderer/deployment qualification and recipe-capture/app-installation
specs; planner's `PlannerDragHandle`, cancellation/scroll/reordering tests and
meal-planning/member-preferences specs. This is navigation, not permission to
implement any promotion.

## Acceptance and verification

For future behavior changes, name checks in the selected OpenSpec tasks and
distinguish observed results from expected coverage:

- Registry: missing/blank/invalid, trimmed/case-insensitive off/opt-in/on; effective
  resolution for absent/false/true overrides; fixed modes ignore but retain
  choices; unknown keys; owner/graduation metadata.
- API/persistence: member isolation and upsert, snapshot shape, registered versus
  unknown keys, fixed-mode rejection, missing/nonexistent members and the real
  affected database boundary. In-memory tests are not PostgreSQL proof.
- Client/Settings: false while unavailable, member-switch stale-response
  protection, refresh, server-confirmed save, pending/error/retry and 409 refresh,
  zero-preview rendering, accessibility and both supported languages.
- Feature: disabled and enabled paths, direct API access where applicable,
  in-progress changes and rollback. For retirement, test the permanent behavior
  without an old override/config value and the agreed upgrade compatibility.
  PDF also needs manifest/API eligibility and device/renderer acceptance;
  planner needs physical touch scroll versus deliberate hold/reorder acceptance;
  cooking needs responsive and accessibility acceptance.
- Keep `pwa/e2e/mock-api.ts` and affected Settings/cooking/planner/PDF scenarios
  aligned with the real contract and state transitions. Mocked browser acceptance
  does not establish backend integration or physical-device qualification.

Existing starting points include
[FeatureFlagServiceTests](../api/src/RecipeApi.Tests/Services/FeatureFlagServiceTests.cs),
[store tests](../pwa/src/store/featureFlagStore.test.ts),
[Settings tests](../pwa/src/components/profile/PreviewFeaturesSection.test.tsx)
and [PDF integration tests](../api/src/RecipeApi.Tests/Integration/PdfCaptureIntegrationTests.cs).
They are starting points, not a claim that every matrix item is already covered.

Use the [execution harness](../.agents/core/execution-harness.md):
preview selection with `task verify:plan -- <complete-reviewed-paths>`, run
focused tests during implementation, prepare when applicable, review the complete
diff, then `task verify -- <complete-reviewed-paths>`. Documentation-only changes
need no preparation or behavioral red/green cycle; validate changed links,
whitespace and meaning. Run required OpenSpec validation when specs/change
artifacts are selected. Report unavailable checks as blocked/not-run, never passed.
