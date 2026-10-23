# Design

## Context and Existing Ownership

The proposal and deltas define the approved behavior. Current source inspection shows:

- `GroceryRecomputeService` owns recipe-derived `weekly_plans.grocery_items` and may replace that JSON wholesale after plan changes. Extras therefore cannot safely be appended to that projection.
- `WeeklyPlan.GroceryState` and the existing item PATCH use `displayName` as recipe-derived check identity. That cannot distinguish repeated extras or an extra whose name matches a recipe line.
- `ScheduleDays` already returns the selected absolute `weekStartDate`, deployment calendar context, recipe grocery lines, and checks. This is the natural read seam for extras without adding a second shopping screen.
- `GroceryList` already owns aisle grouping, check affordances, the tag picker, pending/error feedback, wide embedded and narrow full-screen presentation, and the Solar Earth grocery surface.
- `useScheduleStream` and `SseEventPublisher` own in-process household freshness. Existing SSE delivery is nondurable, so schedule reads and reconnect snapshots remain recovery authority.
- `Workflows/dreaming.yaml` and the scheduled-maintenance processors own daily background reconciliation and its reported outcome. Weekly extra rollover fits that existing maintenance boundary.
- `api/database/schema.sql`, `api/database/compatibility.sql`, `RecipeDbContext`, and the model layer jointly own schema compatibility. `ManagementService` owns ordinary export/merge restore; `RecoverySnapshotService.Tables` owns independent exact table membership.

The authoritative new state is a weekly extra occurrence, not a recipe grocery line and not a per-person task. Deployment-calendar absolute Mondays define current, past, and future; relative offsets are transport inputs only.

## Decisions and Tradeoffs

### Store immutable weekly occurrences in a separate table

Add `grocery_extra_occurrences` with UUID occurrence identity, UUID lineage identity, nullable predecessor identity, `week_start_date`, snapshotted `name`, `normalized_key`, `grocery_section`, `checked`, nullable `removed_at`, integer `version`, and timestamps. Enforce one occurrence per lineage/week and at most one successor per predecessor. The initial occurrence starts a lineage; every carried occurrence points to the prior week occurrence.

This preserves “what was on the list and was it bought?” without exposing recipe recomputation to manual state. A single mutable extra row plus an event log was rejected: reconstructing every week and validating edits would be more complex than the bounded weekly snapshot model.

Deletion is a tombstone on the current occurrence, not a physical delete. The row is omitted from grocery reads but remains a terminal lineage fact so an earlier unchecked snapshot cannot be carried again. Exact recovery and ordinary backup retain tombstones.

### Keep extras separate in the API read model

Extend `ScheduleDays` with `groceryExtras: GroceryExtraDto[]` rather than overloading `GroceryLineItemDto` or `groceryState`. The DTO carries occurrence identity, name, normalized key, section, checked state, version, week Monday, source `extra`, and `readOnly`. Existing `groceryItems` and `groceryState` remain recipe-owned and backward compatible.

The PWA combines the two collections only for aisle presentation. Recipe rows continue name-keyed checks and normalized-key category correction. Extra rows use occurrence identity for checks and per-occurrence category mutation. Same-name rows remain separate.

### Separate occurrence ownership from the shopping view

The server captures authoritative deployment-calendar context at each mutation. It accepts creation only for `calendar.currentWeekStartDate`. It accepts edit/check/category/delete only for an occurrence owned by that Monday, including when the person is viewing the immediately following week. The client shows the bottom composer only when loaded `weekStartDate` equals the current absolute Monday. This remains correct with explicit reference Mondays and late responses.

Past extra occurrences are rendered as history with a static checked/unchecked indicator and no mutation controls. The immediately following week combines that week's recipe groceries with the current week's still-unchecked extras so Saturday shopping can cover next week's suppers without moving those extras early. Those projected rows keep their current occurrence identity and mutation controls; checking one records it as bought in the current-week snapshot and removes it from the next-week projection. The UI adds no second week label: the ordinary accent-colored `Extra` source text is sufficient on the small screen. Weeks beyond the immediately following week contain no projected extras and no add composer. Recipe-derived rows retain their existing past-week behavior.

### Reconcile rollover through Dreaming with a read repair

The Dreaming workflow invokes one rollover service during its first run that observes a new deployment-calendar Monday. For each lineage whose latest occurrence is earlier than current Monday, the service inserts one snapshot for every elapsed Monday through current, copying the immediately preceding snapshot's name, normalized key, and section. A checked or removed occurrence terminates the lineage. The workflow reports the rollover outcome and does not claim it completed when the task failed.

The same idempotent service runs as a repair before returning the deployment current week's schedule. This closes the gap when Dreaming is late or failed without making ordinary browsing the primary scheduler. The operation locks affected lineage rows and uses database uniqueness constraints, so Dreaming and concurrent repair reads converge on one successor per lineage/week. Historical, immediately-next-week, and farther-future reads do not materialize occurrences. An immediately-next-week read only projects eligible current occurrences and does not create a weekly plan or future snapshot.

### Make create idempotent and updates versioned

The client generates a UUID creation identity and includes it with the name. Repeating that same accepted request returns the same initial occurrence; a new UUID intentionally creates another same-name extra. This preserves user-approved duplicates without making a lost POST response duplicate work.

Check, rename, category, and delete requests carry occurrence ID, absolute week, and expected version. The server updates only a nonremoved current occurrence at that version and increments version on success. A stale request returns 409 with authoritative occurrence state or an absent marker. Blank names and unsupported sections return 400 without mutation. Missing rows return 404 only when authoritative absence is known.

One PATCH operation can carry exactly one of `name`, `checked`, or `grocerySection`; keeping mutations single-purpose makes pending state, conflict handling, OpenAPI examples, and test assertions explicit. DELETE carries expected version. Rename recomputes `normalized_key` for ordering/default diagnostics but deliberately preserves the current category. Extra recategorization never writes `ingredient_categories`.

### Reuse category selection without changing global rules

Initial add normalizes the name with the existing ingredient normalizer, then uses the existing stored-category/aisle fallback to select one supported section. The member enters no category during creation. The existing tag UI is reused, but its extra-row request updates only that occurrence. Carry-forward copies the latest current category.

### Query household extra history without turning it into a catalog

Add an authenticated household-scoped suggestion operation accepting a trimmed query of at least two characters and returning at most three name-only suggestions. The server groups historical extra occurrences by normalized key, uses each group's most recent occurrence for display spelling and removal state, drops removed candidates and normalized names that are currently outstanding, then sorts prefix matches before substring matches and most-recent use within each tier. Recipe-derived groceries do not participate in either the candidate source or suppression rule.

The PWA debounces input by approximately 200 ms, identifies each request by its normalized query and composer generation, and applies a response only while that query remains current in the focused current-week composer. Lookup cancellation is an optimization; generation checks are the correctness guard. A lookup failure produces no blocking error because free-text add remains authoritative. Suggestion queries and logs must not expose household-entered names beyond the authenticated response; diagnostics record only timing, result count, and outcome.

Selecting a suggestion copies only its display name into the existing composer and keeps focus there. It does not create an occurrence, reuse a historical identity or category, or bypass the normal idempotent create request. This extra confirmation prevents accidental duplicates while still allowing a deliberate duplicate to be typed and added.

### Publish a dedicated extras event

Add `grocery_extras_updated` containing absolute Monday and the authoritative visible extra collection for that week. Publish after committed extra mutation or successful carry-forward materialization, passing the initiating connection exclusion when available. A publication failure does not roll back saved state or turn a committed mutation into a client-visible failure.

A dedicated event avoids changing the established `grocery_updated` check-map contract. Schedule reads and the `connected` snapshot also include extras, so missed events recover without durable SSE replay.

## First Observable Slice

The tracer bullet is: on an empty current week, enter `Coffee` in the bottom composer and observe one persisted unchecked Coffee row marked `Extra` after reload.

This slice crosses the real seams in order:

1. approve the OpenAPI create, suggestion, and `ScheduleDays.groceryExtras` contracts;
2. add clean-install and compatibility DDL, EF mapping, constraints, and the current-week create/read plus household-history suggestion services;
3. add API integration and PostgreSQL tests proving persistence, idempotent replay, empty-plan support, current-week rejection, deterministic suggestion ranking, and suppression rules;
4. regenerate the Kiota client and implement matching stateful mock behavior;
5. add PWA store/API mapping and the sticky bottom composer with its upward-opening accessible suggestion tray in `GroceryList`;
6. exercise add, suggestions, reload, empty state, accessible focus, stale lookup, and failure in component and Playwright tests.

Later slices add per-item check, inline rename/delete, tag recategorization, immediately-next-week shopping, Dreaming rollover with read repair, weekly history, two-client events, and backup/recovery only after this path works.

## State, Concurrency and Recovery

An occurrence is visible and either unchecked or checked, or it is removed. Only a visible unchecked current occurrence can produce a successor. Past occurrences never transition through household UI.

The key invariants are:

- for each lineage and Monday there is at most one occurrence;
- a successor has exactly one earlier predecessor in the same lineage;
- a checked or removed occurrence has no successor;
- every materialized predecessor remains unchanged when a successor is added or later changed;
- meal recomputation cannot add, alter, or remove extra occurrences;
- two same-name extras remain independent under every mutation.

These invariants suit generated sequence/property tests over add, rollover, check/uncheck, rename, recategorize, delete, and repeated reconciliation, backed by concrete PostgreSQL integration and browser scenarios. Property tests supplement rather than replace real database and UI acceptance.

The client tracks pending extra operations by occurrence ID or creation UUID plus absolute Monday. Optimistic check and delete are allowed; rename and category keep authoritative display until success to avoid inventing saved history. A failed check reverts. A failed delete restores the row in its prior aisle. A lost response triggers an authoritative schedule read before retry; create can additionally replay safely with the same UUID. Suggestion state is transient and keyed by the exact normalized query plus composer generation; it never mutates grocery state or replaces newer input.

Incoming responses, schedule snapshots, and SSE events carry the occurrence Monday. The client applies them when that occurrence belongs to the loaded week or is an eligible current-week projection in the immediately following week. Per-occurrence updates apply only at an equal or higher version and cannot overwrite a pending local mutation. A 409 or uncertain outcome clears no history: the client reconciles the returned occurrence or rereads the selected shopping view, then exposes retry only from the authoritative state.

## Persistence and Side Effects

Each extra mutation and its version increment commit in one database transaction. Dreaming rollover and current-week read repair call the same service; each invocation inserts all missing weekly successors for the selected lineages in one transaction. Any constraint or validation failure leaves that reconciliation unapplied, and a later Dreaming run or current-week read may retry. Responses are built from committed rows.

SSE publication occurs after commit. The mutation's success response does not promise event delivery, browser receipt, or consumer application. If publication fails, reload and reconnect remain recovery paths. Carry-forward publishes only when it inserted occurrences, avoiding a broadcast on every read.

Ordinary export writes a versioned `grocery-extras.json`; merge restore validates complete records and lineage relationships before upserting by occurrence identity. Missing legacy artifacts preserve destination extras. Exact recovery adds `grocery_extra_occurrences` to the authoritative table inventory, schema fingerprint, locking, manifest, preflight, and replacement ordering.

## Compatibility, Rollout and Reversal

The schema change is additive. `schema.sql`, `compatibility.sql`, EF mapping, and relational tests must agree on columns, defaults, checks, self-reference behavior, and uniqueness. Compatibility SQL creates the table and indexes without resetting existing data. No backfill is required because existing installations have no manual extras.

The OpenAPI additions are additive: existing recipe grocery properties and endpoints remain. The name-suggestion operation is also additive and returns only household extra names; it does not change create semantics. Generated clients, stateful mocks, API implementation, PWA consumption, and SSE union update in one vertical slice to prevent contract drift. Dreaming gains one additive rollover task and its report dependency. Older clients ignore the new schedule property and event; new clients continue to accept schedules with absent extras as an empty collection during a bounded rolling deployment.

Reversal can stop creating/mutating extras while retaining the additive table and ignored DTO property. Dropping the table would destroy shopping history and is not part of rollback; removal would require separately authorized export and migration.

## Operational Diagnosis

Mutation logs identify operation type, occurrence/lineage ID, absolute Monday, expected/result version, and outcome without logging household-entered names. Suggestion diagnostics record duration, result count, stale/cancelled state, and outcome without logging query or returned names. Rollover logs the trigger (`dreaming` or `schedule-read-repair`), source and destination Mondays, inserted count, and outcome. Dreaming reporting exposes failure rather than recording a false completion. Conflict, validation, persistence, and publication failures remain distinguishable.

Required evidence separates OpenAPI/static parity, PostgreSQL constraints and transaction behavior, stateful mock behavior, browser interaction, two-client live freshness, and backup/recovery round trips. No one layer is treated as proof of the others.

## User Experience

The current-week grocery surface keeps a compact sticky composer at the bottom, above bottom navigation and safe-area padding. It uses the established cream surface and terracotta primary action, remains visible with an empty meal plan, and does not displace aisle controls while saving. After two typed characters, a tray attached to the composer grows upward inside the visible viewport and shows at most three compact text rows. It does not extend below the field, cover the Add action, become a horizontal chip strip, or open a full-screen sheet. Successful add clears the field, closes the tray, retains focus when practical, and uses the established success toast to name the server-selected section without scrolling the list; failure retains the name and announces a retryable error.

The input uses the combobox pattern with a listbox relationship, expanded state, active descendant, and announced result count. Its current value is authoritative whether characters are typed directly or committed as replacement/completion text by an on-screen keyboard. Touch selects a row without submitting. Arrow keys move through results; Enter on an active result fills the input, while Enter with no active result submits the current text. Escape, leaving the composer, dropping below the threshold, or successful submission closes the tray without otherwise discarding typed text. The on-screen keyboard, input, primary action, and three-row maximum must be inspected together at the narrow supported viewport; source structure alone does not qualify the layout.

Extras use the existing aisle cards, row spacing, checkbox semantics, and tag control, plus a compact `Extra` text label and an accessible edit icon. Render the label as a small semibold non-interactive span immediately after the item name using a contrast-safe ochre text token on the actual cream/white row surface. It has no background, border, icon, padding container, hover, focus, or pointer treatment. The name and label may wrap together rather than shrinking the tag or edit touch targets. The visible word supplies the meaning; ochre reinforces source without becoming a color-only signal. Edit mode replaces only that row's name with an inline field and Save, Cancel, and Delete actions. Delete removes the row immediately; failure restores it with explicit feedback. There is no edit screen and no quantity, unit, owner, or category field in the add/edit form.

Past weeks show the same rows as static history: the `Extra` text label, snapshotted name/category, and an unmistakable bought/not-bought indicator remain visible, but mutation controls and the bottom composer are absent. The immediately following week omits the composer but shows current unchecked extras beside that week's recipe groceries; those extras remain actionable and disappear from that view when checked or deleted. They retain only the ordinary accent-colored `Extra` source text—there is no `This week` label. Weeks farther ahead show no extras. This supports both Saturday shopping and quick historical recall without inviting the person to rewrite what happened.

All controls use semantic names, keyboard activation, visible focus, non-color state cues, and existing touch-target sizing. Pending state stays local to the affected composer or row; other shopping remains usable. The family guide explains that optional suggestions come from prior household extras without replacing free text, unchecked extras carry forward, checked/deleted items stop, and past weeks are snapshots, but the interface must remain understandable without reading documentation.
