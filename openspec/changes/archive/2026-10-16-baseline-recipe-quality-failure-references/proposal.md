# Proposal

## Why

The shared issue form already exposes identifiers alongside returned re-import failure guidance. The baseline covers the guidance but omits these observable support controls.

## What Changes

- Describe conditional Copy recipe ID / Copy import ID controls and successful clipboard acknowledgement.
- Record clipboard rejection and environment qualification limits without inventing recovery behavior.
- Map the delta to BSL-recipe-quality-018 in `docs/openspec-baseline/recipe-quality.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-quality`: Extend failure presentation with reference-copy controls; reuse existing report and failure projection requirements.

## Impact

Documentation only. Read-only evidence spans RecipeImportIssueSheet, detail/cooking props, recipes.ts/generated DTOs, import-report service/public projection and existing tests. No clipboard permission, guaranteed copy success, model repair or workflow delivery claim. A34 and U01/U75–U88 remain; no consequential unsettled decision blocks extraction. No application changes, promotion or archive.
