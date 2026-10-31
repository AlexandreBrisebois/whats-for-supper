# Proposal

## Why

French Planner rows retain the English labels “Chosen” and “2 voted”, adding interpretation where household state should be clear. Source inspection confirms that the recipe-row badge hardcodes both strings rather than using the existing locale tables; browser reproduction has not been run during planning.

## Outcome and Scope

Localize the existing recipe-row badge in English and French, including singular and plural vote forms. Preserve the distinction between vote interest and saved assignments and retain the existing badge-selection and pending-suggestion rules. This is a copy/localization correction, with no voting, assignment, persistence, layout or API redesign. No consequential decisions remain unresolved; proposed French copy is “Choisie”, “1 vote” and “{{count}} votes”.

## What Changes

- Render the existing “Chosen” label as “Choisie” in French.
- Render positive counts as “1 vote” / “2 votes” in French, with the actual count interpolated; retain English “1 voted” / “2 voted”.
- Route these labels through the existing translation infrastructure with explicit singular/plural variants.
- Preserve pending suggestions as pending: displaying a vote count never saves or confirms an assignment. Preserve existing zero/missing-count handling and row actions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: Localized row-state labels and count forms, without changing the separation between displayed suggestions and persisted assignments.

## Impact

- Affected implementation owners: `pwa/src/app/(app)/planner/page.tsx` and the `planner` entries in `pwa/src/locales/{en,fr}/common.json`.
- Reuse `pwa/src/locales/index.ts` translation/interpolation helpers; keep state ownership in `pwa/src/store/weekStore.ts`.
- Extend focused browser coverage in `pwa/e2e/planner.spec.ts` using existing locale fixtures and schema-compliant mock builders.
- No OpenAPI, generated client, backend, database or dependency changes.
