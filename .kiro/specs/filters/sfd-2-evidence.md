# SFD-2 contract/configuration evidence

Scope: user-selected SFD-2, requested 2026-09-19. The task-file's
specification-only notice is explicitly overridden only for this selected task.
No endpoint, materializer, ranking, UI, generated client, mock, SFD-3 work,
commit, or deployment is authorized or performed.

## Starting baseline

- Branch `main`, HEAD `31e5d4a718ab78575eaa72451545c12d1a0a2f59`.
- Pre-existing tracked edits: `HANDOVER.md`, the two named SFD-1 integration
  test files, and `api/src/RestClient/07-workflow.rest`.
- Pre-existing untracked paths: `.kiro/specs/filters/` and
  `api/src/RecipeApi.Tests/Integration/RecipeLexicalSearchPostgresTests.Filters.cs`.
- Content snapshot (including pre-existing untracked content, retained outside
  repository logs): `/private/tmp/wfs-sfd2-baseline-20260919`.

## SFD-1 findings used

`preferences.concepts` already exists in OpenAPI and the request DTO, and is in
the continuation fingerprint. Current search serving does not yet honor it;
SFD-5 owns that red behavior. This slice documents the concept-only contract
without implementing it.

## Proposed output and stop

The exact contract, fallback, Main configuration validation, fixed Meal Types,
and Search-only rediscovery policy are in `sfd-2-proposal.md`. API DTO/options
and focused contract/configuration tests are prepared, but the route has no
controller action and the client was deliberately not regenerated.

Approval checkpoint: the user approved the proposed public shape and the 28-day
Search rediscovery default on 2026-09-19. Dependent implementation and
`task gen:client` still require their own selected authorization.

## Validation

- Passed: `dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --no-restore
  --filter FullyQualifiedName~RecipeSearchFilterOptionsTests --logger
  "console;verbosity=minimal"` — 8 passed, 0 failed, 0 skipped.
- Passed: `npm run test:unit -- --run src/lib/api/filter-discovery-contract.test.ts`
  from `pwa` — 2 passed, 0 failed.
- Passed: Ruby YAML parse plus assertion that the GET 200 response references
  `RecipeSearchFilterDiscoveryDto`; `git diff --check` also passed.
- Blocked/not run by design: generated-client diff/check and generated-model test;
  client regeneration is deferred until public-contract approval.
- Not applicable in SFD-2: live endpoint parity, database/materializer/ranking,
  PWA UI/E2E, and Discovery regressions. No endpoint or those behaviors exist in
  this selected slice.

## Scope review

Compared with `/private/tmp/wfs-sfd2-baseline-20260919`, SFD-2 added only the
filter-discovery OpenAPI schemas/operation and concept-only description,
configuration registration/options, pure response/fallback DTOs, focused tests,
and this SFD-2 proposal/evidence. Pre-existing SFD-1 files, `HANDOVER.md`, and
the workflow REST-client edit remain preserved; no generated files changed.
