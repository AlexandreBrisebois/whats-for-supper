# Design

## Context

See [proposal](proposal.md) for motivation. This documents an existing cross-layer lifecycle; no new runtime design is authorized. BSL-background-processing-001–005 in the [durable plan](../../../../docs/openspec-baseline-plan.md) contains source identities, assertions and complete delta mapping.

The first observable slice is a valid orchestration call committing a Pending instance and dependency-based task snapshot, then a successful identity-based status read. Real boundaries are stored workflow YAML through IStorageProvider, EF/PostgreSQL persistence, the hosted worker and scoped IWorkflowProcessor dispatch. Worker/API test doubles do not establish that entire path at runtime.

## Goals / Non-Goals

**Goals:** Extract shared acceptance, due-task eligibility, progression, retry scheduling and terminal state semantics while preserving consumer-owned behavior and evidence limits.

**Non-Goals:** Application implementation, contract repair, manual administration, trigger/reset/diagnostic UI, stale-task reaping, maintenance, backup/recovery, indexing, demo, deployment, search/ranking, planning or SSE delivery/reconnection policy. No runtime/database/model qualification, promotion or archival.

## Decisions

1. **One shared lifecycle owner.** CLI inventory has five promoted capabilities and no background-processing. Add only the selected delta, leaving main specs unchanged. Duplicating acquisition, readiness, issue handling or Settings recovery here would create conflicting owners; those stay in recipe-capture and recipe-quality.
2. **Separate acceptance from consumer intake.** RecipeService can persist a recipe and swallow a subsequent trigger exception. Successful WorkflowOrchestrator acceptance is stronger: it returns after SaveChanges and transaction commit of instance/tasks. It is still weaker than worker execution. Do not treat an accepted recipe identity as proof that a workflow exists.
3. **Snapshot definitions and parameters.** WorkflowRepository loads `workflows/<id>.yaml`. Validation covers dependency existence/cycles and placeholders in top-level string payloads. Required keys use presence checks; optional `?` placeholders omit whole top-level entries when absent. Substitution tries Boolean, then Int64, then string. Definitions are not reloaded by the worker for existing tasks. No recursive placeholder validation, processor preflight or nonblank validation is inferred.
4. **Describe persistence boundaries precisely.** Initial orchestration uses a database transaction. Execution saves Processing, then processor effects, then Completed/result, then dependency/instance reconciliation. These are separate operations despite a comment claiming a single transaction. Fatal task save precedes parent pause and consumer failure effects. Describe successfully saved states without claiming cross-store atomicity or all-or-nothing completion.
5. **Keep status dimensions separate.** Enums persist as smallint; DTOs use enum names. The worker does not set a Pending parent Processing when starting a task. Reconciliation keeps Paused unchanged and otherwise derives Completed/Failed only without active tasks. Selection has no parent-status filter and reload only rechecks future scheduling, not task status. Do not invent a global pause gate, terminal immutability or cancellation guarantee.
6. **Bound automatic retry claims.** The caught exception and remaining retry allowance control retry. Explicit TransientWorkflowException, AiExceptionHandler predicates and Is429Exception are the actual boundaries; FatalWorkflowException is not a precedence override against matching message signals. Defaults bind from WorkflowRetry. Later retries choose a random minute in today's UTC window only before its start, otherwise tomorrow's, even when already inside today's window. Invalid configuration is unqualified. Rate-limit sibling staggering is a secondary best-effort save across Pending tasks of the same processor.
7. **Read persisted facts.** WorkflowController.GetInstance includes all tasks and uses WorkflowInstanceDetailDto; SuccessWrappingFilter supplies `data`. RecipeImportController uses the same DTO without wrapping after member/recipe access checks. This difference is a consumer boundary, not two status models. Task `result` exists in implementation but is absent from the approved task DTO schema; keep result representation out of normative reads pending contract reconciliation.

## Risks / Trade-offs

- [Missing-definition contract disagreement] → Repository throws FileNotFoundException; controller catches KeyNotFoundException; middleware defaults to 500 while OpenAPI documents 404. Specify internal rejection only and retain U89 without choosing an HTTP contract change.
- [Weak concurrency evidence] → PostgreSQL SKIP LOCKED selection has no explicit claim transaction spanning selection and Processing save; exceptions fall back to ordinary selection. Semaphores are local to one worker. Tests do not establish exclusive dispatch, distributed limits or exactly-once effects; retain U90.
- [Partial progression and stale state] → Completion saves and reconciliation can fail separately, and concurrent contexts can observe different snapshots. No eventual completion or atomic dependency promotion guarantee; retain U91.
- [Broad exception heuristics] → Some messages match transient/rate-limit classification without typed provider status; cancellation is also caught. Record exact predicates and withhold a universal fatal/timeout taxonomy; retain U92.
- [Persistence/consumer effects can fail separately] → Retry save failure can leave Processing; fatal task save failure prevents pause; parent pause failure leaves mixed states; report/event effects have separate catches. Do not promise recovery or delivery; retain U93.
- [Status examples and substitutions] → OpenAPI examples show dependency UUIDs though implementation uses task names; factory creates Processing instances and one synthetic task, bypassing real YAML/worker behavior. Source-supported status reads and assertion scope remain separate; retain U94.

## Migration Plan

Documentation extraction only: create proposal, delta, design and extraction tasks; update plan evidence/mapping; run selected and all-item strict validation plus explicit six-path documentation verification; stop for human review. No deployment, data migration or rollback procedure applies. Any later promotion requires separate user authorization.

## Open Questions

Deferrable qualification only: real PostgreSQL multi-worker claiming, completion races, invalid retry/throttle configuration and interrupted saves have not been executed. Contract disagreements U89/U94 need a separately authorized contract decision before broader normative claims; they do not block this draft's narrower supported rules. No unresolved user decision is needed to draft those rules.
