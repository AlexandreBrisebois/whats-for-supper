# Proposal

## Why

Audit finding C0007 identifies agreeing management-status selection/projection rules with unclear ownership, not a proven application defect. Naming one existing owner will let maintainers review the shared endpoint without treating demo-household as an independent authority for ordinary management results.

## Outcome and Scope

Documentation-only ownership clarification for GET /api/management/status. data-backup-and-recovery owns shared workflow selection and result projection; demo-household retains its demo-specific diagnostics and references that contract. Observable application behavior is unchanged. No consequential decisions remain unresolved for this bounded plan.

## What Changes

- Expand `Project the latest selected management result` to incorporate the existing five-workflow selection rule and its two scenarios from `Read latest management workflow diagnostics`.
- Remove that superseded demo requirement with an explicit replacement mapping; retain its scenarios under the shared owner, including the warning that the newest result can be reschedule rather than restore.
- Add reciprocal non-normative ownership links during later application. Preserve all other requirements, scenarios, evidence, qualifications and historical provenance.
- Preserve workflow acceptance versus completion, persisted status and timestamps, null-result semantics and demo diagnostics. No new response fields, guarantees, capability or runtime abstraction.

Deltas are required because existing normative obligations change owner and scope of expression, despite unchanged application behavior; `skip_specs` would omit the requested reviewable ownership transfer.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `data-backup-and-recovery`: shared management workflow selection and result projection for ordinary and demo workflow instances.
- `demo-household`: relinquish shared selection/projection ownership, retaining demo-specific management diagnostics and consuming the shared contract.

## Impact

Later application edits only the two existing canonical specs and this change's task/evidence record, plus the audit tracker checkpoint if needed. Current planning writes only this change directory and the tracker. Design contains exact before/after mapping, wording rationale and validation/conservation checks.

Inspected boundaries: ManagementController.GetStatus, persisted workflow instance/task models, ManagementStatus, recovery baseline inspection, cron calculation and recovery/error middleware; OpenAPI remains authoritative and unchanged. Runtime/API/database/browser/provider qualification is not established by this plan. Existing P0 inventory tooling and Taskfile edits remain untouched; overlap tooling, benchmarks, URL/photo finalization consolidation and selective-read policy changes remain excluded. No dependency installation, code/client/mock/contract edit, commit, PR, sync or archive is included.
