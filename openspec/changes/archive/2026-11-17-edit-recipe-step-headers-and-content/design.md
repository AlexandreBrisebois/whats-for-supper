# Design

## Context and Existing Ownership

- **Recipe detail editor UI**: `pwa/src/components/recipes/RecipeDetailSheet.tsx` owns `isEditing` mode, `draftInstructions` state, and `handleSaveRecipeFields`, which already submits `instructionSections` (for `contentSchemaVersion === 2`) or `recipeInstructions` (for legacy recipes) via `updateRecipe` (`PATCH /api/recipes/{id}`).
- **Instruction draft manipulation**: `pwa/src/lib/recipes/instruction-draft.ts` owns `originalInstructions`, `instructionRows`, `changeInstruction`, `addInstruction`, `canonicalInstructionInput`, and `restoreDeletedInstructionIds`. Currently `instructionRows` flattens sections into `{ path: [outer, inner], text }` and drops `section.name` / `HowToSection.name`, so section headers are invisible and uneditable in `RecipeDetailSheet` edit mode.
- **Draft persistence & reconciliation**: `pwa/src/lib/recipes/editor-draft.ts` owns `editorBaseline`, `persistEditorDraft`, `reconcileEditorDraft`, and `restoreDeletedEditorRows`. It already stores `fields.instructions` as the full `unknown[]` section/step tree, and `RecipeDetailSheet.tsx` has `editorFieldText` which currently formats `instructions` via `instructionRows` (omitting section headers in conflict diff display).
- **API contract**: `specs/openapi.yaml` (`RecipeInstructionSectionInput` / `RecipeInstructionStepInput`) already supports `id`/`clientId`, `name` (`string | null`), and `steps` (`{ id | clientId, text }[]`). No backend or OpenAPI changes are required.

## Decisions and Tradeoffs

1. **Section-grouped draft projection instead of flattened `instructionRows`**:
   - _Choice_: Add a section-grouped projection helper (e.g., `instructionSectionsForEditor(content, canonical)`) in `instruction-draft.ts` that preserves each section's index, `name` (or `''` when `null`/absent), and its ordered steps (`path: [outer, inner]`, `text`), while keeping legacy flat string/`HowToStep` arrays working by treating them as a single unheaded section (or upgrading to `HowToSection` when a header or additional section is added).
   - _Tradeoff_: Slightly more UI structure in `RecipeDetailSheet.tsx` (section card/group with header input + step list) vs. a flat list, but directly models `instructionSections` without losing section boundaries or leaving orphaned empty sections.
2. **Blank section header normalizes to `null` (unheaded), not an error**:
   - _Choice_: Trimming a blank header input produces `null` for `section.name` in canonical v2 (and omits/nulls `name` on legacy `HowToSection`), matching `RecipeInstructionSectionInput.name: { type: [string, 'null'] }`.
   - _Tradeoff_: Users can clear a header without deleting the steps inside that section.
3. **Removing empty sections / last step**:
   - _Choice_: Adding a section creates `{ clientId, name: '', steps: [{ clientId, text: '' }] }` (or `{ '@type': 'HowToSection', name: '', itemListElement: [...] }` for legacy). Removing a section removes the section and its steps; removing the last step of a section leaves the section (or allows removing the section explicitly), and on Save, empty-text steps can be filtered or kept as existing `handleSaveRecipeFields` behavior dictates—filtering blank-only new sections/steps or trimming header names on submit.
4. **Keep `CooksMode.tsx` unchanged**:
   - _Choice_: `CooksMode.tsx` is optimized for hands-free/in-kitchen single-step text tweaks and already renders `sectionTitle` as a read-only heading. Structural editing (headers, adding/removing sections and steps) belongs in `RecipeDetailSheet.tsx`.

## First Observable Slice

- **Slice**: Load a canonical v2 recipe with at least one named section (e.g., `"Sauce"`) and steps in `RecipeDetailSheet`, open **Edit** via the gear menu, edit both the section header and a step's content, click **Save changes**, and verify:
  1. `PATCH /api/recipes/{id}` receives `instructionSections` with the updated `name` and `text` while preserving existing `id`s (and `clientId`s for newly added sections/steps).
  2. Exiting edit mode displays the updated `<h4>` section header and step text in `RecipeDetailSheet` view mode.

## State, Concurrency and Recovery

- `draftInstructions` continues to be persisted in `localStorage` via `persistEditorDraft` in `editor-draft.ts`, so reloading or reopening the sheet preserves edited section headers and step texts.
- On `409` / revision mismatch, `reconcileEditorDraft` compares `fields.instructions` as full structures (already including `name`), and `editorFieldText` in `RecipeDetailSheet.tsx` should include section headers alongside step texts so the user sees header differences in the reconciliation UI.
- `restoreDeletedInstructionIds` in `instruction-draft.ts` already reconciles `section.id` / `clientId` and `step.id` / `clientId` against the latest saved recipe; newly added sections must carry a `clientId` so `RecipeInstructionSectionInput` satisfies `oneOf: [id, clientId]`.

## User Experience

- Each section in edit mode renders an accessible `<input>` labeled `"Section header"` (localized, e.g., `recipes.sectionHeader`), a `"Remove section"` button when appropriate, its numbered step `<textarea>` fields (`Step {{number}} instructions`), an `"Add step"` button scoped to that section, and a `"Add section"` button at the bottom of the instructions editor.
- All interactive controls maintain `min-h-12` (48px) touch targets, `min-w-0` wrapping for narrow viewports (`>= 320px`), and disabled state while `isSavingRecipe` is true.
