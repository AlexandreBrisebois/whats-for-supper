# Design

## Context and Existing Ownership

Current `CooksMode`, stepParser/instructionPresentation, RecipeService instruction PATCH and shared serving projection own reading/editing. The current cooking requirement explicitly leaves all step amounts original; this companion replaces that limitation. Reuse stable original sections/steps and the foundation's contentRevision; no separate step quantity store.

## Decisions and Tradeoffs

Use [shared bindings](../canonical-ingredient-correction/contracts.md) for mention, whole, absolute, fraction, remainder, fixed and per-item roles. Spans are UTF-16 half-open with expected text and exact text/content revisions; Unicode boundaries and duplicate occurrences must be tested. Structured segments could avoid offsets but would force a richer editor/import rewrite; validated spans fit the existing ordinary text editor. An invalid span leaves its original text untouched, not guessed.

Check allocations only in explicit exhaustive same-row sequences. Alternative branches, mentions and reused references never add demand. A numeric remainder requires compatible known uses and correlation-safe arithmetic; intervals are not independent random allocations. One row's invalid sequence cannot invalidate other proven bindings. Fixed and per-item semantics need explicit evidence.

## First Observable Slice

Four-portion 200 g pasta plus confirmed whole-use text → Edit original total to 250 → dated eight displays 500 g in checklist and step while groceries count 500 g once. It crosses canonical guarded PATCH, generated client, projection/API/PostgreSQL, actual Home → detail → Cook and stateful mocks; no provider calls. Follow with total oil 2 tbsp split 1+1, double to two 2 tbsp steps and total demand 4 tbsp.

## State, Concurrency and Recovery

Ingredient and instruction edits share expectedContentRevision. Installing updated content is atomic for ingredient list, steps and bindings; active cooking offers explicit refresh preserving unrelated checks, IDs/bookmark/offset/drafts. Stale responses cannot replace current content. Saving from scaled reading edits original wording, not rendered values. Lost replies reconcile through current detail before mutation replay.

Existing quality report responses may contain new content: metadata/report updates may apply immediately, but a different semantic content revision must enter the same explicit refresh path. Otherwise the current “apply returned recipe” behavior could mix new steps with old projected ingredients. Reporting/repair remains available; no candidate workflow is needed.

## User Experience

A scaled context keeps uncertain quantity wording original and readable without a routine uncertainty notice; keep unaffected valid steps projected. Do not show per-step badges or blanket warning for every unmeasured ingredient. Missing basis leaves original text and correction access; cooking and allowed completion remain available. Preserve time/temperature/equipment, source access, supported sections, both reading modes, focus and the phone/tablet roles described below.

## Approved allocation correction

Alex approved the rule: if original total changes 200→250 g and an explicit partial use is 50 g, retain 50 g original (75 g at portion factor 1.5). Do not redistribute it to 62.5 g original. Relative “half” remains half of the corrected total; proven whole uses track that total. Validate affected groups and remainders again; inconsistencies leave affected wording readable and retain correction/source access without a routine uncertainty notice or cooking block. This decision is settled; implementation approval and runtime acceptance remain separate.

See the shared [dependency/conflict review](../canonical-ingredient-correction/review.md) for approval and release order, and [acceptance corpus](../canonical-ingredient-correction/acceptance-corpus.md) for preservation cases. Proposed API/schema details have one owner in [contracts.md](../canonical-ingredient-correction/contracts.md).

## Cook mode cleanup amendment — 2026-11-09

This amendment refines the existing cooking change; implementation requires separate approval. The user's annotated `2545.jpg` was materialized and visually inspected at 390×844: the green ring encloses Edit and View Original, separate from the layers/document toggle on the left; the blue ring encloses the routine uncertainty paragraph and View adjusted ingredients link. It does not establish behavior at other widths.

**Smallest slice and owner:** update only the existing CooksMode presentation and its affected tests after approval. Remove the `cooking-step-uncertainty` paragraph and duplicate `cook.adjustedIngredients` header action. Keep projection/domain flags and safe original-prose fallback. Keep the dated/prepared context, actual load/projection/conflict/retry feedback, existing missing-projection limitation, changed-content/quantity messages and explicit Refresh actions. No API/schema/client, arithmetic, grocery, household, canonical correction, migration/recovery or completion changes are needed.

**Layout:** the existing `cooks-mode-header-controls` flex-wrap toolbar owns the two groups. Keep the view toggle first and left. Put the existing conditional focused Edit and Original controls in a minimal flex action group with an automatic start margin on phones (for example `ml-auto md:ml-0`), wrapping within the available width; retain source/target/focus semantics. Tablet keeps its existing lower-left placement and separate focused Edit owner. Do not apply `justify-end` to the entire toolbar: that moves the distinct left view group too. Do not reorder controls in CSS or DOM; preserve view → Edit (when eligible) → Original keyboard order, named labels, ≥44×44 CSS-pixel targets, focus outlines, pressed/disabled/loading states and source-focus restoration. No fixed screenshot-derived widths, shrinking labels, clipped controls or horizontal page overflow. At narrow/enlarged French sizes, the right group may wrap onto a new right-aligned row.

**Navigation and trade-offs:** retain the existing footer Ingredients/Resume steps path in All steps, including disabling Ingredients during editing and retaining checklist, bookmark and exact reading offset. Focused reading retains Back to prep (repeat Back as necessary); removing the header link does not add a new focused shortcut or change focused navigation. Its current `showIngredients` behavior is honored only in All steps, so do not expand this cleanup into a focused-navigation fix. Removing the paragraph also removes its `role=status` audible announcement: uncertain source wording remains truthful, but there is no separate uncertainty announcement. Do not replace it with a banner, badge, tooltip, hidden duplicate warning or reserved warning space. Real error and changed-content announcements remain.

A responsive end-aligned action group meets the screenshot with one small wrapper. Right-aligning every tool contradicts the distinct left toggle; absolute positioning risks overlap/reflow; another ingredients shortcut or disclosure adds a mechanism the user asked to remove. Prefer subtraction plus the existing toolbar/navigation owners.

**Required acceptance before completion:** no routine notice or duplicate header ingredients action in preparation or either reading presentation, in original, scaled, mixed uncertain and prepared contexts; valid amounts still project and uncertain spans stay original/readable without extra demand or cooking/completion block. Exercise All steps Ingredients → Resume with retained checks/bookmark/nonzero exact offset, disabled Ingredients while editing and retained drafts through refresh; exercise focused Back to prep. Render EN/FR at 320, 390 and 430 CSS-pixel widths, enlarged text and narrow landscape/safe-area reflow: left toggle, right Edit/Original group, correct order, full labels/targets/focus and no overflow. Each rendered toolbar row must end-align the action group against the toolbar's inner right edge when present; the view toggle stays against its inner left edge. Retain tablet portrait/landscape lower-left controls, 40% sidebar and source/focus behavior. Geometry and interaction evidence are required, not a class-name assertion alone.

This is a UI preference amendment, not a newly demonstrated projection defect. Earlier positive uncertainty-notice and header-link expectations become stale only after this amendment is approved for implementation; other acceptance remains binding. C19's prepared evidence remains historical at its source identity. The latest required real browser gate remains 11/12 (LiveBrowser_CookingReportRefresh opacity 0 vs 1); French focus/navigation, touch drag, Planner replacement timing and report opacity risks remain unresolved. This proposal establishes no DV or release readiness and adds no old-backup support.
