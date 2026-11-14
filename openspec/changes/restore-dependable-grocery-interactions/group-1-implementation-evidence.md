## Fresh-context continuation — 2026-11-07 (latest checkpoint)

This section supersedes earlier unresolved absent-list/source-alias/unit-decision passages below. Group 1 remains incomplete; all seven task boxes remain unchecked. No spec sync/archive, commit/stage/push, CI action, deployment, production test, DV/port-3000 change or worker/session launch occurred.

Implemented in this continuation:
- Absent weekly plan returns nullable `groceryListVersion`, documented in OpenAPI and regenerated via `task gen:client`. Empty absent-list snapshots clear the prior week's view but cannot overwrite an already versioned list.
- Approved cup/tsp/tbsp families normalize English/French aliases, preserving quantities without metric or cross-family conversion. Shared contract, C47, grocery delta and design now state Alex's settled decision. Historical 240/15/5 expectations and related property-test oracles are superseded.
- Coherently and uniquely bound source fractions survive same-unit aliases and bounded preparation qualifiers. Unsupported/conflicting prose falls back to recorded decimal tokens without guessing a fraction or reading stale source content.
- Stream/store fixtures use row IDs and list versions, test rejection of older snapshots and retain existing calendar guards.
- Real live test now covers three water unit rows plus same-name extra, two clients, own-connection echo suppression, ordered list versions, persisted reread and rejection of a delayed older snapshot. Its PWA runs from an isolated temporary source copy excluding dotenv files, with linked existing dependencies and private ports. The fixture removes that copy and stops its owned server.

Observed red/green:
- `task test:unit -- src/store/groceryRows.test.ts`: initial 4 pass/1 intended fail; after fix 5 pass.
- API filter `LegacyGroceryQuantityTests|GetScheduleAsync_ReturnsNullGroceryState_WhenNoWeeklyPlan`: initial 23 pass/3 intended fails. Added alias/qualifier coverage failed as expected before source parsing changes. Culinary alias regression initially 0 pass/3 intended fails (five rows instead of two).
- Final focused API command in `api-final.log`: 166 passed, zero skipped after formatting. Covers all ScheduleServiceTests, LegacyGroceryQuantityTests, culinary aliases, original cup quantities, P6/P7 unit properties and coherent-source tests.
- Six focused frontend owners: 254 passed after formatting (`unit-final.log`). Earlier expanded fixture run had 19 failures/235 passes, preserved in tool history and `unit-expanded.log`; refreshed fixtures went green.
- `task test:database -- --filter FullyQualifiedName~GroceryCheckConcurrencyPostgresTests`: 20 pass/zero skips. Record `.task/database-tests/runs/7fff2bcfc5dc444e8f5ce4cc77f4c2f9/result.json`; disposable database, SDK container and network report removed. This record identifies its own source snapshot, not a final full-diff gate.
- `WFS_CALENDAR_LIVE=1 task test:api -- --filter FullyQualifiedName~LiveBrowser_IndependentWaterRowsConvergeAndRejectOlderSnapshot` with disposable PostgreSQL: one live method passed/zero skips (`live-fourth.log`, `live-resources.json`). It ran the real two-client browser and endpoint drift inside the method. Earlier runs failed stale event-count and hard-coded-version fixture assertions; logs/screenshots are preserved. Passing live logs also contain SSE disconnect/response-started error logging; that path has not been diagnosed, so no error-free runtime claim is made.
- Full `grocery.spec.ts` on owned isolated dev server 3117: 22 passed/zero retries (`browser.log`). This is development-runtime mocked qualification, not production-build parity. Server session 12016 stopped with Ctrl-C, exit 0; listener check found none.
- `task gen:client` and `task gen:client:check`: passed through supported escalation after sandbox generation timeout (`client-check.log`). No generated file hand edits.
- `task typecheck`, scoped ESLint, scoped C# formatter, Prettier and `git diff --check`: passed. C# formatting and focused API rerun followed the successful live run; live/browser checks identify their earlier source copies.

Remaining acceptance and failures:
- Latest broad `GroceryRecomputeServiceTests|ScheduleServiceTests`: 155 pass/23 fail/zero skips (`api-remaining.log`), improved from 149 pass/29 fail. Remaining failures are all in GroceryRecomputeServiceTests: 9 legacy merge-inheritance cases; name-keyed check/reset/review fixtures; null-as-piece and generic count merge assumptions; serialized equality that now includes opaque IDs. They require reconciliation against the approved behavior plus unfinished group 2 implementation, not weakening the runtime legacy-list fence. Group 1 lifecycle/precision and broader seam review are still required.
- Group 2 retained checked-demand baselines and marker removal, group 3 focus/category acceptance and group 4 integration gates remain undone. Do not treat 22 mocked browser passes as complete group 3 coverage.
- Full unit/API suites, final task prepare/verify, whole task-path generated closure review, production-browser qualification and hosted same-candidate qualification have not run. CI must not be triggered under current scope.

Detailed logs, before-images, protected-path hashes and this session's exact path list: `.task/grocery-continuation-20261107/`. All 26 browser-parity protected files match entry hashes. Checkout remains `recipe-view-redesign`, HEAD `482d44731ab44ec703f70e1252751fc0964bf7f2`, 79 dirty paths (63 modified/16 untracked), nothing staged. The 76 entry paths and all pre-existing spec edits remain preserved. No permission denial remains unresolved; local socket/formatter/generator restrictions used the supported escalation route. The parent arranges any next fresh session; this session must not start another writer.

# Group 1 red-test checkpoint — 2026-11-07

**Latest status:** implementation is in progress. The quantity question was
resolved by the approved source-evidence/shortest-round-trip compatibility policy;
it is not an outstanding product blocker. The row persistence/API path, durable
mutation ledger, PostgreSQL replica coordination, generated client, client version
fence and per-row intent queue are implemented. The last PostgreSQL candidate
passed 20/20 with zero skips (`8c241a9d6a8c4ce8ab7608371695d303`); final-diff
verification is still pending. Core UI/mock/wrapper units passed 98/98, quantity
integrity/binding tests passed 23/23, and grocery-version store tests passed 4/4.
The browser candidate reached 19/21 before a remaining named-key assertion was
corrected; the other failure exposed the existing extra-checkbox Edit-focus race,
whose repair is explicitly deferred to group 3. Repeated/interrupted-action and
late-navigation qualification is underway. Earlier blocked/red sections below
are historical checkpoints, not current access blockers. No task is marked done.


Tasks 1.1–1.2 remain incomplete. This is a blocked implementation checkpoint, not
group 1 acceptance or a completed integration review. The sections below preserve the initial test-only checkpoint; subsequent source
implementation is described in this latest-status note and the final evidence
section when verification finishes. Task checkboxes remain unchanged.

## Checkout and ownership

Starting and final HEAD: `482d44731ab44ec703f70e1252751fc0964bf7f2`, branch
`recipe-view-redesign`. The starting 21 modified specification files plus untracked
`canonical-ingredient-correction/decision-review-evidence.md` matched that evidence
file's 22-path manifest. Those existing changes were preserved. Nothing was staged,
committed, pushed, reset, switched, deployed or sent to CI. No implementation writer
was started. The 26 browser-parity ownership paths remained unmodified by this task.
The older parity outcome remains historical and was not updated or claimed complete.

Task-owned changes:

- `pwa/src/components/planner/GroceryList.test.tsx`: two intended-red tests, with
  three same-label recipe buckets and one independent extra occurrence. One asserts
  a check stored under an opaque ID is read; the other asserts the selected ID is
  written instead of the shared label. Added fixture IDs are deliberately unrelated
  to labels. These are test-only forward-contract fixtures; generated DTOs have not
  yet adopted the row contract.
- `api/src/RecipeApi.Tests/Integration/GroceryCheckConcurrencyPostgresTests.RowIdentity.cs`:
  three PostgreSQL tests for name-only item rejection, name-only bulk rejection and
  an absent-row conflict without a phantom check. Each rereads persisted state in a
  fresh scope. These compile but have not executed.
- This evidence file.

## Observed checks

| Check | Outcome | Evidence / limits |
| --- | --- | --- |
| Baseline `task test:unit -- src/components/planner/GroceryList.test.tsx src/testing/mock-api.test.ts` | Passed | 93 tests across two files, before adding regressions. |
| Same command on final test diff | Intended red | 93 passed, two failed. Opaque checked ID renders zero checked recipe controls; selected-row write uses `Water` instead of its opaque ID. Both failures concern the missing behavior. |
| `task test:database -- --filter FullyQualifiedName~GroceryCheckConcurrencyPostgresTests` | Blocked | Docker daemon socket access denied before any DB/test provisioning. Zero selected tests executed; zero skips does not establish acceptance. Invocation record below predates the added test files and is only environment-blocker evidence. |
| `dotnet build api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --no-restore` | Passed | Zero errors; three existing nullable warnings in other test files. MSBuild fell back from its unavailable server to in-process compilation. This proves compilation, not PostgreSQL behavior. |
| `task typecheck` on final fixture types | Passed | Initial run caught the extra fixture's string/DateOnly mismatch; corrected using Kiota `DateOnly.parse`, then reran successfully. |
| Selected-file ESLint | Passed | `npm exec -- eslint src/components/planner/GroceryList.test.tsx` in `pwa/`. |
| `task prepare -- <two test paths>` | Blocked / nonzero | PWA formatting passed. C# formatter's MSBuild host failed to bind a named pipe with `SocketException (13): Permission denied`, then timed out. No C# formatting success is claimed. |
| `git diff --check` | Passed | Includes the preserved specification diff. |
| Strict selected-change OpenSpec validation | Passed | `/tmp/wfs-browser-parity-tools/node_modules/.bin/openspec validate restore-dependable-grocery-interactions --type change --strict`. |
| `task verify:plan -- <two test paths>` | Passed, selection only | Selected application checks: documentation, lint, PWA formatting/types/units, browser impact, API and contract review. No checks run by this plan. |
| `task test:e2e -- grocery.spec.ts` and real-browser integration | Not run | Port 3000 already belongs to a Docker process, whose purpose/data cannot be established with Docker access denied. No existing runtime was reused or stopped. Required owned browser/API/DB runtime is unprovisioned. |
| Final `task verify`, live parity, client generation/check and full acceptance | Not run | Required database intended-red stage and C# preparation are blocked. Runtime contracts/client have not changed. No whole-slice verification is claimed. |

Database invocation record:
`.task/database-tests/runs/240b47cd29ad48d1afa8036ccb5a9682/result.json`.
Retained build, final unit-red, typecheck, ESLint and preparation logs are under
`.task/grocery-row-identity/` with the `wfs-grocery-group1-` prefix.

Tooling observed: Node `26.13.0` (repository `.nvmrc` pins `26.12.0`), Task
`3.54.0`, .NET SDK `11.0.100-rc.3.26522.148`. Global OpenSpec is `1.16.0`;
the existing parity-owned private tool directory provides `1.16.1`, used for the
strict validation above. No tool installation or parity-owned change was made.

## Engineering prerequisites inspected

`SupperProjectionInputs.ReadWeekAsync` supplies occurrence events and projected
lines; `IngredientProjectionLineDto` contains text/name/double quantity/unit/status,
not saved ingredient-row IDs. `SupperIngredientProjection.BindSupplies` deliberately
avoids positional matching. Consequently an array index or common recipe ID cannot
prove contributor continuity through an unmatched unit change. Exact demand-key
continuation can remain conservative; unmatched legacy lineage must not acquire a
fabricated proof. No lineage adapter was implemented at this checkpoint.

`GroceryLineItemDto.Quantity` and the current aggregator use doubles; the approved
contract instead uses nullable exact scalar/range quantities. A grocery adapter must
distinguish exact evidence from legacy numeric observations before double projection
and aggregation. Decimalizing a projected double does not recover an original
fraction/range. Any unavailable exact value/completeness must remain explicitly
unresolved. An approximation field or suppressing currently displayed amounts is
observable behavior and should not be introduced implicitly. This representation
boundary remains an engineering prerequisite, not a request to reopen Alex's
settled range, baseline, split/merge or fresh-list decisions.

The existing `GroceryCheckCoordinator` only has an in-process semaphore. A suitable
implementation direction is a PostgreSQL transaction that locks the absolute-week
plan before fresh reads, validates per-row guards, stores check/version changes and
a unique mutation-ID/body-hash/outcome record atomically, then publishes after
commit. Recompute and bulk must use the same database serialization boundary.
Different-row requests use their own row guards while a list version fences bulk
replacement. Replay must return the stored outcome without incrementing versions.
This is a design direction only: no durable ledger, lock or replica qualification
was implemented or tested here.

## Block and continuation boundary

The database runner's exact failed prerequisite was `docker info --format
'{{.ServerVersion}}'`, targeting `/Users/alex/.docker/run/docker.sock`; the OS
reported permission denied. No test database/container was created. The original
turn included the runner attempt and one direct diagnostic `docker info` invocation,
which exposed the permission-denied text. A subsequent read of room history supplied
no new human authorization changing that restriction; no further denied Docker
operation was retried or routed around it. Separately,
the C# formatter could not bind its MSBuild named pipe. Neither failure was an
automatic approval-review rejection; no escalation was requested.

Task 1.1 specifically requires intended-red PostgreSQL execution before dependent
logic. Resume in an environment permitted to use a demonstrably disposable
PostgreSQL runner and formatter IPC; execute the three new cases and remaining
required row/concurrency fixtures before proceeding to production logic. Keep one
writer, the protected-path manifest and the original dirty spec work intact. Review
the quantity adapter before changing its contract. Implementation approval remains
valid; this checkpoint does not ask for renewed approval of the approved slice.

C26 is demonstrated only as a UI regression, not accepted. C32, bounded C31
structural lifecycle, C38/C53 fresh-list rehearsals, durable replay, restart/replica
concurrency, stale bulk/item responses, absolute-week rejection, GET/SSE/store/mock
reconciliation and required interrupted/repeated browser flows remain unverified or
unimplemented. Quantity-reset/baseline/removal, focus/viewport and category-control
work remain deferred. No groups 2–4 or other canonical/migration stages were entered.

## Observed CI

Final GitHub Connector read of run `42395777365` showed Planning E2E failed and
Recipes E2E succeeded on the retry. The combined report finished successfully,
but the overall PWA build/E2E gate failed; source analysis was skipped.
Other listed validation jobs had succeeded. These are baseline observations, not
qualification of this uncommitted test diff or first-attempt acceptance. No CI was
triggered, retried or modified.

## Follow-up blocker investigation

This investigation did not reissue `docker info`, contact the denied socket, retry
the full MSBuild formatter, change permissions, use an alternate Docker transport or
executor, install software, start services or contact a database. HEAD and branch
remain unchanged. Only two whitespace line breaks in the task-owned C# test and
this evidence were edited; the protected paths remain clean.

### Docker operation and effects

The runner invokes `docker info --format '{{.ServerVersion}}'` at
`scripts/agent/database_tests.py:linux_network`, before image inspection/pull,
network creation, database provisioning or test execution. Its wrapper recorded
`docker info exited 1`. The original direct diagnostic's full relevant error was:

```text
permission denied while trying to connect to the docker API at unix:///Users/alex/.docker/run/docker.sock
```

This is an OS/access-control failure reported by Docker, not an approval-review
rejection, tool-policy rejection or evidence of an ordinarily stopped daemon.
The precise enforcing layer (sandbox versus another OS control) is not identified
by that message alone. Read-only metadata inspection now confirms the target is an
existing Unix socket, owned by uid 501, matching this process uid, mode 0755.
Ownership does not establish permitted socket access. No access probe was repeated.
The failed runner wrote its task-local invocation record/fingerprint; its record
contains empty database/runtime metadata and an empty test list. No Docker mutation
or PostgreSQL test ran before failure.

### C# formatting operation and effects

The exact C# child command was:

```text
dotnet format --include src/RecipeApi.Tests/Integration/GroceryCheckConcurrencyPostgresTests.RowIdentity.cs
```

Its working directory was `/Users/alex/Code/whats-for-supper/api`, launched by the
explicit two-path `task prepare` invocation. PWA Prettier had already succeeded and
formatted the task-owned UI test. The C# command exited 1 after its MSBuild build
host exited 134. The relevant exception is:

```text
The build host was started but we were unable to connect to it's pipe.
The process exited with 134.
System.Net.Sockets.SocketException (13): Permission denied
  at System.Net.Sockets.Socket.Bind(EndPoint localEP)
  at System.IO.Pipes.NamedPipeServerStream.SharedServer..ctor(...)
  at Microsoft.CodeAnalysis.NamedPipeUtil.CreateServer(...)
  at Microsoft.CodeAnalysis.MSBuild.Program.Main(...)
System.TimeoutException: The operation has timed out.
```

The denied target was the formatter build host's Unix-domain named-pipe server
bind. The randomized pipe name/path was not logged; its exact pathname cannot be
recovered from retained evidence and is not guessed here. This is an OS-level
permission error, with sandbox versus other OS enforcement not distinguishable
from the stack. It was not an automatic approval rejection. Workspace loading
failed before C# source formatting. Git/source inspection found no C# source edits
from that attempt; no claim is made that ignored restore/build artifacts were
untouched. The original API build's in-process fallback succeeded, but compilation
does not substitute for formatting.

### Supported independent paths inspected

- PostgreSQL: the existing runner accepts `WFS_TEST_POSTGRES_CONNECTION`; this path
  uses native .NET and avoids Docker. The fixture creates a unique
  `wfs_tomorrow_<uuid>` database, loads `api/database/schema.sql` and drops that
  database in `finally`. It requires a demonstrably disposable PostgreSQL admin
  service compatible with the schema, including its extensions. The variable is
  unset. No connection was guessed from application configuration or tested.
- Installed native tools: `postgres`, `initdb`, `pg_ctl`, `pg_isready`, `psql` and
  `pg_config` were not on PATH. No server binary was found in the inspected common
  Homebrew or Postgres.app locations. Docker and .NET are installed. A Linux SDK or
  temporary PostgreSQL container still depends on the denied Docker service and
  is not an independent permitted path.
- Full C# formatting: the repository's `format:api`, selected preparation and
  `lint:api` use project/workspace `dotnet format`, which requires the denied
  build-host IPC. No second repository formatter is configured. Changing the
  pipe directory/transport, sandbox or executor was not attempted.
- A limited independent check exists in the installed formatter:
  `dotnet format whitespace api/src/RecipeApi.Tests/Integration --folder --include
  GroceryCheckConcurrencyPostgresTests.RowIdentity.cs --verify-no-changes
  --verbosity diagnostic`. It loads a plain file folder rather than MSBuild and
  does not request the denied pipe. The first invocation incorrectly combined
  `--folder` and `--no-restore`, which the option parser rejected before work.
  The corrected check executed, found two WHITESPACE errors, and after manual
  whitespace-only correction passed with one selected file inspected, zero
  formatting changes and exit 0. It is supplemental whitespace evidence, not a
  replacement for the repository's full formatter/analyzer gate. Logs:
  `.task/grocery-row-identity/format-folder-whitespace-check.log`,
  `format-folder-whitespace-check-final.log` and
  `format-folder-whitespace-green.log` in the same directory.

The smallest database continuation needs an explicitly permitted disposable
PostgreSQL/pgvector admin endpoint accessible from this runtime and secure
configuration of the existing `WFS_TEST_POSTGRES_CONNECTION` path. That entails
new service access and was not attempted. Installing native PostgreSQL would add
installation/service requirements. Alternatively the original Docker route needs
an explicit permitted access change; approval of implementation alone is not such
a change. Full C# formatting separately needs permission for its workspace-loader
IPC; the supplemental plain-folder check does not remove that requirement.

### Exact gate and independent work

Task 1.1 says: “run `task test:database -- --filter
FullyQualifiedName~GroceryCheckConcurrencyPostgresTests` and `task test:e2e --
grocery.spec.ts` for intended red before logic.” The only executed intended-red
evidence is the two GroceryList unit regressions: a persisted opaque check is not
read, and a selected row writes `Water` rather than its ID. It does not establish
database or browser red, mutation guards, replay, replica concurrency or any other
unexecuted acceptance. The three new PostgreSQL tests compiled, but none ran.
The required water/concurrency/database/browser fixtures are also not complete.

Runtime implementation cannot advance without waiving this explicit gate.
Contract definitions, generated-client preparation, additional test fixtures and
engineering design can proceed independently under the original scope, but they
would not satisfy the missing runtime red evidence. This follow-up was limited to
blocker inspection and independent formatting; it did not change runtime contracts
or implement tasks 1.1–1.2. No denied operation was retried during this follow-up.

## Approved escalation and completed red execution

New trusted evidence explicitly authorized Docker and described the successful
supported `require_escalated` route used for DV previously. On that materially new
authorization, the disposable PostgreSQL runner and exact scoped full formatter
were each retried once through the supported approval mechanism. Both were allowed.
No socket permissions, sandbox/network settings, Docker transport or executor were
changed. DV and production services were not modified or used for tests.

### PostgreSQL

The first newly permitted invocation used the original exact group filter:

```text
task test:database -- --filter FullyQualifiedName~GroceryCheckConcurrencyPostgresTests
```

It ran 18 tests: 15 passed, three intended failures, zero skipped. Name-only item
and absent-row writes returned 204 instead of 409; name-only bulk returned 200
instead of 409. Record:
`.task/database-tests/runs/511a84e86e724952bfcddb1decc0547c/result.json`.

The regression file was then extended with
`WaterBucketsHaveIndependentPersistedIdentitiesAndGuardedConcurrentWrites`: three
separate recipes supply Water in g, ml and bottle buckets, alongside one Water
extra occurrence. Quantities are explicitly unknown in this fixture, so it does
not invent exact original amounts. The test requires persisted opaque IDs, two
concurrent row intentions, a stale item conflict, identical-mutation replay, stale
bulk conflict and a fresh-scope reread preserving both checks and the extra.

The same group command was run on that extended fixture: **19 executed, 15 passed,
four intended failures, zero skipped**. The new test reached the three-bucket GET
and failed because all three rows lack `rowId`. Its later concurrent-write/replay,
bulk and final persistence assertions therefore did **not** execute and are not
claimed as qualified. The other three new guard tests again failed as expected.
Record: `.task/database-tests/runs/a680c5e2d4384cefb4d4391b5c3d4f68/result.json`.

Both invocations used fresh runner-owned pgvector containers and isolated networks,
plus the pinned Linux SDK image. Both records confirm their PostgreSQL container,
SDK container and network were removed. This is actual PostgreSQL red evidence,
not a skip, provisioning failure, native build result or historical suite pass.

### Browser

Added an independent-water-control regression to `pwa/e2e/grocery.spec.ts`. It
supplies three opaque recipe row IDs plus one same-name extra, asserts four
controls, clicks one bucket and expects that row ID in the request and only one
checked control. It also asserts the extra remains unchecked after reconciliation.

The browser used an isolated PWA source copy at `/tmp/wfs-grocery-browser`, with
dotenv files excluded, existing dependencies linked and an owned Next.js/webpack
development server on `127.0.0.1:3117`. Its server-side API origin was set to
`127.0.0.1:1`; browser API boundaries were mocked. Port 3000 and the existing Docker
services were untouched. No runtime application source changed between the copy
and these runs. This is development-runtime red evidence, not production-build or
real browser/API/PostgreSQL qualification.

The focused new test failed at the intended request assertion: the selected bucket
sent no `rowId`. It had successfully rendered three recipe controls and four total
Water controls and sent a PATCH. Later checked-state/extra assertions did not run.
The screenshot and context are under `.task/grocery-row-identity/browser-red/`.

Then the complete required file was executed:

```text
BASE_URL=http://127.0.0.1:3117 HEARTH_SECRET=Paris-Montreal task test:e2e -- grocery.spec.ts --workers=2 --retries=0 --reporter=line --output=/Users/alex/Code/whats-for-supper/.task/grocery-row-identity/browser-suite-red
```

Result: **21 executed, 20 passed, one intended failure, zero retries**. The failure
was the same new opaque-row request assertion. Log:
`.task/grocery-row-identity/browser-suite-red.log`; screenshot/context live in the
corresponding `browser-suite-red/` directory. The task-owned server was terminated
after both runs; its process session finished with exit 143. No shared server was
stopped.

### Formatting and remaining work

The previously denied full command, in `api/`, now **passed with exit 0** through
the approved mechanism:

```text
dotnet format --include src/RecipeApi.Tests/Integration/GroceryCheckConcurrencyPostgresTests.RowIdentity.cs
```

It was run again after extending the fixture and passed. The browser test file was
formatted with selected-file Prettier. `task typecheck` passed on the browser/UI
test diff; log `.task/grocery-row-identity/typecheck-browser-fixture.log`.
`git diff --check` passed. No final application aggregate is claimed for an
unfinished red checkpoint.

The task now owns four changed paths: the UI unit test, the C# regression file,
`pwa/e2e/grocery.spec.ts` and this evidence. The original 22-path specification
manifest is preserved; all 26 protected browser-parity paths remain clean. HEAD
stays `482d44731ab44ec703f70e1252751fc0964bf7f2`; nothing is staged or published.

An explicit question is pending: for legacy quantities available only as doubles
without exact original evidence, should this slice display unknown amounts until
exact evidence exists, or preserve the existing displayed amounts through an
explicit approximate representation added to the contract? The approved schema
has only exact scalar/range/null `quantity`; it has no approximation discriminator.
Silently labeling legacy double values as recovered exact fractions/ranges is
prohibited, and silently removing all existing measured amounts would change the
shopping experience. The existing approved range/baseline/split/merge/fresh-list
rules are not being reopened. No renewed implementation approval is requested.
The representation answer is required before dependent quantity/API logic; no
answer has yet been received or inferred from elapsed time.

The independent test preparation above continued while that question was pending.
The required row contract/client/mock, mutation ledger, legacy continuity adapter,
fresh-list rehearsal and remaining stale/late-response fixtures are not implemented
or accepted. Resolving the former access blockers does not itself complete 1.1 or
1.2. No work advanced to groups 2–4 or canonical/migration implementation stages.
