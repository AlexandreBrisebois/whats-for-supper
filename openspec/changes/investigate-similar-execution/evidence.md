# Evidence and qualification

Base main: `2a5ff0b62484993c14d551aac6e035cf72caec29`. New branch `investigate/271-ingredient-execution`. API/scorer/indexing/search UI unchanged. Runtime correction is only Planner's `open` → `similarTo` navigation parameter.

## Test-first navigation slice

- Red, before production edit: `task test:unit -- 'src/app/(app)/planner/page.test.tsx'`: 32 passed, one intended failure. Expected `/recipes?similarTo=11111111-1111-1111-1111-111111111111`, actual `/recipes?open=...`.
- Red, before production edit: `task test:e2e -- planner.spec.ts -g 'Find Similar from Planner'`: expected Similar URL, actual `open=` URL through real Planner/detail/route. Initial browser attempt was blocked by missing pinned Chromium, not a behavioral red; after installing the pinned browser the intended failure was observed.
- Green: `task test:unit -- 'src/app/(app)/planner/page.test.tsx' 'src/app/(app)/recipes/page.test.tsx'`: 74 passed.
- Green: `task test:e2e -- planner.spec.ts recipes.spec.ts -g 'Find Similar'`: two passed, including existing Search detail flow. New test asserts accessible action, empty query/source ID in POST search, no assignment target and source detail closed. Browser uses mocked API responses, not live ranking. Existing image-certificate/SSE fixture warnings occurred; neither changed the assertions.
- `task test:api -- --filter FullyQualifiedName~Similar`: 19 passed, six PostgreSQL tests skipped without prerequisite. Includes real controller/service in-memory tests, source facts/family signal isolation and retained planner demotion, plus pure scoring/baseline tests. Does not establish relational retrieval by itself.
- First focused PostgreSQL run executed all six existing FindSimilar cases successfully but the runner invalidated the run because source changed during verification. Record `.task/database-tests/runs/eea1027955c448d88c5c3bf48f928d47/result.json` is **failed**, not final success; it must be repeated on frozen source. No guard was weakened.

## Evaluation

`evaluation.md` contains exact synthetic inputs/program and actual scorer results. A temporary console ProjectReference used the unchanged API implementation. Raw semantic 0/0.6 are controlled inputs, not external-model scores. No household or live relevance validation. Suitability, negative-only collections and retrieval recall limitations are marked explicitly instead of scored as passing cases.

## Tooling and scope review

Installed pinned Node 26.12.0, npm 11.21.1, OpenSpec 1.14.3, .NET SDK 11.0.100-rc.2.26504.105 and lockfile PWA packages in local disposable environment. Original cached tool versions were older. Python virtual environment uses repository requirements. .NET initially failed because its per-user shared-memory directory was read-only; creating that directory through approved execution permissions and granting that path for tests resolved it. No repository toolchain pins changed.

Review: the one-line production diff follows an existing navigation convention and preserves view-only Planner semantics. The unit mock now exposes the existing detail callback; the browser test exercises real navigation/request handling. No Search page, ordinary Search/Browse/Discovery/Quick Find scoring, API contract, generated client, database schema, rotation, deployment or unrelated PR files changed. Contract generation is not applicable to this correction; harness static/client checks still apply. Investigation claims were checked against source, including correcting planner demotion to the actual -10.0 constant during review.

Initial full harness `.task/agent-finish/runs/715016b28b394bf095962f534166acce.json` was failed: its simple Markdown parser could not resolve two parenthesized route links (corrected to pinned source URLs), then first full Vitest populated `.vitest-cache` and invalidated runtime identity. All 833 units, lint, format, types and strict OpenSpec passed within that run; later browser/API/contracts were not run. This is not a green final result. A second unchanged full unit run passed 833 tests; SHA-256 inventory of all 294 `.vitest-cache` files was identical before/after, with no additions/removals. Fingerprint guards remain unchanged.

## Final checks

Frozen implementation harness `.task/agent-finish/runs/e0c9ad5b0ba246a8858f4e23779fd566.json` passed all selected checks with stable content: documentation, 34 strict OpenSpec items, lint, format, types, 833 units, 42 impact-selected browser cases, 987 API tests (93 conditional/manual skips), static contract checks and Kiota client parity. No checks were weakened. The full CI browser suite remains broader than these 42 selected local cases.

Frozen-source focused PostgreSQL repeat `.task/database-tests/runs/91f842f37e1644b6a9e25dc60effe9ea/result.json` passed all six FindSimilar tests with zero skips; the runner removed its temporary database container. These tests use synthetic vectors/documents, not household embeddings.

This evidence/task/handoff update is documentation after the passing implementation identity. Final documentation verification and immutable-head CI are recorded on the draft PR; the earlier implementation record is not relabeled as testing a later documentation digest. Task 1.3 remains pending morning decisions/household judgments; no scoring implementation or quality claim is approved by these results. Retain this OpenSpec change active and issue #271 open.
