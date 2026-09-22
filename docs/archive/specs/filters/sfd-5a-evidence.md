# SFD-5a empty-query browse evidence

> **Archived — historical reference only.** Tasks, status, commands, and instructions below are historical, not an active work queue or current authority. See [archive guidance](../README.md).

Scope: SFD-5a only, requested 2026-09-19. This record excludes SFD-5b
rediscovery ranking, Discovery changes, commit, and deployment.

## Starting state

- Starting HEAD: `31e5d4a718ab78575eaa72451545c12d1a0a2f59`.
- Full staged/unstaged patch and untracked-file snapshot were retained at
  `/private/tmp/sfd5a-baseline-20260919T000000` before this task's first edit.
- The starting worktree was already dirty from preceding filters work. This
  task attributes only later SFD-5a edits documented here.

## Baseline measurements (before implementation)

Matching live API/database/browser measurements are **blocked**: requests to
`127.0.0.1:5001` and `127.0.0.1:9001` both failed to connect on 2026-09-19;
therefore no representative dataset, API sample count/p50/p95, database query
cost/payload, or visible rapid-scroll wait can be truthfully recorded.

The source baseline was: 12 initial and 12 continuation items, a 600px observer
bottom margin, full `Recipe` entity materialization in browse paths, and Quick
filtering after the query limit. This is implementation inspection, not live
performance evidence.

## SFD-5a change and tuning

- Browse now applies Quick eligibility in the database before ordering, limits,
  and cursor calculation, while retaining the established duration formats
  (ISO `PT...` and minute strings up to 30 minutes). The initial and continued
  queries project only id, card fields, and cursor fields; they do not load
  ingredients, raw metadata, or dietary JSON.
- Initial browse remains 12. Browse continuations use 24; ranked continuations
  remain 12. The observer margin is 400px, selected as the conservative
  earlier-than-600px value while live latency is unavailable. It is below the
  API maximum of 50 and does not preload the library.
- Continuations are single-flight per request generation. New searches and
  initial reloads invalidate stale continuation success, error, and completion
  handling; appending keeps existing cards in place and retry/expiry UI stays
  unchanged.

## Verification and repeated measurements

- **Passed (mocked PWA behavior):** `npx vitest run
  'src/app/(app)/recipes/page.test.tsx'` — 49 tests. This includes a 24-item
  browse continuation/400px observer assertion, repeated observer callbacks
  issuing one request, and an obsolete initial browse response not replacing a
  newer search. `npm run typecheck` also passed before preparation.
- **Passed (static):** `task agent:reconcile` reported route/mock coverage;
  it explicitly does not test live API or database behavior.
- **Blocked (PostgreSQL):** the new sparse Quick traversal test compiles but
  the available local database credentials were rejected (`28P01`), so no
  real PostgreSQL pass or query plan can be claimed.
- **Blocked (after measurements):** the same API endpoints remained
  unreachable, so matching-condition API/database p50/p95 samples, retrieved
  payload counts, and visible rapid-scroll waits are unavailable (sample count
  0). No live performance improvement is claimed from the projection or mocks.
