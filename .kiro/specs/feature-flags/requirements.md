# Feature Flags — Requirements

**Kind:** Feature specification

**Derivation:** Design-first, accelerated cadence

**Source:** Product direction in the 2026-09-29 settings-page review

**Status:** Approved for implementation on 2026-09-30

## Outcome

Every future user-facing feature can be shipped on a parallel code path, safely
exposed by deployment configuration or by an opt-in control in the app, and later
graduated by deleting the legacy path, flag, and toggle without leaving permanent
framework code behind.

This specification also reorganizes the Settings page so experimental controls do
not add anxiety or compete with everyday household tasks.

## Terms

- **Legacy path:** the currently released behavior.
- **Feature path:** the replacement or new behavior behind a flag.
- **Deployment mode:** the environment-controlled state: `off`, `opt-in`, or `on`.
- **Member override:** a member's explicit opt-in/out choice, available only in
  `opt-in` mode.
- **Effective state:** the single server-resolved answer consumed by UI and API
  code. `off` resolves false, `on` resolves true, and `opt-in` resolves to the
  member override (default false).
- **Graduation:** promote the feature path, delete the legacy path and override
  data, then delete the flag definition and all flag UI in that order.

## Scope

### In scope

- A typed registry for user-facing feature flags.
- Deployment modes supplied through environment variables.
- Per-family-member, in-app opt-in controls for production feedback.
- One API-owned effective-state snapshot used by both PWA and backend behavior.
- A progressively disclosed **Preview features** section on Settings.
- A mandatory parallel-path and graduation convention for future features.
- Tests, observability, accessibility, rollback, and stale-flag safeguards.

### Non-goals

- Percentage rollouts, multivariate experiments, scheduling, or remote flag vendors.
- Using flags as authorization or as a substitute for database compatibility.
- An administrator console or exposing raw environment variable names to members.
- Retrofitting already released behavior merely to make it flagged.
- Allowing a client-side toggle to activate code disabled by deployment configuration.

## Product decisions

1. The API is the authority for effective state. A UI-only gate is insufficient
   because backend operations must make the same decision.
2. Each deployable flag uses `WFS_FEATURE_<KEY>=off|opt-in|on`; missing or invalid
   values fail closed to `off`, with an operational warning for invalid values.
3. In-app choices are per family member. One cook can preview a workflow without
   surprising everyone sharing the household.
4. Only flags in `opt-in` mode appear in Settings. `off` flags are unavailable;
   `on` flags are normal product behavior and no longer presented as choices.
5. Temporary preview flag keys use `preview-<feature-slug>`, where the feature
   slug is the stable spec-registry slug. Keep the key unchanged through `off`,
   `opt-in`, and `on`; delete it at graduation. Environment variables use
   `WFS_FEATURE_` followed by the uppercase key with hyphens replaced by underscores.
   Display copy is separate and localizable.
6. Flag checks occur at a coarse route, workflow, component, or service boundary.
   They must not be scattered through both implementations.
7. Database changes used by a feature remain backward compatible while either path
   can run. Disabling a flag must never require rolling back data first.

## Requirements

### FF-01 — Registered flags only

When a developer adds a feature flag, the system shall require one registry entry
containing a stable key, owner, friendly name, short member-facing description,
introduced date, and removal/graduation criterion. Unknown keys shall not silently
resolve as enabled.

### FF-02 — Deployment control

At process startup, the API shall resolve every registered flag from its environment
variable. A missing value shall resolve to `off`. An invalid value shall resolve to
`off`, emit a warning that identifies the key but no secret values, and surface in
deployment diagnostics.

### FF-03 — Effective-state contract

For an authenticated family member, the API shall return a snapshot of registered
flags with `key`, `enabled`, `mode`, and, only for `opt-in` flags, member-facing
metadata and the persisted member choice. The API shall use the same resolver for
server-side feature behavior.

### FF-04 — In-app choice

When an `opt-in` flag is available, a member can enable or disable it from Settings.
The control shall optimistically communicate the pending action, but the effective
state changes only after server confirmation. On failure it shall restore the prior
state and show an inline retry message without affecting other flags.

### FF-05 — Safe defaults and transitions

- `off`: effective state is false, regardless of stored overrides.
- `opt-in`: effective state is the stored member choice; absence means false.
- `on`: effective state is true, regardless of stored overrides.
- Moving from `opt-in` to `off` or `on` shall preserve but ignore an override until
  graduation cleanup, so rollback does not destroy feedback state.
- A member identity change shall invalidate and reload the snapshot before the new
  member can use a feature path.

### FF-06 — Parallel code paths

Every flagged feature shall have one named decision boundary that selects a complete
legacy path or feature path. The legacy path remains behaviorally unchanged while
the flag is `off`. Shared domain primitives may be reused, but feature-specific
state and side effects shall not leak into the legacy path.

### FF-07 — Loading and failure behavior

Before the snapshot is known, guarded experiences shall render the legacy path.
If the flag request fails, times out, or returns an unknown key, the PWA and API
shall continue on the legacy path and expose a recoverable diagnostic; they shall
not block supper workflows on a settings dependency.

### FF-08 — Settings information architecture

Settings shall retain a compact header and group cards in this order:

1. **Your household** — family management.
2. **Meal defaults** — Family GOTO.
3. **Needs attention** — failed captures, shown only when failures exist.
4. **Preview features** — collapsed by default and shown only when one or more
   `opt-in` flags are available.
5. Build version — quiet diagnostic text.

Opening **Preview features** shall reveal one plain-language row per available flag,
with a short benefit/expectation, a native switch, and an explicit **Preview** badge.
The section shall explain once that previews may change and can be turned off.

### FF-09 — Accessible, interruption-safe interaction

The disclosure and each switch shall be semantic controls with accessible names,
visible focus, at least a 44-by-44 CSS-pixel target, and programmatically exposed
expanded/checked/disabled state. Labels shall remain understandable without icons.
A saved choice shall require one tap and persist across navigation and sessions.

### FF-10 — Feedback handoff

Each preview row shall offer a compact **Send feedback** action that identifies the
flag and build version in the feedback context without including meal or household
content. Feedback transport itself may reuse an approved existing channel; if none
exists when this task is selected, the link is a separately approved dependency and
must not block the core toggle rollout.

### FF-11 — Observability and privacy

Telemetry may record flag key, deployment mode, effective boolean, build version,
and an opaque member identifier. It shall not log environment values, names, meal
data, or free-form household content. Operational logs shall make configuration
errors and override-write failures diagnosable.

### FF-12 — Graduation and removal

Every flag implementation shall include a removal task before rollout begins. To
graduate a flag, maintainers shall:

1. set the deployment mode to `on` and verify the feature path;
2. replace the decision boundary with the feature path and delete legacy tests/code;
3. remove Settings copy, override persistence, environment configuration, registry
   metadata, and flag-specific tests;
4. rename feature-path symbols to durable product names; and
5. run a repository check proving the key and environment variable no longer occur.

### FF-13 — Security

A member may read and change only their own overrides. Patch requests for an `off`
or `on` flag, an unknown key, or another member shall be rejected. Backend endpoints
shall independently enforce effective state; manipulating browser state shall not
enable a disabled server capability.

## Acceptance scenarios

1. With the environment variable absent, both UI and API execute the legacy path
   and Settings contains no row for the flag.
2. With mode `opt-in` and no override, the legacy path runs and a collapsed Preview
   features section is available.
3. A member enables a preview; after server acknowledgement, navigation and reload
   continue to use the feature path for that member only.
4. An override write fails; the switch returns to its prior state, an inline retry
   message appears, and the current workflow remains usable.
5. Deployment changes from `opt-in` to `off`; all members immediately use the legacy
   path and cannot see or mutate the toggle.
6. Deployment changes from `opt-in` to `on`; all members use the feature path and the
   toggle disappears.
7. Snapshot loading fails; the legacy path remains available without a blocking
   full-page error.
8. After graduation, a repository search finds neither the flag key nor its
   environment variable, and only the promoted implementation remains.

## Naming adoption

The approved target key is `preview-single-page-recipe-view`, with environment
variable `WFS_FEATURE_PREVIEW_SINGLE_PAGE_RECIPE_VIEW`. Existing application code
and deployment configuration still use `single-page-recipe-steps` and
`WFS_FEATURE_SINGLE_PAGE_RECIPE_STEPS`. The examples here describe the target;
Task 8 tracks coordinated migration before claiming runtime adoption.

## Approved proving slice

- **Feature:** `preview-single-page-recipe-view`, specified independently in
  [`../single-page-recipe-view/requirements.md`](../single-page-recipe-view/requirements.md).
- **Member copy:** **Recipe on one page** — “After getting ready, scroll through all
  the cooking steps on one page.”
- **Feedback:** defer FF-10's action to optional Task 5A; do not invent or reuse a
  recipe-content feedback destination.
- **Operational ownership:** the administrator deploying each local or Synology
  installation owns deployment-mode changes. AWS is not an active deployment.
