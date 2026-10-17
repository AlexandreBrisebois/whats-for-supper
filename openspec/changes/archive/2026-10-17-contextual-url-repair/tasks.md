# Tasks

## 1. Contextual URL launch and recovery

**Outcome and scenarios:** Use saved provenance for contextual URL repair, including launch, feedback reuse/change, failed launch retry and manual/image preservation.
**Owners and boundaries:** Report service, real packaged workflow repository/orchestrator, persisted report/instance/tasks; POST import-report consumers and stateful browser fixture.
**Dependencies and prerequisites:** Pinned tools, isolated test DB, packaged YAML, Docker for relational qualification. No provider execution is needed for launch acceptance.
**Acceptance boundary:** Real service/orchestrator persistence plus existing controller integration; mocked browser transport is separately identified.

- [x] 1.1 Add packaged-definition regression tests and observe missing-URL failure with `task test:api -- --filter FullyQualifiedName~ContextualUrlRepair` before changing production logic.
- [x] 1.2 Supply saved URL in contextual parameters, clarify `specs/openapi.yaml` POST description, regenerate/check Kiota, and pass focused API checks including launch/reuse/terminal change/failure retry/manual/image cases; preserve wire shapes and existing stateful POST mock semantics.
- [x] 1.3 Add browser saved-report launch-failure/retry acceptance in `recipe-import-reporting.spec.ts`, run that suite and existing report HTTP integration, and run repository relational qualification. Assert retained input, retry outcome and exactly one accepted attempt at the service boundary; no claim of provider completion.

## 2. Final integration and verification

- [x] 2.1 Record actual evidence, run `task prepare -- <reviewed paths>`, review the complete diff, and run `task verify -- <reviewed paths>` with all application/contract/mock/spec inputs; reconcile required acceptance and record the invocation evidence.

## Workflow follow-up

Red evidence: focused command above failed 2 URL launch/recovery assertions and passed 1 image/manual preservation test before the parameter fix (`/tmp/wfs-003-red.log`). Real orchestrator and packaged YAML used with isolated EF in-memory persistence; this does not establish relational behavior.

- Sync affected main spec, archive this change after acceptance, remove completed WFS-BL-003 from the active backlog and update its references.
- Validate the final OpenSpec/docs state, then publish through the GitHub connector to the existing authorized branch and draft PR.

Green evidence: 34 focused API tests passed; 6 PostgreSQL tests passed with zero skips in `.task/database-tests/runs/db6d836cd0bf46bc96d6d05d706e6127/result.json`. Reporting browser suite 10 passed; tightened alert assertion passed in focused rerun after scoping to the saved Review issue dialog. Kiota generation and check passed. Final harness remains pending.

Final combined harness: `.task/agent-finish/runs/0f943ace68114fba8f878ecc0f3a5a58.json` passed all applicable checks with stable content: 824 unit tests, 937 API tests (62 opt-in skips), 267 browser tests (13 existing skips), contracts/Kiota, live endpoint parity and 65 PostgreSQL tests with zero skips (`.task/database-tests/runs/a2b008734b5f4548965c83748831a843/result.json`). The earlier run `bcb4652b1eb14125af19c7fcc3bdf78d.json` failed fixture formatting/type cast and input stability after unit execution; those were corrected before the passing run. External providers, production/native-device behavior and universal event delivery are not qualified. Subsequent archival/docs edits receive separate documentation verification.
