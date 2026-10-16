# Tasks

## 1. Evidence-linked documentation

- [x] 1.1 Trace existing file-driven merge, compatibility and retained asset recovery; verify source/test anchors and substitutions in BSL-data-backup-and-recovery-008–012 in the capability plan.
- [x] 1.2 Draft proposal, design and observable delta requirements; review every scenario against the evidence mapping and keep limitations non-normative.

## 2. Draft validation

- [x] 2.1 Validate this selected draft using `openspec validate baseline-data-backup-and-recovery-restore-merge-assets --type change --strict`; record exact outcome.
- [x] 2.2 Review the complete task-owned documentation scope and enumerate the explicit final verification paths, including all six changes, the capability plan and index; verify this selection against the artifact inventory and preserve unrelated edits.

Behavior red/green, unit/API/browser/PostgreSQL/model/live-service checks and contract/client generation are not applicable to documentation changes and are not run under A34. These tasks document existing evidence; they authorize no implementation or new tests.

## Workflow follow-up

DBR-P01 (2026-10-16): the user's “promote” accepts this reviewed documentation
delta and authorizes its promotion into the main data-backup-and-recovery spec.
Requirement/scenario wording and all evidence limitations are unchanged. This
supersedes the DBR-G01 pending-review checkpoint; the change remains active and
unarchived. No application or runtime acceptance is implied. Final validation and
the complete 11-path documentation verification outcome are reported in the
promotion response and its invocation-specific record.
