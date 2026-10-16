# Proposal

## Why

The promoted recipe-sharing baseline covers 9 requirements and 34 scenarios, but does not explicitly describe the existing controls that suppress repeated Share activation and show pending import acceptance. Completing the authorized ordinary-household extraction requires these narrow additions and a coverage/discrepancy reconciliation.

## What Changes

- Draft two additional recipe-sharing requirements with three scenarios for pending Share and import controls, backed by BSL-recipe-sharing-006/007 in the capability plan.
- Reconcile the current 9/34 main spec and original delta against historical 9/27 records without rewriting history.
- Account for all requested export/import inspection questions, including unsupported claims and test substitutions, in the capability plan.
- Preserve all promoted requirements and the existing sharing change, including its staged edits. This is documentation extraction of current behavior; no application behavior changes are proposed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-sharing`: Add pending-action control requirements omitted from the promoted export/import journey. Existing privacy, validation, delivery, preview, persistence and navigation requirements remain untouched.

## Impact

Only this change's planning artifacts, `docs/openspec-baseline/recipe-sharing.md`, and the sharing row in the routing index. Source boundaries inspected: loaded detail, capture preview, client wrappers/generated SDK, OpenAPI, controller/service, success wrapping, database and asset storage. No contracts, application files, tests or dependencies change.

Generation is authorized by the 2026-10-16 user instruction through all independent ordinary-household slices. Human review, acceptance, promotion, archival and runtime qualification remain pending or unauthorized. Disputed broader claims are non-normative; none blocks these two independent additions.
