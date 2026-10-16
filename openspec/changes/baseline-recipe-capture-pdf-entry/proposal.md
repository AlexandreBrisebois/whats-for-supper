# Proposal

## Why

PDF capture is implemented behind member-specific preview eligibility and is absent from the promoted recipe-capture baseline. Extracting this separately selected A09 slice makes its acceptance, delayed validation and recovery boundaries reviewable without implying general availability or runtime qualification.

## What Changes

- Document the feature-enabled PDF journey: file selection, confirmation and metadata, multipart acceptance, initial persistence, background conversion/extraction, session feedback, original-page access and bounded recovery.
- Add only PDF-specific requirements; reuse existing recipe-capture completion/failure rules and recipe-library original viewer requirements.
- Record ordered source traces, inspected test assertions/substitutions, discrepancies and source identities in `docs/openspec-baseline-plan.md` (A71; BSL-recipe-capture-015–019).
- Produce documentation-extraction tasks only. Preserve URL, photo and description requirements and all prior artifacts. No application behavior changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-capture`: add the separately authorized feature-enabled PDF acquisition baseline, with eligibility and asynchronous failure limits.

## Impact

Documentation only: this change's proposal, design, recipe-capture delta, tasks and CLI metadata, plus the durable baseline plan. Main recipe-capture remains 26 requirements/62 scenarios, counted from actual headers. Existing API, client, services, workflow and tests are read-only evidence, not implementation targets.

Excluded: URL/photo/description changes, manual editing, hero generation, planning, demo, broader preview features, installation/OS transport guarantees and deployment variants. Share staging is inspected only as an entry dependency. A34 database/runtime/model qualification remains deferred. Disputed or incomplete guarantees are withheld and recorded as U70–U74; no consequential product decision is required to draft the supported subset. Stop at validated draft for human review; no promotion, archive, apply or successor slice.
