# Documentation extraction tasks

These boxes track documentation extraction only. They do not accept application behavior or authorize applying, promoting or archiving the change. Runtime qualification remains deferred under A34.

## 1. Reconcile the bounded slice

- [x] 1.1 Inspect the source/client/approved-contract and immediate persistence or workflow boundaries for demo ai bypass and provider boundaries; verify the ordered traces and BSL evidence references in the capability plan.
- [x] 1.2 Inspect actual assertions and test substitutions; verify implementation-supported classification and explicit not-run runtime evidence, plus the exclusions in proposal.md.
- [x] 1.3 Draft the requirements and every named scenario in specs/demo-household/spec.md; verify each maps to BSL-demo-household evidence in the capability plan and retains existing shared-owner semantics.

## 2. Validate the documentation package

- [x] 2.1 Run `openspec validate baseline-demo-household-ai-boundaries --strict --no-interactive` and review all selected source links and requirement/scenario mappings; the strict validator passed and the complete mapping/trace review is recorded in the capability plan.

Final repository verification: run `task verify -- <every task-owned path>` for the complete six-slice document set and inspect the invocation-specific record. Its exact result is reported in the final response; this check does not establish human acceptance or runtime qualification.

No TDD behavior cycle, API/client generation, mock changes, application tests or live database/browser/model checks apply to these documentation edits. Existing tests are inspected evidence, not newly observed execution. Human review is the next lifecycle action; no application implementation tasks are introduced.
