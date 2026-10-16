# Tasks

## 1. Extract and reconcile this documentation slice

- [x] 1.1 Trace browse, lexical, semantic and similar retrieval with availability boundaries through UI/state, client, approved contract, controller/service and applicable persistence; inspect actual assertions and substitutions. Evidence: BSL-recipe-search-009, BSL-recipe-search-010, BSL-recipe-search-011, BSL-recipe-search-012, BSL-recipe-search-013.
- [x] 1.2 Draft the mapped requirements and every scenario in `specs/recipe-search/spec.md`; review each against the capability evidence entries, shared owners and explicit limitations.

## 2. Validate the reviewable draft

- [x] 2.1 Validate this selected change with `openspec validate baseline-recipe-search-retrieval-modes --strict --no-interactive`, then the complete store with `openspec validate --all --strict --no-interactive`; record exact outcomes in the capability plan.
- [x] 2.2 Review the actual scoped diff and preservation evidence, then run `task verify -- <every task-owned changed/new path>` across all five selected slices and the capability plan. Application tests and test-first implementation are not applicable; runtime/API/browser/PostgreSQL/model qualification is not run by authorization.

Human acceptance and promotion are pending lifecycle actions, not checked extraction tasks. No implementation, acceptance, promotion or archive task is authorized here.

Verification: individual selected strict checks passed; complete-store strict validation passed 89/89 with informational archive-conflict notices for already-promoted unrelated deltas. Corrected 27-path `task verify` passed documentation, selected spec checks and content identity in `.task/agent-finish/runs/e6a55d512e3645408c44877515635bab.json`. The initial link-format check failure and its correction are retained in the capability plan. Final bookkeeping edits require the final scoped verification run reported at handoff. These checkboxes mean extraction/verification work only; human acceptance and promotion remain pending.


SR-D05 resume reconciliation: re-inspected source/assertion evidence and complete
requirement/scenario mappings; fresh selected strict validation passed and stable
complete-store validation passed 90/90. Earlier invocation results above remain
historical. Final `task verify` selects all 27 authorized paths; use its immutable
record reported at handoff for the final documentation identity. See the capability
plan's SR-D05 record for authorization, exclusions and the exact human-review next
action. These tasks authorize no application work, acceptance or promotion.


SR-P01 (2026-10-16): the user accepted and authorized promotion of all five
reviewed recipe-search deltas. This slice's unchanged requirements/scenarios are
now in `openspec/specs/recipe-search/spec.md`; the capability plan records the
accepted evidence mapping, retained exclusions and promotion checks. Earlier
pending-acceptance/promotion labels are historical. This change remains active
and unarchived. Runtime qualification remains not-run/deferred under A34; no
application implementation, staging, commit or deployment is authorized.
