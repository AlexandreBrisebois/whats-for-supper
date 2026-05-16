# High Fidelity Recipe Sharing & Portable Format - Requirements

## Vision
Transform the `.recipe` bundle from a simple sharing format into a high-fidelity portable data standard that supports structured instructions, preserves personal metadata (optionally), and enables robust long-term backups.

## Product Decisions
- **Structured Instructions**: Transition from `string[]` to a schema-aligned `HowToSection[]` model.
- **Sharing vs. Backup**: Sharing bundles must be scrubbed of personal fields (`notes`, `rating`), but the schema supports them to enable future non-lossy backups.
- **Dietary Profile**: Stripped from bundles to ensure fresh generation on the destination system.
- **Hero Image Enforcement**:
    - **Sharing**: Recipes must have a hero image to be shared. The UI will hide the share action if the hero is missing.
    - **Backup (Technical)**: If a hero is missing during export, the bundle is produced with `isReady: false` to trigger re-generation on import.

## Acceptance Criteria

### 1. Structured Instruction DTOs
- [ ] **AC 1.1**: The API must define `HowToSectionDto` (Name, Steps) and `HowToStepDto` (Text) following the Schema.org specification.
- [ ] **AC 1.2**: `ImportedRecipeDto.Instructions` must be a `List<HowToSectionDto>`.

### 2. High-Fidelity Export (Sharing)
- [ ] **AC 2.1**: The `ExportRecipeShareBundle` logic must map raw metadata to structured sections without losing data.
- [ ] **AC 2.2**: If the source recipe has flat instructions, they must be wrapped in a default "Instructions" section.
- [ ] **AC 2.3**: `Notes`, `Rating`, and `DietaryProfile` must be null in the exported "Share" bundle.
- [ ] **AC 2.4**: The export must fail or return an error if the Hero image is missing and the context is "Sharing".

### 3. Portable Import
- [ ] **AC 3.1**: The `ImportRecipeShareBundle` must correctly parse structured sections and store them in `raw_metadata`.
- [ ] **AC 3.2**: The importer must restore `Notes` and `Rating` **if and only if** they are present in the bundle.
- [ ] **AC 3.3**: The PWA `parseRecipeBundleFile` must validate structured sections and be resilient to the optional `notes`/`rating` fields.

### 4. UI/UX (Mère-Designer)
- [ ] **AC 4.1**: The Recipe Detail page must only show the "Share" button if a hero image is successfully generated.
- [ ] **AC 4.2**: The Bundle Preview during import must correctly render structured sections (Sub-headings for sections, bullet/numbered lists for steps).

## Glossary
- **Full Fidelity**: A state where no structural or metadata meaning is lost during an Export -> Import cycle.
- **Hollow Hero**: A bundle where a hero image property exists but contains null mimeType/base64 data.
- **Schema.org Alignment**: Adherence to the industry-standard JSON-LD structure for recipes.
