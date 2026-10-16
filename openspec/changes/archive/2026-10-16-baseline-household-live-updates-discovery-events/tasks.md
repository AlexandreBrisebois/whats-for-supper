# Tasks

Documentation extraction only. Full requirement/scenario mapping is in the capability plan, BSL-household-live-updates-009/011. Checkboxes do not establish runtime behavior.

## 1. Extract discovery signal consequences

- [x] 1.1 Reconcile accepted main and existing changes, then trace requirements 1–3 and 6 through vote publication, named frames, hook and real week/Discovery stores. Acceptance: source-backed fan-out, strict nested-week gate and pending-slot reconciliation recorded; owner policy stays outside this delta.
- [x] 1.2 Trace requirements 4–5 through supported ScheduleService invalidation branches, publisher/manager, hook, generation stores and consuming effects. Acceptance: global/per-week versions, Quick Find gates and attempted refresh are distinguished from refreshed results; BSL-009/011 includes actual assertions and substitutions.
- [x] 1.3 Produce coherent proposal/design/ADDED delta with complete mappings and exclusions. Acceptance: U95–U101/A34 and HLU qualifications retained; discovery_nudge and domain ranking/eligibility claims excluded. Test-first behavior cycle, API/client synchronization and migrations are not-applicable.

## 2. Validate integrated documentation

- [x] 2.1 Run `openspec validate baseline-household-live-updates-discovery-events --strict`, then final `openspec validate --all --strict`. Acceptance: strict results, all scenarios mapped and no conflicting main/new delta requirement names.
- [x] 2.2 Run `task verify -- <all task-owned changed paths>` after final edits, including this change's five files, capability plan, index and the other authorized live-update drafts. Acceptance: inspect `.task/agent-finish/last-run.json`, complete preservation/scope review and report outcome classes and identity.

## Workflow follow-up

- Human review and separately selected promotion remain next, with no application apply or archive. Unit/API/browser/network/database/model qualification is not-run under A34. Inspected assertions: ScheduleIntegrationTests vote/threshold/invalidation mock calls; SseEventPublisherTests in-memory frames; useScheduleStream.test.ts mocked dispatch; weekStore.test.ts/discoveryStore.test.ts fabricated inputs; QuickFindModal.test.ts mocked generation/fetch behavior. Contract specs/openapi.yaml, generated models, fixtures.ts and mock-api.ts remain unchanged. Search and Discovery policy extraction is outside this change.

Verification follow-up: selected strict validation, all-item strict validation (50/50), complete scenario mapping, unique requirement headers, source/preservation review and first 17-path documentation/spec/content verification passed. Final semantic/checkbox/evidence edits require a final explicit-path verification repeat; exact outcome/content identity belongs to the final response/current harness record. Checked extraction tasks are documentation work only; human acceptance and promotion remain outstanding.
