# Documentation extraction tasks

## 1. Extract and reconcile

- [x] 1.1 Trace BSL-grocery-shopping-001 through the actual UI/API/persistence/returned-state seams and inspect the named assertions and substitutions in design.md.
- [x] 1.2 Extract and map every requirement and its scenarios: Derive grocery needs from recipe-bearing entries in the selected week; Prefer usable structured supply over ingredient text; Read supported structured quantity representations; Use ingredient text after invalid JSON syntax; Persist the recomputed list for subsequent schedule reads. Record source identity, dirty inputs, confidence, agreements and withheld findings in the capability plan.
- [x] 1.3 Reconcile shared owners and keep U06/U100 and slice-specific unsupported claims non-normative; review proposal, design and delta for documentation-only coherence.

## 2. Validate the draft

- [x] 2.1 Pass `openspec validate baseline-grocery-shopping-scheduled-needs --strict --no-interactive` and review all scenario mappings and local links.
- [x] 2.2 Run `openspec validate --all --strict --no-interactive`, classify unrelated failures separately, and include this directory plus every changed plan/artifact in the final `task verify -- <complete-task-owned-paths>` record.

All checkboxes concern extraction/reconciliation/check execution only. Human acceptance, promotion and archival are not tasks authorized by this request. Application unit/API/integration/E2E tests and runtime/database/device qualification are not-run; red/green, client generation and implementation finish gates are not-applicable to documentation-only extraction. Final verification results belong to the harness record and session report.
