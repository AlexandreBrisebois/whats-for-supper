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

A scaled context with affected uncertain quantity wording shows at most one concise contextual notice; keep unaffected valid steps projected. Do not show per-step badges or blanket warning for every unmeasured ingredient. Missing basis leaves original text and correction access; cooking and allowed completion remain available. Preserve time/temperature/equipment, source access, supported sections, both reading modes, focus and current phone/tablet layout.

## Consequential Review Hold

If original total changes 200→250 g and one explicit use is 50 g, recommend retaining 50 g original (75 g at factor 1.5), explicit fractions and proven whole uses. Automatic redistribution would turn it into 62.5 g original without a direct instruction edit. A contradiction should invalidate dependent numeric rendering/remainder quietly. This policy needs a user decision; dependent edit-reconciliation implementation tasks remain blocked, not assumed approved. Read-only role semantics and independent grocery interaction review can continue.

See the shared [dependency/conflict review](../canonical-ingredient-correction/review.md) for approval and release order, and [acceptance corpus](../canonical-ingredient-correction/acceptance-corpus.md) for preservation cases. Proposed API/schema details have one owner in [contracts.md](../canonical-ingredient-correction/contracts.md).
