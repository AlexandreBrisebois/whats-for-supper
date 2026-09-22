# SFD-5 search semantics evidence

> **Archived — historical reference only.** Tasks, status, commands, and instructions below are historical, not an active work queue or current authority. See [archive guidance](../README.md).

Scope: user-selected SFD-5 only, requested 2026-09-19. This implements the
missing behavior established by SFD-1 using the approved SFD-2 contract. No
SFD-5a/5b browse or rediscovery work, Discovery change, commit, or deployment
is included.

## Starting state and implementation

- Starting HEAD: `31e5d4a718ab78575eaa72451545c12d1a0a2f59`; complete dirty
  worktree snapshot: `/private/tmp/sfd5-baseline-20260919T215023`.
- `search-fix` was inspected and contains no additional applicable behavior.
- `RecipeSearchPredicate` now normalizes non-blank Cuisine and Meal Type
  selections, applies OR inside each group and AND across groups before
  candidate limits in both EF eligibility and PostgreSQL lexical/vector SQL.
- `RecipeSearchService` derives semantic retrieval text from the original
  query plus normalized `preferences.concepts`; typed lexical retrieval keeps
  the original query. Concept-only search attempts semantic retrieval first,
  falls back to non-blank concept lexical text only when semantics are
  disabled, unavailable, time out, or fail, and keeps a successful semantic
  zero-match empty. The request DTO's query is never changed.
- Main remains a semantic preference. `includedIngredients` and unrelated
  declared filters were not implemented. Existing continuation fingerprinting
  continues to hash preferences; current hard-filter eligibility is reapplied
  during continuations.

## Focused verification

- Red: the real PostgreSQL `RecipeLexicalSearchPostgresTests` suite initially
  had 15 expected SFD-5 failures and 6 passes.
- Passed after implementation, and again after preparation:

  ```sh
  dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --no-restore \
    --filter 'FullyQualifiedName~RecipeLexicalSearchPostgresTests'
  ```

  with an isolated, uniquely named database per test: 21 passed, 0 failed,
  0 skipped. Coverage includes pre-limit lexical/vector hard predicates,
  typed semantic concepts, disabled/unavailable/timeout/error concept fallback,
  semantic zero match, blank-concept browse, cancellation, and continuation
  eligibility/fingerprint behavior.
- `task agent:reconcile` passed its static route/mock check. `task
  agent:prepare` passed after using the installed .NET 10 runtime for Kiota;
  client generation and formatting completed.
- `task agent:finish` recorded passed documentation, API lint, PWA format,
  PWA typecheck, and PWA unit tests before its content guard detected a runtime
  mutation. A post-run source/untracked hash comparison found no additional
  source delta. Its record remains non-passing and is not treated as a final
  completion qualification.

## Scope review and remaining gaps

Compared with the starting snapshot, SFD-5 changed only
`RecipeSearchPredicate.cs`, `RecipeSearchService.cs`, and the reconciliation
test file comment/coverage. No Discovery source changed. `git diff --check`
passed; all other tracked and untracked worktree changes predate this slice.

The full harness did not produce immutable final evidence: its impact E2E,
full API, contract review, live endpoint drift, and generic database-behavior
entries are not-run after the content guard stopped the run. The focused
PostgreSQL evidence above is real database evidence for this selected behavior,
not a live semantic-provider qualification. No later SFD task is authorized by
this record.
