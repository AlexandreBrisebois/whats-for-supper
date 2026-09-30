# Feature Flags — Design

**Status:** Approved for implementation on 2026-09-30

**Requirements:** [requirements.md](requirements.md)

## Settings-page review

The current page has a strong, familiar back action and a clear title, but its
content is a flat sequence of visually equal cards. That creates three household
problems:

- **Important and exceptional states look equally urgent.** An empty Failed
  Captures card still consumes a large block, so a parent scans a success message
  before reaching anything added later.
- **The hierarchy is implementation-led.** “Manage Family,” “Family GOTO,” and
  “Failed Captures” do not form obvious settings groups. Future toggles appended as
  more cards would turn the page into a long control warehouse.
- **Card geometry is inconsistent.** Family GOTO alone uses `max-w-sm`; the sibling
  cards use full width. On wider layouts it will visually detach from the page even
  though all three are peers.

The smallest useful correction is not a full redesign: retain the header and Solar
Earth surfaces, give sections household-oriented labels, hide the empty recovery
card, make peer cards share a width, and place experiments behind one collapsed
Preview features disclosure. This keeps routine supper controls reachable and
prevents previews from nagging members who only came to fix tonight's meal.

## Recommended architecture

### Why not the two simpler alternatives?

1. **Read `NEXT_PUBLIC_*` flags directly in components.** This is easy initially,
   but values are baked into the frontend build, backend behavior can disagree, and
   scattered checks make graduation risky.
2. **Store arbitrary booleans in the existing opaque `/api/settings/{key}` API.**
   This avoids a new endpoint, but the current settings store is keyed globally and
   has no member ownership in its model. It also cannot constrain registered keys,
   modes, mutable state, or member access.

Use an API-owned registry plus a dedicated member override table and contract. It is
slightly more work for the first flag, but creates one auditable decision and a
clean deletion path.

## Integration map

```text
deployment environment
  WFS_FEATURE_<KEY>=off|opt-in|on
          |
          v
API FeatureFlagRegistry + startup validation
          |
          +---- FeatureFlagResolver ---- backend workflow boundary
          |              |
          |              +---- feature_flag_overrides (member_id, flag_key)
          v
GET /api/feature-flags  <----> PATCH /api/feature-flags/{key}
          |
          v
generated Kiota client -> FeatureFlagProvider/store
          |                         |
          |                         +---- Settings / Preview features
          v
single <FeatureBoundary> per feature
    legacy component | feature component
```

The existing generic `SettingsController`, `SettingsService`, and `family_settings`
table remain untouched; they are not suitable ownership for member-specific flags.

## Registry and resolution

Add a backend registry whose code entries are immutable deployment metadata:

```csharp
new FeatureFlagDefinition(
    Key: "single-page-recipe-steps",
    EnvironmentVariable: "WFS_FEATURE_SINGLE_PAGE_RECIPE_STEPS",
    Owner: "cooking-experience",
    DisplayNameKey: "featureFlags.singlePageRecipeSteps.name",
    DescriptionKey: "featureFlags.singlePageRecipeSteps.description",
    IntroducedOn: new DateOnly(2026, 9, 30),
    GraduationCriterion: "responsive and accessibility acceptance passes and the owner approves graduation after the opt-in observation period");
```

The API parses all registered modes once during startup into an immutable snapshot.
Request resolution combines that snapshot with the authenticated member's override.
Feature services receive the resolver through dependency injection rather than
reading environment variables themselves.

Avoid a generalized expression engine, targeting rules, or dependencies between
flags. If two paths cannot be selected independently, they are one feature flag.

## Contract proposal

OpenAPI remains authoritative. Add explicit schemas rather than extending the
opaque `SettingsDto`.

### `GET /api/feature-flags`

Authenticated by the existing family-member identity. Suggested response:

```json
{
  "data": [
    {
      "key": "single-page-recipe-steps",
      "mode": "opt-in",
      "enabled": false,
      "memberEnabled": false,
      "displayName": "Recipe on one page",
      "description": "After getting ready, scroll through all the cooking steps on one page."
    }
  ]
}
```

Only `opt-in` records need member-facing copy. Returning `off` and `on` records is
useful to app code, but their display metadata and member choice should be omitted.
Use one snapshot request rather than a request per flag.

### `PATCH /api/feature-flags/{key}`

Request `{ "enabled": true }`. The authenticated member is taken from server
identity, never from the body. Return the updated effective record. Use:

- `200` for a persisted choice;
- `400` for malformed input;
- `404` for an unknown/unregistered key; and
- `409` when the flag exists but is not currently `opt-in`.

The contract task must settle nullable/required fields precisely before generation.

## Persistence

Add `feature_flag_overrides` with:

- `member_id uuid NOT NULL` referencing `family_members(id)` with cascade delete;
- `flag_key text NOT NULL`;
- `enabled boolean NOT NULL`;
- `updated_at timestamptz NOT NULL`; and
- primary key `(member_id, flag_key)`.

Do not add one column per feature and do not persist deployment modes in the
database. Unknown stale keys can remain harmlessly ignored until the flag's
graduation migration deletes them. Repository database procedure and real
PostgreSQL behavior must be followed when this design is selected for implementation.

## PWA state and decision boundary

Create a small `FeatureFlagProvider` in the authenticated app layout. It loads a
single snapshot for the selected member, caches it only for that identity, and
exposes `useFeatureFlag(key): boolean` plus mutation state for Settings. Defaults are
false until resolved. Selecting a different member clears the prior snapshot before
fetching the next.

Each feature keeps its alternatives adjacent at a coarse boundary:

```tsx
function WeeklyPlannerEntry() {
  const enabled = useFeatureFlag('faster-weekly-planning');
  return enabled ? <FasterWeeklyPlanner /> : <CurrentWeeklyPlanner />;
}
```

Prefer named components/modules over inline ternaries containing substantial JSX.
The new path may import stable shared primitives, but neither implementation imports
the other. Flag keys must not occur below the boundary. This makes promotion a
small diff: delete the hook and legacy import, render the new component directly,
then rename it.

For backend commands, resolve the same key at the controller/service workflow
boundary and route to complete legacy/new handlers. Do not trust a client-supplied
effective state.

## Settings interaction

### Page structure

Retain the current page header/back button. Replace the undifferentiated stack with
consistent-width groups:

```text
Settings
Family & app preferences

[ Your household                         ]
[ family member controls                 ]

[ Meal defaults                          ]
[ Family GOTO                            ]

[ Needs attention ]  (only with failures)

[ Preview features                  2  > ]  collapsed
  When expanded:
  Try upcoming ideas. They may change, and you can turn them off.
  [ Preview ] Faster weekly planning   [switch]
              Shape next week in fewer steps.
              Send feedback

Build 0.1.0-beta.1
```

Do not call the section “Feature Flags” in member-facing UI; that describes the
implementation, not the benefit. Keep it after daily settings, collapsed by
default, and entirely absent when there are no `opt-in` records.

### Interaction states

- Disclosure uses a button with `aria-expanded` and `aria-controls`.
- A row label toggles the associated semantic switch; the feedback link is separate.
- While saving, disable only that row and show a compact spinner/status.
- On success, announce “Preview enabled” or “Preview turned off” in a polite live
  region. Avoid a toast for the normal one-tap path.
- On error, restore the confirmed value and place **Couldn't save. Try again.** under
  that row with a retry action.
- If deployment mode changes while Settings is open, a `409` triggers snapshot
  refresh; the unavailable row disappears without claiming the change succeeded.

Use existing cream, terracotta, ochre, sage, Outfit, and Inter tokens. Ochre is a
good Preview badge accent; terracotta remains the action/focus color. Verify actual
contrast rather than relying on opacity-heavy `text-charcoal/40` for essential copy.

## Loading, caching, and consistency

- Load once at authenticated app-layout entry and again on identity change.
- Revalidate after a successful mutation and on window focus, with request
  deduplication to avoid flicker.
- Do not persist effective flags in `localStorage`; a deployment kill switch must
  take effect on refresh/focus and old identities must not leak.
- The API remains authoritative if the PWA and API deployments briefly differ.
- A snapshot error is non-blocking: retain false defaults, record a diagnostic, and
  offer retry only inside Preview features when the user visits Settings.

## Rollout and graduation workflow

Every flagged feature pull request includes:

1. registry definition and environment documentation;
2. legacy-off regression tests and feature-on acceptance tests;
3. opt-in persistence/identity tests when the in-app toggle is used;
4. production enable/disable instructions;
5. a named owner and measurable graduation criterion; and
6. a pre-written removal task listing the decision boundary, legacy module, flag
   key, environment variable, override cleanup, and obsolete tests.

Recommended rollout: `off` in production -> `opt-in` for feedback -> `on` for broad
validation -> code graduation. Emergency rollback changes `on` to `off`; compatible
data and the preserved legacy path make that safe until graduation.

After graduation, rollback is a normal code rollback, not a permanent flag. The
flag framework remains, but no per-feature flag artifact remains.

## Security and privacy

- Resolve member identity with the existing authenticated cookie mechanisms.
- Never accept a member ID in the patch body or query string.
- Treat flags as routing, not authorization. Protected endpoints retain normal
  authorization and also check server-side effective state where applicable.
- Do not put secrets or household content in registry metadata or telemetry.
- Rate-limit writes using the API's established policy if abuse becomes observable;
  no special limiter is required for the first proving flag.

## Verification strategy

### API

- Parser matrix for missing, valid, mixed-case/whitespace policy, and invalid modes.
- Resolver matrix for all three modes with absent/true/false overrides.
- Integration tests against real PostgreSQL for per-member isolation, upsert,
  concurrency, cascade deletion, and ignored stale keys.
- Endpoint tests for authentication and `200/400/404/409` responses.
- Feature service tests proving server behavior follows the resolver.

### PWA

- Provider tests for false-before-load, successful snapshot, failure fallback,
  member switch invalidation, mutation reconciliation, and `409` refresh.
- Boundary tests proving exactly one implementation renders for false and true.
- Settings component tests for disclosure semantics, available-row filtering,
  pending state, rollback/error, live announcement, and touch-target classes.
- Playwright coverage for opt in -> feature path -> navigation/reload persistence,
  per-member isolation, and deployment-mode fixtures.

### Graduation

- Tests are rewritten to assert the promoted behavior without a flag fixture.
- A case-sensitive repository search for both the key and environment variable has
  no results outside historical records that are explicitly excluded.

## Risks

- **Flag debt:** metadata alone will not remove flags. Mitigate with required removal
  tasks and an audit that reports flags beyond their criterion/date.
- **Frontend/backend disagreement:** mitigate with API-owned resolution and no direct
  component environment reads.
- **Identity leakage:** mitigate by keying snapshots to member identity and clearing
  before reload.
- **Combinatorial tests:** prohibit flag dependencies and test each boundary in both
  states rather than every global combination.
- **Settings overload:** show only opt-in previews behind one disclosure and remove
  the section when empty.

## Requirement coverage

| Requirement | Design sections |
|---|---|
| FF-01 | Registry and resolution |
| FF-02 | Registry and resolution; Rollout and graduation workflow |
| FF-03 | Contract proposal; PWA state and decision boundary |
| FF-04 | Contract proposal; Persistence; Settings interaction |
| FF-05 | Registry and resolution; Loading, caching, and consistency |
| FF-06 | PWA state and decision boundary |
| FF-07 | Loading, caching, and consistency |
| FF-08 | Settings-page review; Settings interaction |
| FF-09 | Settings interaction |
| FF-10 | Settings interaction; Security and privacy |
| FF-11 | Security and privacy; Verification strategy |
| FF-12 | Rollout and graduation workflow; Graduation verification |
| FF-13 | Security and privacy; API verification |
