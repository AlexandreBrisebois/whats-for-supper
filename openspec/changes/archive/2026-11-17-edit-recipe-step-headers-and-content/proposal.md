# Proposal

## Why

In `RecipeDetailSheet` edit mode, household members can edit recipe metadata and ingredients, and can edit flattened step text, but cannot see, edit, add, or remove step section headers (`instructionSections[].name` / `HowToSection.name`), nor organize steps under headers. In view mode (`RecipeDetailSheet` and `CooksMode`), section headers render as `<h4>` headings above their steps, but `instructionRows` in `pwa/src/lib/recipes/instruction-draft.ts` flattens all sections into a single list of step textareas and omits section names. Additionally, `openspec/specs/recipe-editing/spec.md` still states that detail editing does not include an instruction editor, which no longer matches the implemented step-text editor.

## Outcome and Scope

Household members opening Edit on a loaded recipe in `RecipeDetailSheet` can view and edit both **step section headers** and **step content** in one unified editor, add or remove steps and sections, and save or cancel those changes through the existing `PATCH /api/recipes/{id}` contract (`instructionSections` for canonical v2 recipes, `recipeInstructions` for legacy v1 recipes).

**In scope:**

- Section-aware instruction editing in `RecipeDetailSheet` edit mode: editing section headers (including clearing a header to `null`/ungrouped), adding/removing sections, and editing/adding/removing step content within sections.
- Draft persistence, cancellation, and conflict reconciliation for both section headers and step content via `editor-draft.ts` and `instruction-draft.ts`.
- Updating `recipe-editing` specification requirements to cover editing both step headers and step content in `RecipeDetailSheet`.

**Out of scope:**

- Backend API or OpenAPI schema changes (`RecipeInstructionSectionInput` in `specs/openapi.yaml` already accepts `id`/`clientId`, `name`, and `steps`).
- Changing `CooksMode` inline single-step editing behavior.
- Drag-and-drop step reordering across sections (beyond add/remove/edit within sections, unless explicitly requested later).

## What Changes

- **Section-aware instruction editor in `RecipeDetailSheet` edit mode**: Replace the flattened `instructionRows` rendering with section-grouped rendering so each section displays an editable header input (with optional/blank value representing an unheaded section) and its ordered step textareas, plus controls to add/remove steps in a section and add/remove sections.
- **Instruction draft helpers (`instruction-draft.ts`)**: Extend helpers to update section header names, add sections, remove sections (or merge/clean empty sections), and add/edit/remove steps by section/step path while preserving `id`/`clientId` identities for canonical v2 recipes and `HowToSection`/`HowToStep` structure for legacy v1 recipes.
- **Draft recovery & reconciliation (`editor-draft.ts`)**: Ensure retained drafts and conflict reconciliation (`editorFieldText` / `reconcileEditorDraft`) include section headers when comparing or displaying instruction diffs.

## Capabilities

### New Capabilities

<!-- None: recipe-editing owns recipe-detail editing behavior. -->

### Modified Capabilities

- `recipe-editing`: Enable editing both step section headers and step content in `RecipeDetailSheet` edit mode, superseding the prior restriction against a detail instruction editor.

## Impact

- **UI & state**: `pwa/src/components/recipes/RecipeDetailSheet.tsx`, `pwa/src/lib/recipes/instruction-draft.ts`, `pwa/src/lib/recipes/editor-draft.ts`
- **Localization**: `pwa/src/locales/` (labels for section header input, add section, remove section)
- **Tests**: `pwa/src/components/recipes/RecipeDetailSheet.test.tsx`, `pwa/src/components/recipes/RecipeDetailSheet.refinement.test.tsx`, `pwa/src/lib/recipes/instruction-draft.test.ts`, `pwa/src/lib/recipes/editor-draft.test.ts`
- **Contracts**: No changes required to `specs/openapi.yaml` or `api/src/RecipeApi/` (`UpdateRecipeDto.InstructionSections` and `RecipeInstructions` already persist section names and step texts).
