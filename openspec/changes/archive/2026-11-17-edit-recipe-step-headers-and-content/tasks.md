# Tasks

## 1. Instruction draft section-header and step-content manipulation

**Outcome and scenarios:** Section headers (`name`) and step contents (`text`) can be read, renamed, cleared, added, and removed in instruction drafts for both canonical v2 (`instructionSections`) and legacy v1 (`recipeInstructions`) shapes, while preserving `id`/`clientId` identities. Covers *Initialize section header and step content drafts in detail edit mode* and *Edit step headers and step content in the detail draft*.
**Owners and boundaries:** `pwa/src/lib/recipes/instruction-draft.ts`, `pwa/src/lib/recipes/instruction-draft.test.ts`.
**Dependencies and prerequisites:** None.
**Acceptance boundary:** Unit tests against `instruction-draft.ts` functions with canonical v2 and legacy v1 fixtures.

- [x] 1.1 Add failing unit tests in `pwa/src/lib/recipes/instruction-draft.test.ts` for projecting section-grouped editor rows (preserving section `name` and step `text`), updating/clearing section headers, adding/removing sections, and adding/removing steps within a specific section; run `cd pwa && npx vitest run src/lib/recipes/instruction-draft.test.ts` and observe the expected failures.
- [x] 1.2 Implement section-grouped projection and section/step mutation helpers in `pwa/src/lib/recipes/instruction-draft.ts` (preserving `id`/`clientId` for canonical v2 and `HowToSection`/`HowToStep` for legacy v1); run `cd pwa && npx vitest run src/lib/recipes/instruction-draft.test.ts` and confirm all tests pass.

## 2. RecipeDetailSheet edit mode for step headers and step content

**Outcome and scenarios:** Opening Edit in `RecipeDetailSheet` displays editable section header inputs alongside each section's step textareas, supports adding/removing steps per section and adding/removing sections, submits normalized headers/steps on Save (`PATCH /api/recipes/{id}`), and discards unsubmitted edits on Cancel. Covers *Initialize section header and step content drafts in detail edit mode*, *Edit step headers and step content in the detail draft*, and *Submit edited step headers and step content on detail Save*.
**Owners and boundaries:** `pwa/src/components/recipes/RecipeDetailSheet.tsx`, `pwa/src/locales/` (EN/FR labels), `pwa/src/components/recipes/RecipeDetailSheet.test.tsx`, `pwa/src/components/recipes/RecipeDetailSheet.refinement.test.tsx`.
**Dependencies and prerequisites:** Slice 1 complete.
**Acceptance boundary:** Component tests in `RecipeDetailSheet.test.tsx` and `RecipeDetailSheet.refinement.test.tsx` with mocked API handlers verifying rendered inputs, `updateRecipe` PATCH payload (`instructionSections` / `recipeInstructions`), view-mode header/step rendering after Save, and Cancel restoration.

- [x] 2.1 Add failing component tests in `pwa/src/components/recipes/RecipeDetailSheet.refinement.test.tsx` covering: (a) opening Edit on a sectioned recipe displays editable section header and step content fields, (b) editing a section header and step text and saving submits trimmed `instructionSections` (with `null` for blank headers) and updates view mode, (c) adding/removing sections and steps, and (d) cancelling discards header and step edits; run `cd pwa && npx vitest run src/components/recipes/RecipeDetailSheet.refinement.test.tsx` and observe the expected failures.
- [x] 2.2 Update `pwa/src/components/recipes/RecipeDetailSheet.tsx` and localization strings in `pwa/src/locales/` to render section-grouped header inputs, per-section step textareas, add/remove step controls, and add/remove section controls in edit mode, normalizing blank headers on Save; run `cd pwa && npx vitest run src/components/recipes/RecipeDetailSheet.refinement.test.tsx src/components/recipes/RecipeDetailSheet.test.tsx` and confirm all tests pass.

## 3. Draft persistence and conflict reconciliation for instruction headers

**Outcome and scenarios:** Unsaved section header and step content edits persist across detail reload/reopen and appear in conflict reconciliation diffs when the saved recipe revision changes concurrently. Covers *Preserve and reconcile instruction header drafts across reload and conflicts*.
**Owners and boundaries:** `pwa/src/lib/recipes/editor-draft.ts`, `pwa/src/lib/recipes/editor-draft.test.ts`, `pwa/src/components/recipes/RecipeDetailSheet.tsx` (`editorFieldText`), `pwa/src/components/recipes/RecipeDetailSheet.refinement.test.tsx`.
**Dependencies and prerequisites:** Slice 2 complete.
**Acceptance boundary:** Unit tests in `editor-draft.test.ts` and component reconciliation tests in `RecipeDetailSheet.refinement.test.tsx`.

- [x] 3.1 Add failing tests in `pwa/src/lib/recipes/editor-draft.test.ts` and `pwa/src/components/recipes/RecipeDetailSheet.refinement.test.tsx` verifying that section header edits are persisted in `localStorage` drafts, detected in `editorBaselineMatches` / `reconcileEditorDraft`, and shown in `editorFieldText` reconciliation diff output; run `cd pwa && npx vitest run src/lib/recipes/editor-draft.test.ts src/components/recipes/RecipeDetailSheet.refinement.test.tsx` and observe the expected failures.
- [x] 3.2 Update `editorFieldText` in `pwa/src/components/recipes/RecipeDetailSheet.tsx` (and any needed `editor-draft.ts` handling) so section headers are included in conflict diffs and retained drafts; run `cd pwa && npx vitest run src/lib/recipes/editor-draft.test.ts src/components/recipes/RecipeDetailSheet.refinement.test.tsx` and confirm all tests pass.

## 4. Final Integration and Verification

- [x] 4.1 Review the complete task-owned diff against `openspec/changes/edit-recipe-step-headers-and-content/`, run `cd pwa && npm run lint && npm run type-check` and `cd pwa && npx vitest run src/lib/recipes/instruction-draft.test.ts src/lib/recipes/editor-draft.test.ts src/components/recipes/RecipeDetailSheet.test.tsx src/components/recipes/RecipeDetailSheet.refinement.test.tsx`, and run `task verify` if available for the changed paths. Report actual statuses and outputs.
