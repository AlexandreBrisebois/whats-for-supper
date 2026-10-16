# Proposal

## Why

The promoted background-processing baseline covers acceptance, progression, retries and detail reads, but leaves shared operational APIs and worker recovery undescribed. Complete the implementation-supported remainder so review can distinguish actual persisted behavior from comments, contract gaps and unqualified recovery promises.

## What Changes

- Add documentation-only requirements for generic API access/binding, active-list filtering and diagnostics, task reset, stale-task reclamation, polling/throttle configuration and stored processor results.
- Include the audit-discovered shared StartWorkflow/UTC cron scheduling and terminal workflow-history pruning boundaries.
- Preserve the promoted Purpose and 14 requirements/42 scenarios exactly; reuse trigger and instance-read rules rather than duplicating them.
- Record complete coverage, source identities, assertion limits, withheld claims and owner exclusions in the capability plan. The full remaining shared discovery scope is authorized by the user's 2026-10-16 pasted request (local decision BP-R01).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `background-processing`: ADDED rules for supported missing shared workflow behavior. This extends the documented baseline without changing application behavior or modifying existing requirement blocks.

## Impact

Only this change's planning artifacts, the background-processing capability plan and its small index summary change. API/controller/EF/SQL, generated SDK, REST examples, worker/processors and tests are read-only evidence. No implementation, contract repair, services, runtime qualification, promotion or archival is authorized. See BSL-background-processing-007–013 in the capability plan for the coverage matrix, traces and qualifications; U01/U70–U94, A34 and A69 remain in force. Human review is pending; the capability is not baseline-complete.
