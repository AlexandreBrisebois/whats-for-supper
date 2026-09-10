# Execution packet template

Use with the [specification workflow](../core/specification-workflow.md).
Populate the required fields with verified task-specific content, or mark not
applicable with a reason. Markdown or an equivalent host task payload is valid;
neither creates authorization. Host/model settings are optional metadata, not
correctness or permission rules.

## Required task contract

- **ID / mode:** <stable ID; review, plan, implement, verify or maintain>
- **Outcome:** <one observable result>
- **Authorization source:** <current request/selected task and approved intent;
  distinguish proposed work from authorized execution>
- **Scope:** <allowed files/effects, exclusions; preserve unrelated work>
- **Dependencies:** <immediate prerequisites, actual status and unresolved blockers>
- **Acceptance:** <requirement IDs and observable done conditions>
- **Required context:** <exact spec sections, contract/source paths and relevant
  owners; no recursive repository dump>
- **Mandatory constraints:** <binding task-specific behavior/boundaries with source;
  reference shared policy instead of duplicating it>
- **Verification:** <exact applicable commands/observations, expected assertions,
  environment needs; report passed, failed, blocked, not-run or not-applicable
  with actual evidence and tested content identity; unavailable is never passed>
- **Stop / escalation:** <selected boundary; consequential decisions or scope
  changes requiring input; continue independent authorized work where possible>
- **Deliverable:** <reviewable diff or findings, validation and remaining blockers>

## Optional guidance (non-binding)

<Examples, suggested sequence, patterns/snippets, alternatives and host/model
preferences only when useful. Omit if unneeded. Suggestions do not add acceptance
criteria, broaden scope or replace mandatory constraints. If an example conflicts
with the task contract, follow the contract and surface consequential uncertainty.>
