# Design

## Context

See proposal.md for motivation. This is extraction of the remaining shared behavior, not a new runtime design. The current main has 14 requirements/42 scenarios; all remain byte-identical. Cross-cutting access, persistence, hosted-loop timing and contract discrepancies warrant this design record. BSL-background-processing-007–013 in the capability plan hold source identities and complete mappings.

## Goals / Non-Goals

**Goals:** Close the coverage matrix across all five generic API operations, manual reset, hosted reclamation and shared orchestration revealed by discovery. Preserve the distinction between implementation support, inspected assertions and executed evidence.

**Non-Goals:** No application/contract/client/SQL/config changes, runtime checks, promotion, archival or acceptance. No processor-specific recipe, maintenance-command, notification, backup, demo, deployment or search policy. Pruning covers only persisted workflow history; StartWorkflow covers only generic child acceptance and scheduling.

## Decisions

1. **Extend the existing capability with ADDED requirements.** Reusing the promoted trigger/detail blocks avoids duplicate and competing rules. MODIFIED would rewrite reviewed behavior without a settled need. The first observable journey is a household-authenticated REST trigger followed by instance detail; promoted acceptance and reads are reused, with only missing access/binding extracted. Other selected journeys are API-only REST operations, not invented screens.
2. **Trace concrete callers independently from generated availability.** RestClient/07-workflow.rest calls trigger/detail/active/reset; 09-reimport-investigation.rest calls diagnostics. There is no connected PWA workflow wrapper/store/display consumer in the inspected source. Generated workflow builders expose methods, parse data envelopes and use generated models; they do not establish a UI. PWA contextual import observation instead uses /api/recipe-imports and remains recipe-quality owned. Existing workflow mocks are static and diverge on trigger status/envelope, instance envelope and reset payload; do not use them as parity evidence.
3. **Reuse household-identity access policy.** Program's global authenticated-user filter applies to WorkflowController. Its actions have no familyMemberId parameter, member binder, attribution check or role requirement. Hearth authentication supports shared header/token/cookie paths. OpenAPI inherits global HearthSecret security; "administration only" prose does not implement an admin role. Keep credential policy with household-identity.
4. **Describe reset's actual state mutation and retention.** The controller loads a task, applies reset without a status guard, separately looks up a missing navigation parent and changes Paused to Processing. A single SaveChanges call is followed by a wrapped message. RetryCount resets to zero, but Result, dependencies and timestamps remain. No explicit transaction/claim/version token/cancellation coordinates the worker. CaptureFailureService.RetryAsync is a distinct recipe-quality operation: restricted eligible workflows/Paused+Failed task, latest failure, count retained and task/parent updated timestamps advanced. Reusing that policy would misdescribe generic reset.
5. **Describe reaping as periodic best-effort requeue.** Program registers WorkflowWorker; ExecuteAsync initializes local throttles, checks elapsed UTC time, then calls the private reaper before awaited batch execution and delay. It uses UpdatedAt, strict older-than cutoff, one mutation save, broad catch and no parent/retry/liveness filter. Selection later tests Pending and due schedule; reload rechecks schedule only. Processing entry does not advance UpdatedAt. A running processor and a reaper can write the same task without coordination. Comments about poison pills or restart safety do not establish those guarantees.
6. **Bound additional shared surfaces by persisted workflow effects.** StartWorkflow uses the registered orchestrator and CronScheduleCalculator/IClock; its return is child acceptance, not child completion. Child persistence precedes launching-task completion, so retry can create another child. Cron is a five-field numeric matcher with AND semantics, not a full standard cron implementation. ManagementProcessor's PruneWorkflows branch delegates only terminal history retention to ManagementService with IClock; EF/SQL define dependent-task cascade. Dreaming YAML supplies actual callers for both generic branches; its job contents, seeder lifecycle and reporting policies are excluded.
7. **Keep field persistence separate from wire and relational guarantees.** Processor results are stored JSON; U94 withholds result-wire requirements. Active query does not Include tasks: taskCount is the mapped collection count, not established database cardinality. EF defaults are insertion defaults, not update triggers. SQL supplies a required parent FK/cascade; InMemory does not prove orphan, transaction or concurrent behavior. Do not claim atomicity beyond observed save calls.

## Risks / Trade-offs

- [Contract descriptions imply failed-only reset/admin diagnostics] → Record BP-U02 and extract the explicitly requested actual guards; no new authorization role or contract rewrite.
- [Omitted trigger parameters default to an empty dictionary despite required OpenAPI field] → Withhold omitted-field acceptance; keep valid binding only (BP-U01). Missing-definition HTTP disagreement U89 remains.
- [Active taskCount maps an unloaded collection] → Expose the field without promising its accuracy (BP-U03).
- [Reset/reaping race a live invocation, bypass dependency/parent gates and retain results] → Record limits and save-conditioned outcomes; no winner, idempotency, bounded recovery or exclusive execution promise (BP-U04/U90–U94).
- [Positive InMemory examples and direct private calls omit the hosted/relational seams] → Record actual assertions; no tests executed under A34/BP-R01.

## Migration Plan

No deployment, migration or application rollback applies. Human review of this draft is the next lifecycle boundary; promotion requires new explicit authorization. Keep main specs and the prior active lifecycle change unchanged. Any later correction must amend only these task-owned documents while preserving unrelated work. Strict validation proves artifact structure, not runtime behavior.
