# Model routing — Tasks

**Derived from:** [requirements.md](requirements.md) and [design.md](design.md).
**Status:** Proposed implementation backlog. No tasks executed. Increment 1 decisions are captured; select a task explicitly before implementation.

## Execution rules

All increment 1 tasks are required, sequential and test-first. Begin a selected task with `task agent:begin -- <task-id>`; read only its requirements/design sections, affected source and applicable shared guidance. Write meaningful failing tests before logic, then pass them. Preserve unrelated work. At completion run `task agent:prepare`, review `task agent:session:status` and the actual delta, then `task agent:finish`. Record actual check status and tested identity; do not mark a task done solely because code exists.

For each task below, targeted tests use `dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --filter FullyQualifiedName~ModelRouting` for new routing tests, plus the named affected existing suites. `task test:api` is the broad API check; the harness selects any additional applicable application checks. New test namespaces must make the focused filter select actual tests. No live provider calls in ordinary automated tests. Any necessary API/schema change exceeds this design and blocks dependent implementation until revised and approved.

## Increment 1 — Gemini chat

### [ ] MR-T1 — Prove configured routing on an extraction path (required)

- Requirements: MR-R1–MR-R4, MR-R7.
- Dependency: reviewed increment 1 spec and explicit task selection.
- Outcome: ExtractRecipe resolves a workload-bound client from real DI and sends its request to the configured Gemini target; absent routing config retains the legacy target. Other workloads retain their existing registration until MR-T3.
- Design: Configuration; Binding and client lifetime; integration map.
- Authorized files/effects: proposed Infrastructure/ModelRouting folder, Program.cs, api/appsettings.json, new ModelRouting tests and focused RecipeAgent/DI tests. No workflow scheduling or provider expansion.
- Required context: Program.cs AI and processor registrations, RecipeAgent, DemoModeChatClient, existing RecipeAgentPromptSelectionTests, requirements/design.
- Red assertions: invalid config dispatches zero calls; absent vs incomplete configuration differ; missing credentials give safe unavailability; primary target receives image/text content and options; simultaneous bound calls do not mutate each other; demo blocks dispatch. Validate every explicit route even though migration is staged.
- Checks: focused ModelRouting tests and RecipeAgentPromptSelectionTests; required harness checks. Tests must verify actual registered client usage, not merely descriptor construction.
- Stop: no fallback engine, no new HTTP endpoints, no live calls. Do not activate opt-in routing in release defaults before the completed integration slice.

### [ ] MR-T2 — Add credential-aware bounded fallback (required)

- Requirements: MR-R2, MR-R4–MR-R7.
- Dependency: MR-T1.
- Outcome: extraction can recover from target A failure using target B with the same model and a different key.
- Design: Dispatch state machine; client lifetime; diagnostics.
- Authorized files/effects: ModelRouting implementation/tests and only the DI adjustments required by that seam.
- Required context: MR-T1 artifacts, installed SDK transport/options API, existing demo guard.
- Red assertions: exact A→B credential selection; success stops traversal; auth and transient failures advance; invalid request, refusal and malformed successful response do not; capability skips; all-auth vs mixed exhaustion; caller cancellation vs attempt timeout vs overall deadline; SDK retry count zero; each target at most once; no options mutation; safe disposal; no secret/raw body in exception graphs or logs. Include controlled HTTP transport tests, not just mocked adapter outcomes.
- Checks: focused ModelRouting tests, including deterministic time/parallel tests; required harness checks.
- Stop: no health polling, cross-call circuits, same-target retries, streaming or tool support. If the installed transport cannot classify an error reliably, keep it terminal and record the qualification gap.

### [ ] MR-T3 — Migrate all chat workloads and reconcile workflow errors (required)

- Requirements: MR-R1, MR-R3, MR-R5–MR-R7.
- Dependency: MR-T2.
- Outcome: all seven chat workloads have explicit bindings; exhausted routes preserve processor behavior and drive existing retry/stagger policy correctly.
- Design: Integration map; binding; exhaustion and workflow mapping.
- Authorized files/effects: Program.cs, affected chat agents/processors where binding requires it, Services/Ai/AiExceptionHandler.cs, Services/WorkflowWorker.cs, ModelRouting and affected Services/Integration tests. Preserve embedding/hero implementations, API, schema and PWA.
- Required context: actual processor catches and persistence, WorkflowWorker retry branch, AiExceptionHandler, WorkflowRetryOptions, WorkflowWorkerTests, WorkflowProcessorTests, WebAcquisitionAgentTests, CategorizeIngredientsProcessorTests and relevant integration fixtures.
- Red assertions: each DI registration resolves the intended workload; extraction fallback persists one successful result; WebAcquisition does not re-fetch HTML because of inference fallback; transient exhaustion reschedules with existing limits; rate-limit exhaustion staggers; auth-only/invalid-request exhaustion does not reschedule through the router path; categorization soft failures remain intact; cancellation is not marked temporary by routing; demo sends zero chat calls; embedding and hero registrations/config remain independent.
- Checks: focused new and affected tests, `task test:api`, harness checks; record real-database workflow transition evidence separately from fake-client evidence.
- Stop: no unrelated cleanup of existing failure handling. If old catches or public diagnostics prevent these semantics, revise the affected design before changing the contract.

### [ ] MR-T4 — Document, qualify and record increment 1 readiness (required)

- Requirements: MR-R1–MR-R7.
- Dependency: MR-T3.
- Outcome: operators can configure two Gemini credentials safely, migrate or roll back by removing the opt-in section and restarting, and understand actual qualification limits.
- Design: Configuration; diagnostics, compatibility and validation.
- Authorized files/effects: api/appsettings.json, docker/.env.example, release-template/synology/.env.example, this spec's evidence and focused configuration/diagnostic tests. Deployment manifests may be changed only if a selected deployment needs explicit environment forwarding and that bounded change is reviewed first. No deployment or real secrets in repository files.
- Required context: final routing configuration and actual container secret/environment injection path; affected deployment examples; completed test evidence.
- Assertions/checks: examples resolve both secret references using synthetic keys; restart semantics, legacy rollback and output-limit compatibility; sanitized logs/exceptions; `task test:api` and harness checks. Perform a separately authorized live Gemini smoke check with operator-selected models/credentials and finite call budget. Record adapter, model, config identity and observed capability results without secrets.
- Stop: unavailable live credentials/budget leave qualification not-run/blocked; do not mark readiness complete using mock evidence. Do not spend quota or deploy without explicit authorization.

## Later increments — planned, not increment 1 gates

### [ ] MR-T5 — OpenAI chat support (deferred; required only when increment 2 is selected)

MR-R8 and MR-R1–MR-R7 invariants. Depends on stable increment 1 policy. First revise design/tasks with verified SDK/provider behavior, exact adapter/test paths, capability constraints, error fixtures and bounded live qualification. Limit future effects to provider construction/normalization, configuration examples and tests; any public interface change requires separate review. Do not implement a stub now.

### [ ] MR-T6 — Claude chat support (deferred; required only when increment 3 is selected)

MR-R8 and MR-R1–MR-R7 invariants. Depends on stable increment 1 policy, not on an OpenAI adapter. First choose and qualify the transport against installed abstractions and current official documentation; then specify exact file ownership, fixtures, message/image/output mapping, error normalization and live checks. No speculative native SDK package or placeholder now.

## Traceability

| Requirement | Design owner | Tasks / decisive evidence |
|---|---|---|
| MR-R1 | Configuration and binding | T1/T3, real DI workload mapping and concurrency |
| MR-R2 | Client identity and dispatch | T1/T2/T4, recorded two-key fake transport and separate live evidence |
| MR-R3 | Configuration and migration | T1/T3/T4, validation, legacy and rollback checks |
| MR-R4 | Eligibility and state machine | T1/T2/T3, image/options preservation and zero unsupported dispatch |
| MR-R5 | State machine | T2/T3, exact attempts and deterministic cancellation/deadlines |
| MR-R6 | Integration and typed errors | T3, processor effects and database retry transitions |
| MR-R7 | Diagnostics and isolation | T1–T4, demo, privacy, disposal and preservation assertions |
| MR-R8 | Progressive extensions | T5/T6, separately detailed and qualified provider increments |

## Specification evidence

2026-09-29: source inspection established the current Gemini chat DI path, separate hero/embedding paths, workflow retry/stagger branch and categorization soft-failure boundaries. This is design evidence, not runtime qualification. Legacy phase documents are superseded historical context, not implementation authority. Application tests and live provider checks have not been run for this documentation-only redesign. Documentation validation is reported with the task-session completion result.
