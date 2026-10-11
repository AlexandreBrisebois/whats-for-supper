# Planner non-cooking days — requirements

## Status and authority

- Kind: feature specification; registry kind `planned-feature`, lifecycle `planned`.
- Status: accepted for implementation by the user on October 11, 2026; NCD-T0 through NCD-T3 authorized sequentially.
- Direction: behavior-first; source artifact: this file, derived from [issue #214](https://github.com/AlexandreBrisebois/whats-for-supper/issues/214).
- Cadence: accelerated artifact drafting, with consequential open decisions explicitly blocking affected implementation tasks.
- Design and tasks are synchronized with these accepted requirements. Q1 is resolved.

## Outcome

When planning a week, the planner can fill a day without choosing a recipe because supper will be ordered in, eaten out, or covered by another plan. Opening family voting preserves those days and places recipe suggestions only in remaining available slots. These are calendar plans, not recipe tags or completed cooking records.

## Scope

Add a tile to the empty-slot action sheet, a short detail sheet with Ordering In, Eating out, and Other plans quick-select pills; Other plans retains a custom message, durable day labels, editing/clearing, and consistent planner/today/shared-state display. Reuse the existing ordered-in/skipped mechanism rather than inventing another scheduling lifecycle.

Out of scope: frequently used custom-text suggestions, label history/ranking, reusable household tag administration, converting an assigned recipe to a labeled day in one action, new member permissions, per-day family voting, voting isolation redesign, and adjacent movement/grocery refactors. Existing recovery from a planned recipe to order-in remains supported.

## Verified current behavior and constraints

Inspection performed against HEAD `d8d05c4a3571` on October 11, 2026; these are source observations, not runtime test results.

- `ScheduleService.ValidateDayAsync` creates a recipe-free `CalendarEvent` at status 3 (Skipped) for an absent date. Existing events retain their recipe when validated; Home uses that for recipe recovery. The new empty-slot action must not silently remove a concurrently assigned recipe.
- `CalendarEvent`, `ScheduleDayDto`, `ValidationDto`, and `SlotUpdatedEvent` have no label metadata. Label persistence requires a SQL/model/contract/client/SSE change, not local-only text.
- `GetSmartDefaultsAsync` treats every existing calendar event as occupied. `OpenVotingAsync` preserves calendar entries. Preserve these server-owned rules.
- `LockScheduleAsync` currently changes every event to Locked, including recipe-free skipped events. Intentionally change that boundary to preserve non-cooking status and labels.
- The planner already renders status 3 as “Ordered In.” `weekStore.buildScheduleDays` and `slotAssignment.findFirstOpenPlannerSlot` use recipe presence when merging/finding slots; ensure non-cooking days cannot be treated as available by those paths.
- Assignment can overwrite a recipe-free event; movement swaps recipe/status data, and push can shift events. New label metadata must follow the skipped plan through existing movement and be cleared when that plan is replaced by a recipe; it must never remain attached to a recipe-backed slot.
- Current votes are for recipes, not days. “Only suggests meals for remaining days” means schedule placement and pending consensus allocation, not filtering the discovery vote queue.

## Acceptance requirements

### NCD-01 — Mark an empty day

For an otherwise editable empty planner slot, opening its existing action sheet exposes a localized “No cooking” tile. Choosing it opens detail entry for that exact date. The user sees three explicit choices: Ordering In, Eating out, and Other plans. Other plans reveals a “What’s the plan?” field for messages such as “Supper at Grandma’s” or “Emma’s birthday supper.” Save produces a durable, recipe-free occupied day. Cancel/dismiss produces no mutation. Recipe-backed days do not gain this new conversion tile.

### NCD-02 — Valid label and accessible entry

All three choices are mutually exclusive. Selecting Other plans reveals and focuses the custom-message field; the two presets do not open the keyboard. Switching choices preserves the unsaved custom draft while the sheet remains open, but Save persists only the selected choice. Reopening starts from the saved choice/message, not an old unsaved draft. Custom labels are trimmed and must contain 1–80 Unicode scalar values after trimming; whitespace-only/overlength input is rejected by both client and server. Persist plain text and render it escaped, including markup-looking input. No rich text, URLs, or synthesized recipe is created. The sheet provides a date-specific accessible title, labeled input, selected-pill semantics, keyboard navigation, focus containment/restoration, explicit Save and Cancel, and inline validation/error feedback. Preset display names are localized; custom text remains user-authored.

### NCD-03 — Occupancy through the voting cycle

Opening or reopening voting preserves the non-cooking entry. Server smart defaults, client pending suggestions, and close-voting promotion exclude that date. Locking the week preserves status 3, recipe-free identity, and label. A fully marked week has zero open supper slots and receives no automatic assignments; recipe voting itself remains available under existing discovery behavior. Clearing a marked day makes it available again according to existing week/voting rules.

### NCD-04 — Edit, clear, and explicitly replace

Within the lifecycle policy selected by Q1, tapping a marked day offers edit details, clear day, and the existing explicit recipe-selection path. Editing changes the label on that date; clearing deletes the entry; explicit recipe assignment clears all non-cooking metadata and sets normal recipe state. Never infer clearance from navigation, voting, locking, or a missing recipe field. Past-week edit restrictions follow existing planner policy. All Draft/VotingOpen/Locked states are allowed; Q1 is resolved.

### NCD-05 — Persistence and shared display

After save, reload, week navigation, stream reconnect, or another browser's update, the planner shows the saved label without a recipe thumbnail. For Other plans, the custom message is the primary day text, never replaced by “Custom,” “Other plans,” or “Skipped.” Planner and Home cards allow up to two lines; opening the day exposes the full saved message. Today/Home shows the same plan when the date is today; Eating out/custom labels must not appear as Ordering In. Initial SSR, connected snapshots, slot updates, and week updates agree. Recipe-free skipped entries created before this feature, and legacy order-in requests without metadata, still display the same localized Ordering In label. Every user-visible order-in option, action, saved-day label, recovery choice, and confirmation uses one shared localized label: “Ordering In” in English and the existing “Commander” translation in French. Reuse the existing `home.orderingIn` locale key, including legacy fallback display; do not mix “Order In,” “Order-In,” “Ordered In,” and “Ordering In” across app surfaces. Preserve internal `order_in` codes and existing test IDs. Old backups remain readable and new backups preserve metadata.

### NCD-06 — Failure and concurrent changes

Save is single-submit while pending. Failure retains editable input and shows retry feedback without claiming success. No partial label/state mutation survives validation or conflict failure. A non-cooking save encountering a persisted recipe returns conflict and preserves that recipe; refresh the date before retry. A concurrent week-navigation response must not write into the newly selected week or close another date's sheet. Last committed valid label edit wins between label-only edits; no new versioning protocol is introduced. Mutation permission checks use Q1 on the server as well as the UI.

### NCD-07 — No unintended recipe effects

A new marked day contributes no grocery ingredients, cooked history, or recipe vote changes. Voting suggestions and first-open placement treat it as occupied. User-directed dragging onto a marked day behaves exactly like dragging onto an existing order-in day: normal same-week drag swaps the recipe and skipped plan, carrying its preset/custom message to the recipe’s former date. Example: drag Monday’s pasta onto Tuesday’s “Supper at Grandma’s”; Tuesday gets pasta and Monday gets “Supper at Grandma’s.” No non-cooking-specific movement conflict or confirmation is added. Preserve existing push, cross-week, defer, full-week fallback, and Sunday displacement behavior; metadata follows retained/moved skipped plans and is cleared when existing assignment behavior replaces one. Existing Home order-in recipe-rescue behavior, recipe locking, voting thresholds/purge rules, and unrelated grocery behavior remain unchanged. Movement changes are limited to carrying or clearing the new metadata, with existing algorithms and route responses preserved.

### NCD-08 — Contract and compatibility

One approved OpenAPI representation owns label kind/text across reads, mutations, generated models, mocks, and SSE. SQL/install schema and EF mappings match it. Status values retain their current meanings/numbers. Clients do not reconstruct occupation from a label cache or independently reproduce server placement policy. Existing requests without label fields remain valid and existing non-skipped responses have no non-cooking metadata.

## Decisions, proposals, and open questions

User-sourced decisions: empty-slot tile; reuse order-in; Ordering In, Eating out, and Other plans with a custom message; explicit third choice, primary custom-message display, and preserving unsaved custom text when switching choices (accepted UX review); drag onto a non-cooking day behaves like existing order-in, including swapping its message to the source date; consistent localized order-in labels throughout the app; marked days survive opening voting; common-text suggestions belong to a later increment.

Proposed routine choices for review: action copy “No cooking,” explicit Save, 80-character custom limit, coded presets rather than persisting translated names, escaped plain text, label-only last-commit-wins. These are draft design choices, not claims of prior user approval.

**Q1 resolved —** The user selected all Draft/VotingOpen/Locked states on October 11, 2026. Creation, editing, clearing, and explicit replacement are available in all three states, retaining existing past-week restrictions. No new week-status mutation guards are required.

## Dependencies and stopping point

Use current baselines [schedule movement and exceptions](../plan-03-schedule-movement-exceptions/requirements.md), [family voting cycle](../plan-04-family-voting-cycle/requirements.md), [meal assignment and replacement](../plan-02-meal-assignment-replacement/requirements.md), [tonight's meal status](../home-01-tonights-meal-status/requirements.md), and [shared real-time state](../plat-01-shared-real-time-state/requirements.md). Do not rewrite implemented baselines to claim planned behavior; update only affected baselines after implementation evidence exists.

Specification completion delivers this draft, design, tasks, registry entry and checked index. Product implementation requires a separately selected task after the material decision is settled.
