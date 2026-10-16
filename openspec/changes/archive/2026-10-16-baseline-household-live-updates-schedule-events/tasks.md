# Tasks

Documentation extraction only. Checked tasks mean delivered documentation/source inspection, never runtime acceptance. The capability plan maps every scenario to BSL-household-live-updates-007/008/011.

## 1. Extract the bounded schedule slice

- [x] 1.1 Recheck root/store, main requirements, changes, branch/HEAD and dirty/index/source identities. Acceptance: capability-plan checkpoint and private before-image preserve all pre-existing work and absent navigation spec.
- [x] 1.2 Trace requirements 1–3 through ScheduleController/Service, publisher/manager, raw frames and slot/Today consumers. Acceptance: BSL-007/008 includes actual publication calls, payload keys, date filtering, inspected assertions and limitations.
- [x] 1.3 Trace requirements 4–5 through week handler, echo confirmation and deferred snapshot release. Acceptance: BSL-008/011 and full scenario mapping distinguish ID exclusion, sequence confirmation and independent Today application; preserve main 15/38.

## 2. Reconcile and validate documentation

- [x] 2.1 Generate coherent proposal/design/ADDED delta and extraction tasks. Acceptance: no duplicate main requirement or domain-policy definition; U95–U101/A34 and HLU qualifications retained. Red/green behavior tests, contract/client synchronization and migrations are not-applicable.
- [x] 2.2 Validate this change with `openspec validate baseline-household-live-updates-schedule-events --strict`, then final `openspec validate --all --strict`. Acceptance: strict results, complete mapping and scope/preservation review recorded in the capability plan/final response.
- [x] 2.3 Run `task verify -- <all task-owned changed paths>` after final documentation edits, including this change's five files, capability plan, index and successive authorized live-update drafts. Acceptance: inspect `.task/agent-finish/last-run.json` and report exact passed/failed/blocked/not-run/not-applicable outcomes and content identity.

## Workflow follow-up

- Human review, acceptance and explicitly selected promotion remain next. Do not apply application changes or archive. Runtime/unit/API/browser/network/database/model qualification remains not-run under A34. Inspected tests: SseEventPublisherTests (MemoryStream), ScheduleIntegrationTests/ScheduleServiceTests (EF InMemory/mock publisher), useScheduleStream.test.ts (EventSource/store mocks), weekStore.test.ts/todayStore.test.ts (fabricated store inputs), home-recipe.spec.ts (intercepted finite frames). API schema remains specs/openapi.yaml; generated models and mock-api.ts/fixtures.ts remain untouched.

Verification follow-up: selected strict validation, all-item strict validation (50/50), complete scenario mapping, unique requirement headers, source/preservation review and first 17-path documentation/spec/content verification passed. Final semantic/checkbox/evidence edits require a final explicit-path verification repeat; exact outcome/content identity belongs to the final response/current harness record. Checked extraction tasks are documentation work only; human acceptance and promotion remain outstanding.
