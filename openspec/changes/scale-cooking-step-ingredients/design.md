# Design

## Context and Existing Ownership

Current `CooksMode`, stepParser/instructionPresentation, RecipeService instruction PATCH and shared serving projection own reading/editing. `CookingStepProjection` already validates revision-bound spans and projects supported allocation forms; `IngredientProjectionService` supplies coherent ingredient/step context. `CanonicalRecipeContentStore` guards original edits and revalidates prior bindings. Reuse those owners, stable original sections/steps and the foundation's contentRevision; no separate step quantity store or replacement projection engine.

Ordinary binding production is still missing: conversion creates empty bindings and instruction Save retains only prior bindings. The existing `CanonicalIngredientEditPostgresTests` step/allocation partials and `LiveBrowser_Cooking*` fixtures exercise consumer behavior with seeded relationships. Their passing evidence cannot establish that an ordinary imported or edited recipe acquires trusted relationships. Group 0 supplies this missing connection; groups 1–3 reconcile and extend existing owners only where their acceptance is absent or affected.

## Decisions and Tradeoffs

Use [shared bindings](../canonical-ingredient-correction/contracts.md) for mention, whole, absolute, fraction, remainder, fixed and per-item roles. Spans are UTF-16 half-open with expected text and exact text/content revisions; Unicode boundaries and duplicate occurrences must be tested. Structured segments could avoid offsets but would force a richer editor/import rewrite; validated spans fit the existing ordinary text editor. An invalid span leaves its original text untouched, not guessed.

Check allocations only in explicit exhaustive same-row sequences. Alternative branches, mentions and reused references never add demand. A numeric remainder requires compatible known uses and correlation-safe arithmetic; intervals are not independent random allocations. One row's invalid sequence cannot invalidate other proven bindings. Fixed and per-item semantics need explicit evidence.

## First Observable Slice

### Accepted automatic reevaluation after import and edits — 2026-11-10

The ordinary recipe editor remains the user entry point. No special recipe syntax
or manual ingredient-to-step linking screen is required. Fresh intake and committed
ingredient/step changes use the same relationship validation rules. At Save,
revalidate unaffected proof and apply the already approved total/allocation rules;
invalidate affected unsafe relationships before any later projection can use them.
Unknown quantities and explicitly cleared rows/steps remain valid user decisions.

When deterministic revalidation cannot establish a supported relationship, an AI
task may propose relationships through the existing workflow system using captured
saved originals, stable IDs and content/text revisions. This is relationship
reevaluation, not a new source reimport or a replacement of human-authored facts.
Alex explicitly accepted this first-release boundary: AI reevaluation may maintain
scaling relationships but may not rewrite saved ingredient descriptions, amounts,
units or instruction wording. Recipe rewriting is outside this workflow's scope.
The server must establish the required association, numeric role and whole/partial
evidence independently of a provider's confidence or `validated` label. The bounded
evidence rules still require engineering design and adversarial acceptance; the
permission to use AI does not resolve that missing validator by assumption.

Reuse existing workflow scheduling, lifecycle, retry and publication owners. Scope
work to affected relationships; a no-op or unrelated metadata change does not
trigger an AI evaluation. Capture the committed input revision, deduplicate repeated
delivery for that revision, and reject late results if current facts no longer match.
Do not relink by row position or restore cleared facts. Provider failure or inability
to prove a relationship leaves saved edits intact and affected wording original;
unaffected validated relationships remain usable. Successful binding publication
advances the coherent content revision through the canonical owner, changes no
ingredient demand, and follows explicit refresh for an active Cook session.

Workstream B owns proposal/validation behavior and its tests; A owns the required
canonical Save/publication hooks. Coordinate that shared boundary before either
worker edits it. The first tracer must exercise an ordinarily imported recipe,
then both an ingredient change and a step change, through actual workflow/API/
PostgreSQL and Cook projection; seeded bindings alone do not qualify this path.

Four-portion 200 g pasta plus confirmed whole-use text → Edit original total to 250 → dated eight displays 500 g in checklist and step while groceries count 500 g once. It crosses canonical guarded PATCH, generated client, projection/API/PostgreSQL, actual Home → detail → Cook and stateful mocks; reads/projection make no provider calls, and workflow acceptance doubles only the external provider boundary. Follow with total oil 2 tbsp split 1+1, double to two 2 tbsp steps and total demand 4 tbsp.

### Slice 1 evidence inlet

`CookingStepRelationshipProducer` is the write-time deterministic owner. Its
`Discover(content, previous)` follows existing projection revalidation on guarded
Save and fresh URL/photo preparation. A complete affirmative action clause must
express whole use explicitly, with exact quantity/unit and a unique canonical
ingredient description. Supported English/French ordinary wording is intentionally
bounded; unsupported trailing clauses, packages, duplicate references, unknown
quantities, unresolved partial/conditional meaning and ambiguous rows abstain.
The parser does not infer role from matching numbers/names/position alone. An
independent named partial use of another ingredient does not invalidate this row.

The internal payload stores versioned rule, source revision and original amount;
it is evidence to recheck, never an authority label. Fresh publication independently
compares binding-bearing original facts/text with the retained normalized source,
then derives every supplied proof with incoming bindings removed. Safe empty
pre-upgrade staged exports remain allowed. The guarded previous snapshot is the
only authority for carrying a proven whole relationship across amount correction;
source, row meaning, unit, text or dependency changes invalidate that exception.
Explicit clears never reconstruct quantities. Own duplicate/malformed proof abstains;
existing allocation-role proof retains its current owner. No producer/AI runs on read,
projection or grocery recomputation.

This slice uses synchronous deterministic reevaluation, so there is no delayed
relationship job to deliver. Async proposal capture, provider failure and stale
completion obligations remain open in 0.1–0.3 rather than being declared covered by
ordinary PATCH conflicts. Exact role arithmetic and existing seeded consumers remain
regressions; this tracer does not qualify ordinary production for every role.

## State, Concurrency and Recovery

Ingredient and instruction edits share expectedContentRevision. Installing updated content is atomic for ingredient list, steps and bindings; active cooking offers explicit refresh preserving unrelated checks, IDs/bookmark/offset/drafts. Stale responses cannot replace current content. Saving from scaled reading edits original wording, not rendered values. Lost replies reconcile through current detail before mutation replay.

Existing quality report responses may contain new content: metadata/report updates may apply immediately, but a different semantic content revision must enter the same explicit refresh path. The existing Cook handler follows that separation; retain it for successful submission, resolution and saved-report/launch-failure responses. Applying returned semantic content immediately would mix new steps with old projected ingredients. Reporting/repair remains available; no candidate workflow is needed.

## User Experience

A scaled context keeps uncertain quantity wording original and readable without a routine uncertainty notice; keep unaffected valid steps projected. Do not show per-step badges or blanket warning for every unmeasured ingredient. Missing basis leaves original text and correction access; cooking and allowed completion remain available. Preserve time/temperature/equipment, source access, supported sections, both reading modes, focus and the phone/tablet roles described below.

## Approved allocation correction

Alex approved the rule: if original total changes 200→250 g and an explicit partial use is 50 g, retain 50 g original (75 g at portion factor 1.5). Do not redistribute it to 62.5 g original. Relative “half” remains half of the corrected total; proven whole uses track that total. Validate affected groups and remainders again; inconsistencies leave affected wording readable and retain correction/source access without a routine uncertainty notice or cooking block. This decision is settled; implementation approval and runtime acceptance remain separate.

See the shared [dependency/conflict review](../canonical-ingredient-correction/review.md) for approval and release order, and [acceptance corpus](../canonical-ingredient-correction/acceptance-corpus.md) for preservation cases. Proposed API/schema details have one owner in [contracts.md](../canonical-ingredient-correction/contracts.md).

## Cook mode cleanup amendment — 2026-11-09

This amendment was approved and its bounded presentation changes were implemented under tasks 5.1–5.2. The following design and acceptance boundaries remain the preservation contract; task 5.3 tracks remaining combined qualification. The user's annotated `2545.jpg` was materialized and visually inspected at 390×844: the green ring encloses Edit and View Original, separate from the layers/document toggle on the left; the blue ring encloses the routine uncertainty paragraph and View adjusted ingredients link. It does not establish behavior at other widths.

**Implemented slice and owner:** the existing CooksMode presentation and its affected tests remove the `cooking-step-uncertainty` paragraph and duplicate `cook.adjustedIngredients` header action. Keep projection/domain flags and safe original-prose fallback. Keep the dated/prepared context, actual load/projection/conflict/retry feedback, existing missing-projection limitation, changed-content/quantity messages and explicit Refresh actions. No API/schema/client, arithmetic, grocery, household, canonical correction, migration/recovery or completion changes are needed for this cleanup.

**Layout:** the existing `cooks-mode-header-controls` flex-wrap toolbar owns the two groups. Keep the view toggle first and left. Put the existing conditional focused Edit and Original controls in a minimal flex action group with an automatic start margin on phones (for example `ml-auto md:ml-0`), wrapping within the available width; retain source/target/focus semantics. Tablet keeps its existing lower-left placement and separate focused Edit owner. Do not apply `justify-end` to the entire toolbar: that moves the distinct left view group too. Do not reorder controls in CSS or DOM; preserve view → Edit (when eligible) → Original keyboard order, named labels, ≥44×44 CSS-pixel targets, focus outlines, pressed/disabled/loading states and source-focus restoration. No fixed screenshot-derived widths, shrinking labels, clipped controls or horizontal page overflow. At narrow/enlarged French sizes, the right group may wrap onto a new right-aligned row.

**Navigation and trade-offs:** retain the existing footer Ingredients/Resume steps path in All steps, including disabling Ingredients during editing and retaining checklist, bookmark and exact reading offset. Focused reading retains Back to prep (repeat Back as necessary); removing the header link does not add a new focused shortcut or change focused navigation. Its current `showIngredients` behavior is honored only in All steps, so do not expand this cleanup into a focused-navigation fix. Removing the paragraph also removes its `role=status` audible announcement: uncertain source wording remains truthful, but there is no separate uncertainty announcement. Do not replace it with a banner, badge, tooltip, hidden duplicate warning or reserved warning space. Real error and changed-content announcements remain.

A responsive end-aligned action group meets the screenshot with one small wrapper. Right-aligning every tool contradicts the distinct left toggle; absolute positioning risks overlap/reflow; another ingredients shortcut or disclosure adds a mechanism the user asked to remove. Prefer subtraction plus the existing toolbar/navigation owners.

**Required acceptance before completion:** no routine notice or duplicate header ingredients action in preparation or either reading presentation, in original, scaled, mixed uncertain and prepared contexts; valid amounts still project and uncertain spans stay original/readable without extra demand or cooking/completion block. Exercise All steps Ingredients → Resume with retained checks/bookmark/nonzero exact offset, disabled Ingredients while editing and retained drafts through refresh; exercise focused Back to prep. Render EN/FR at 320, 390 and 430 CSS-pixel widths, enlarged text and narrow landscape/safe-area reflow: left toggle, right Edit/Original group, correct order, full labels/targets/focus and no overflow. Each rendered toolbar row must end-align the action group against the toolbar's inner right edge when present; the view toggle stays against its inner left edge. Retain tablet portrait/landscape lower-left controls, 40% sidebar and source/focus behavior. Geometry and interaction evidence are required, not a class-name assertion alone.

This is a UI preference amendment, not a newly demonstrated projection defect. Earlier positive uncertainty-notice and header-link expectations were replaced under the approved implementation; other acceptance remains binding. C19's prepared evidence remains tied to its source identity. The historical 11/12 report-opacity failure is retained in task evidence, followed by separately recorded report-navigation and fixture repairs and a 12/12 required local cooking pass. It is not the current unresolved result. Current integration and hosted-candidate gaps are tracked in tasks.md and the parity owner; do not infer that the cleanup fixed unrelated French focus/navigation, touch drag or Planner timing observations. This change establishes no deployment readiness and adds no old-backup support.

## Explicit absolute-use evidence inlet

The next bounded producer extends the slice 1 write-time owner with
`explicit-absolute-clause` evidence. Its version/source/original amount, exact declared
unit and UTF-16 measurement span are checked against the closed action clause and unique
saved ingredient. A positive scalar use strictly below a known scalar total establishes
partial use without asserting exhaustive allocation. Unsupported associations abstain.
Fresh publication independently derives supplied proof; Save reuses only current valid
proof from its guarded previous snapshot. Total corrections preserve the original absolute
amount; step wording changes create new proof. Original facts, source and readable text
are never rewritten by discovery. Existing projector payload amount/unit and all other
roles retain their owners. No API, async task or other role producer is added.

See [selected slice and scenario mapping](tasks.md#coordinated-absolute-use-slice-2) for
C03/C45 acceptance, C01–C06/C12–C19/C46 preservation and remaining aggregate obligations.
