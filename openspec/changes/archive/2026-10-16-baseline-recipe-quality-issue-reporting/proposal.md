# Proposal

## Why

Household members can report problems with an existing recipe and sometimes request another extraction using that feedback. A bounded baseline is needed to distinguish saving a report from starting, delivering and completing that contextual re-import.

## What Changes

- Document the existing report form, validation, submission, retained errors and issue indicators.
- Extract server-owned manual-only versus contextual-attempt decisions, repeated-feedback handling and import-ID observation.
- Describe conditional processing outcomes without promising successful URL dispatch, universal member access, automatic resolution or resumed polling.
- Record source identities, inspected assertions, discrepancies and requirement/scenario mappings in `docs/openspec-baseline-plan.md` (A73, BSL-recipe-quality-001–005).
- Create documentation-extraction tasks only; no application changes or runtime qualification.

## Capabilities

### New Capabilities

- `recipe-quality`: Reporting recipe content or duplication issues and observing contextual re-import requested by report submission. CLI inventory confirms this capability does not yet exist.

### Modified Capabilities

None. Reuse household-identity shared access/member context and recipe-library detail retrieval/loading/dismissal. Recipe-capture owns existing acquisition/extraction/readiness behavior; this delta adds only feedback-specific behavior and conditional outcomes, without changing its initial-capture requirements.

## Impact

Documentation only: this change and the durable baseline plan. Evidence spans the PWA issue sheet/detail/badge, generated client and OpenAPI, report/import services, persistence, workflow definitions/processors and related tests/mocks. No code, tests, contracts, generated clients, SQL, dependencies or configuration changes.

Cooking-mode reporting is an entry dependency only. Manual report review/resolution, generic/bulk re-import and Settings failed-capture management remain outside this slice. Initial URL/photo/description/PDF capture, editing, hero generation, search ranking, planning/cooking behavior, demo, broader preview, installation and deployment are excluded. Main specs, feature-enabled PDF scope, U70–U74, A69's description-status caveat, A34 and prior historical qualifications remain intact.

This is a draft for human review; no acceptance, promotion, archival, implementation or successor slice is authorized. U01 and new U75–U79 retain disputed or incomplete claims outside the delta.
