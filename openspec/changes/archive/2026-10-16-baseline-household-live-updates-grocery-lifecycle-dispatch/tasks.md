# Tasks

Documentation extraction only. Full scenario mappings and evidence are in the capability plan, BSL-household-live-updates-010/011. Source-supported is separate from runtime-verified.

## 1. Extract grocery and lifecycle handoffs

- [x] 1.1 Trace requirements 1–2 from supported grocery save/recompute boundaries through actual serialized dictionary, process-local transport, hook gate and planner map replacement. Acceptance: BSL-010/011 includes actual assertion scope, check-map versus line-item distinction and U100 retention.
- [x] 1.2 Trace requirements 3–4 from ready/failure publication through parsing, capture matching, context queue and ready set to observable journey consumers. Acceptance: BSL-010 records missing/already-ready/indexing/identity/caught-failure limits; accepted capture/background owner requirements are referenced, without duplicating UI/retry policy.
- [x] 1.3 Produce coherent proposal/design/ADDED delta and all scenario mappings. Acceptance: U95–U101/A34 and HLU qualifications retained, main specs and unrelated changes preserved. Red/green behavior tests, API/client synchronization, migration and deployment are not-applicable.

## 2. Validate integrated documentation

- [x] 2.1 Run `openspec validate baseline-household-live-updates-grocery-lifecycle-dispatch --strict`, then final `openspec validate --all --strict`. Acceptance: strict results, full inventory dispositions and scenario evidence mappings recorded.
- [x] 2.2 Run `task verify -- <all task-owned changed paths>` after final edits, including this change's five files, capability plan, index and other authorized live-update drafts. Acceptance: inspect `.task/agent-finish/last-run.json`, review final diff/preservation and report exact result classes/content identity.

## Workflow follow-up

- Human review and separately selected promotion are next; no application apply or archive. Runtime/unit/API/browser/network/database/model qualification remains not-run under A34. Inspected assertions: ScheduleIntegrationTests mocked ready/grocery calls, GroceryRecomputeServiceTests mock publisher, WorkflowWorkerTests InMemory/capturing publisher, useScheduleStream.test.ts mocked EventSource/stores, RecipeFailureBanner.test.ts journey doubles. Publisher tests inspect selected MemoryStream frames and omit failed/grocery frame cases. Contract specs/openapi.yaml, generated models and browser mock owners fixtures.ts/mock-api.ts remain unchanged.

Verification follow-up: selected strict validation, all-item strict validation (50/50), complete scenario mapping, unique requirement headers, source/preservation review and first 17-path documentation/spec/content verification passed. Final semantic/checkbox/evidence edits require a final explicit-path verification repeat; exact outcome/content identity belongs to the final response/current harness record. Checked extraction tasks are documentation work only; human acceptance and promotion remain outstanding.
