# Tasks

Documentation-only baseline generation. No application implementation tasks are authorized. Source/test inspection is evidence, not an executed test result.

## 1. Extract supported producer behavior

- [x] 1.1 Inventory actual workflow definitions and compare producer outcomes against existing capabilities; verify the omissions and shared-owner boundaries in design.md.
- [x] 1.2 Draft materialization and index-publication requirements under recipe-search; verify every scenario against source and distinguish assertion-backed from source-only cases in design.md.
- [x] 1.3 Draft classification, bounded backfill and metrics under recipe-library; verify exact processor assertions and preserve launch/completion distinctions in design.md.

## 2. Validate documentation scope

- [x] 2.1 Run `openspec validate baseline-recipe-search-operator-maintenance --strict --no-interactive`; record its actual result and inspect source identities in evidence-sha256.md.
- [x] 2.2 Coordinator performs independent review and applicable explicit-path documentation verification for every new file in this change (.openspec.yaml, proposal.md, design.md, tasks.md, evidence-sha256.md and both capability spec.md files); record exact command/result with the overall audit evidence before marking complete.

- [x] 2.3 Reconcile the settled date/clock policy by withholding the disputed recency calendar reference, retaining current arithmetic only as non-normative evidence, and rerun strict validation. WFS-BL-005 owns implementation resolution.

## Workflow follow-up

- Human review, acceptance, promotion and archival remain separate and pending.
- Application red/green TDD, contract/client/mock regeneration, runtime/model/browser/PostgreSQL checks and deployment are not applicable to these documentation edits; runtime qualification of the described behavior remains not-run.
- Fixes or expanded guarantees require an individually approved backlog scope and its own test-first tasks.
