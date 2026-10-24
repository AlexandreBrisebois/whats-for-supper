# Grocery extras audit and acceptance — 2026-10-24

## Scope and preservation

Started on `codex/six-ux-recovery-priorities` at `ac48e732` with 4/20 tasks checked.
The before-image is `.task/grocery-extras-completion/baseline.json`, with the full
initial patch and status beside it. The six UX recovery changes, their archives,
and the voting-session archive were pre-existing and are preserved. Concurrent
CI work appeared during this session; its workflow, harness and documentation edits
are outside grocery ownership. The changed Playwright configuration is reviewed as
a shared runtime input. No commit, push, deployment, main-spec sync or archive is
performed. The index changed externally during work; it is not managed by this task.

## Decisions reconciled with the owner

- Keep no Cancel button. Save/Delete and Add use accessible icons with full touch targets.
- Preserve input focus throughout pointer activation of Add, avoiding keyboard cycling.
- Keep saved-section toasts visible when the keyboard pans the visual viewport.
- Show unchecked, nonremoved current extras in every future shopping week, including
  two or more weeks ahead, until checked or deleted. Project the current identity;
  never create future occurrences merely for browsing. Current-only creation and
  immutable historical snapshots remain unchanged.

## Audit findings and implemented corrections

Most original implementation already existed in committed source. The old full
record `.task/agent-finish/runs/09ce87425cc74d9186799e45b4737f49.json` contains failed
impact/contracts/database checks and a blocked live endpoint check; its successes
qualify only its original identity. It is not completion evidence for this revision.

Corrections cover visual-viewport notification positioning; icon-only Add with its
existing pointer focus guard; authoritative category display while saving; historical
conflict read-only state; suggestion query-string routing and version/week conflict
parity in shared mocks; destination-view filtering of pending snapshots; all-future
projection through API/store/mock; immutable original-name request binding across
rename; terminal create replay after deletion and fresh explicit submission after
confirmed absence; and validation of the merged destination lineage before ordinary
restore writes, under a PostgreSQL table lock.

`creation_name` is nullable internal persistence metadata. Compatibility adds the
column without resetting existing rows. New submissions retain their original name;
legacy artifacts/rows without it fall back to retained spelling because an earlier
pre-rename value cannot be reconstructed. Ordinary backup preserves known bindings,
and exact recovery inventories the actual schema and rows.

## Task reconciliation

The implementation and acceptance columns are separate from historical process proof.
Tasks with an original test-first obligation remain unchecked where the original
behavioral red records are unavailable. New regression cycles below are actual
observations; they do not reconstruct an earlier development order.

| Task | Concrete source/test evidence | Qualification |
|---|---|---|
| 1.1 | OpenAPI create/suggestions/read schemas; generated groceryExtras operations and models | Existing checked task; regenerate/check for current contract |
| 1.2 | GroceryExtraServiceTests, GroceryExtraControllerTests, GroceryExtraPostgresTests; GroceryList tests | Existing tests plus current regressions; original complete preimplementation red evidence unavailable |
| 1.3 | Separate table/EF/entity; GroceryExtraService/Controller; ScheduleService; wrapper/store; shared mocks; composer/locales | Implemented; focused API/database/unit required |
| 1.4 | grocery.spec.ts add/reload, duplicate, failed/free-text add, explicit selection, stale lookup, narrow tray and panned toast; isolated psqldef preview | Browser and migration acceptance required; Android hardware separate |
| 2.1 | OpenAPI PATCH/DELETE, 409, exclusion header; generated item operations | Existing checked task; current client check required |
| 2.2 | API version/ownership and concurrency tests; component rollback/rename/category/delete/absence tests; grocery browser mutations | Original full preimplementation red evidence unavailable |
| 2.3 | Version token/tombstones; controller; identity wrapper/store; compact Extra label; icon Save/Delete; shared mocks | Implemented, preserving owner decision to omit Cancel |
| 2.4 | Component rollback, pending/error, identity/navigation tests; browser mutation test; PostgreSQL winner/concurrency tests | Current browser/unit/PostgreSQL acceptance required |
| 3.1 | DeterministicLifecycleSequencesPreserveHistoricalSnapshotsAndTerminalLineages, concurrent/missed-week PostgreSQL tests; DreamingGroceryExtraWorkflowTests and ManagementService report tests | Original complete preimplementation red evidence unavailable; deterministic sequence qualification added |
| 3.2 | Shared rollover transaction/advisory lock; Dreaming processor/report dependency; current read repair | Existing checked task; PostgreSQL cardinality/read-repair requalified |
| 3.3 | Future projection API/store/component/browser tests; immutable snapshot sequence; user guide | Updated to owner's all-future projection rule |
| 4.1 | Dedicated OpenAPI SSE event/union, generated types and builders | Existing checked task; regenerate/check required |
| 4.2 | Controller lifecycle observes five publications and excludes initiating connection; post-commit failure unit; hook/store guards and pending-row tests | Original full preimplementation red evidence unavailable |
| 4.3 | Dedicated publisher; absolute occurrence identity/version/pending consumer guards; connected snapshot sync | Implemented; unit/browser plus live acceptance required |
| 4.4 | GroceryExtraPostgresTests.Live.cs and grocery-extras-live.spec.ts, two independently authenticated browser contexts | Separate actual API/PWA/PostgreSQL acceptance; never inferred from mocks |
| 5.1 | GroceryExtraRecoveryPostgresTests ordinary/exact membership, lineage, tombstones, versions, invalid preflight, empty/legacy artifacts, merge-union rejection | New merge behavioral red/green retained; original full preimplementation red unavailable |
| 5.2 | ManagementService export/validation/transactional merge; exact recovery Tables/preflight/order; schema/EF | Implemented; Linux PostgreSQL required, not in-memory qualification |
| 5.3 | recovery-exports.md, exact-recovery.md and selected strict OpenSpec validation | Documentation/static proof separate from database proof |
| 6.1 | Full requirement/scenario inventory below plus focused/broad records | Not complete while required evidence is missing or final checks fail |
| 6.2 | Explicit reviewed paths, preparation and final invocation records | Final result must be read from its exact record; no completion from code existence |

## Requirement and scenario inventory

Each scenario below maps to its capability's source/test owners. This inventory is
an audit index, not a claim that a single named test establishes every scenario.

### data-backup-and-recovery

Owners: ManagementService and RecoverySnapshotService inventory/preflight/publication; ManagementServiceTests and GroceryExtraRecoveryPostgresTests on disposable Linux PostgreSQL.


**Export complete grocery-extra history**

- Extra history exists
- Extras were cleared

**Merge grocery-extra history by stable occurrence identity**

- Restore existing and missing occurrences
- Invalid lineage reference
- Repeat restore

**Tolerate absent legacy grocery-extra artifacts**

- Legacy export omits extras
- Explicit empty artifact
- Unreadable artifact

**Include grocery extras in independent exact recovery**

- Exact snapshot contains extras
- Exact restore replaces extras
- Exact snapshot omits required extra membership
### grocery-shopping

Owners: GroceryExtraService/Controller, ScheduleService, GroceryList, weekStore, grocery-extras wrapper; GroceryExtraServiceTests, GroceryExtraControllerTests, GroceryExtraPostgresTests, GroceryList.test.tsx, weekStore.test.ts and grocery.spec.ts.


**Add a name-only extra to the current grocery week**

- Add one extra
- Confirm the selected section
- Blank name
- Add while another week is displayed

**Keep repeated and recipe-matching extras distinct**

- Extra matches recipe milk
- Add the same extra twice
- Retry the same accepted submission

**Enter extras from a persistent bottom composer**

- Empty meal plan
- Add several items
- Add is pending
- Add fails

**Suggest previously used extra names without replacing free text**

- Two characters match household history
- Fewer than two characters

**Rank and suppress household extra suggestions deterministically**

- Current outstanding name is suppressed
- Matching recipe row does not suppress a suggestion
- Most recent matching history was removed

**Keep free-text add authoritative when suggestions are used or unavailable**

- Select a suggestion
- Suggestion lookup fails
- Older lookup completes last

**Present bottom-composer suggestions accessibly above the field**

- Phone keyboard is open
- Touch selection
- Keyboard selection
- Mobile keyboard commits completed text
- Dismiss suggestions

**Carry each outstanding extra through weekly snapshots**

- One rollover remains unchecked
- Several rollovers are reconciled
- Browse any future week
- Browse farther ahead
- Meal plan changes

**Stop carry-forward after current completion or deletion**

- Checked before rollover
- Check then uncheck before rollover
- Delete a carried occurrence

**Include current outstanding extras when shopping any future week**

- Shop next week's suppers on Saturday
- Check while viewing next week
- Current extra is edited from next-week view
- No additional week label

**Identify extras with a compact text source label**

- Extra appears in a compact grocery row
- Item name needs more room
- Checked or historical extra

**Make historical extra occurrences read-only**

- View an earlier extra
- Recall whether an item was bought
- Past recipe grocery remains interactive

**Check an extra by stable identity**

- Check one duplicate
- Check request rejects
- Stale version

**Rename the current extra inline**

- Rename current occurrence
- Earlier snapshot retains its name
- Rename fails

**Recategorize only the selected extra occurrence**

- Change an extra category
- Matching recipe row
- Category save fails

**Delete the current extra optimistically**

- Delete succeeds
- Delete fails
- Delete after another update

**Return extras with the selected weekly grocery view**

- Mixed grocery list
- Historical extra
- Future-week shopping extras
- No recipe groceries

**Reconcile extra mutations against absolute week and version**

- Navigate during rename
- Older household update
- Uncertain mutation outcome

**Keep extra controls accessible and interruption-safe**

- Keyboard add and edit
- Return after interruption

**Use display name as the shared check identity**

- Duplicate names
- Uncheck duplicate
- Extra shares the display name

**Initialize an empty loaded check map from displayed names**

- Empty map
- Existing map
- Extra row

**Submit one optimistic grocery check at a time**

- Check succeeds
- Uncheck succeeds

**Show the grocery empty state for no loaded lines**

- Empty list
- Start planning
- Add without planning
### household-live-updates

Owners: SseEventPublisher, GroceryExtraService, GroceryExtraRolloverService, useScheduleStream and weekStore; SseEventPublisherTests, controller lifecycle test, hook/store tests and separate grocery-extras-live.spec.ts.


**Attempt authoritative extra publication after committed changes**

- Extra mutation commits
- Carry-forward materializes occurrences
- Publication fails after save

**Apply received extras only to eligible shopping views**

- Matching loaded week
- Future-week shopping view
- Another week
- Week identity is absent

**Keep newer local extra versions during reconciliation**

- Older event follows local save
- Pending optimistic deletion
- Newer household edit

**Recover extras through schedule snapshots and reconnects**

- Event was missed
- Reconnect current week
- Snapshot is older than pending work
### scheduled-maintenance

Owners: GroceryExtraRolloverService, RolloverGroceryExtrasProcessor, dreaming.yaml, ManagementProcessor/Service; DreamingGroceryExtraWorkflowTests, ManagementService report tests, PostgreSQL concurrent/sequence/read-repair tests.


**Reconcile extra rollover during Dreaming**

- First Dreaming run after rollover
- Dreaming runs again
- Several weeks were missed
- Lineage already ended

**Report rollover failure without claiming completion**

- Rollover task fails
- Later repair succeeds

**Compose maintenance without waiting for launched child completion**

- Report after launch
- Next maintenance request
- Grocery-extra rollover completes

## Recorded test cycles and limitations

Logs live under `.task/grocery-extras-completion/`. Actual behavioral reds include
`icon-add-red.log`, `viewport-red.log`, `category-red.log`, `history-red.log`,
`merge-red.log`, `mock-red.log`, `projection-api-red.log`,
`projection-store-red.log`, `replay-red.log`, and `absent-replay-red.log`.
The attempted Cancel restoration was superseded by the owner's correction; it is
not accepted behavior or completion evidence. Earlier test-writing errors (invalid
matcher, unavailable mock aisle, wrong store method) and service/tool failures do
not count as behavioral reds. The first navigation regression was superseded by
the owner's all-future projection decision; only the revised projection expectation
is authoritative.

Baseline focused API: 27 passed / 13 PostgreSQL skips. Baseline clients: 161 passed.
Later focused acceptance before final preparation: 44 API passed / 20 opt-in skips,
170 clients passed, 12 grocery browser passed / 1 pre-existing recipe-SSE quarantine.
The Linux database run `dde2e0708e9d4f0d85b457a797a7976d` passed 18 tests with stable
identity before later replay/schema/future-view refinements. A newer copied API
source passed 19 tests in run `ae44504b67cb459f85792e32a2c83cfe`, but concurrent
workspace mutation invalidated its repository-wide identity: that record is failed,
not a qualified final success. Its source manifest and TRX remain inspectable.

The initial actual two-client live run passed one scenario with zero skips; its
TRX and `live-result.json` are retained beside the logs. Later source changes require
fresh live acceptance. Mocked Playwright does not establish live SSE behavior.

The saved-section toast was visually inspected at 320x500 with a simulated visual
viewport offset; the screenshot is `keyboard-panned-toast.png`. Actual Android
hardware/on-screen-keyboard qualification is not run. Simulation does not prove
all device keyboard/browser behavior.

Selected strict validation passes. Repository-wide strict validation still flags
the pre-existing >500-character requirements in `household-live-updates` and
`recipe-discovery`. Their approved text is preserved; these are separate from
extras regressions. Final records and tested identities are authoritative for
final check results; no old success is attached to later source content.

## Current qualified acceptance before the final gate

An isolated detached checkout at `/Users/alex/Code/wfs-grocery-verification-8e9e5d8c`
contains the reviewed source plus preserved dirty work, avoiding concurrent CI writes.
Its focused PostgreSQL run `.task/database-tests/runs/08d5ec40b1b142999645709c3abaa1a6/result.json`
passed 19 tests, zero skipped, with stable identity
`67db373d91a3518a518d7e405d9cf2d6dcefbc23f38e0c80ca940ec58dfe3a81`.
The expanded grocery browser suite passed 15 tests with one unchanged recipe-SSE
quarantine; 171 focused client tests passed. The actual two-client live run
`live-qualified-result.json` passed with `source_stable=true`, source identity
`423ab3b551bddf0986e6386ef37d9e0e6ceb84647486e1b97e8bb1d25251db02`;
its recorded source manifest distinguishes later test-only additions. The final
harness runs against the reconciled source and complete selected paths.

`task db:schema:push DRY_RUN=true` also passed on an owned disposable network and
PostgreSQL container with a prior schema lacking extras. The preview introduces the
extras table/indexes; compatibility separately adds nullable creation metadata and
preserves existing data. Only synthetic credentials were supplied.

All 41 original archived files matched their before-image hashes. The pre-existing
TestWebApplicationFactory and ScheduleService edits were also unchanged by this work.
Preparation passed for the complete selected paths; generated client output preserves
the six-UX contract changes and includes the all-future extras description.


## Post-merge verification and authorized archival (2026-10-24)

The implemented behavior was qualified after fast-forwarding this branch to main
`fc8f13a543a73a28bb3f46841e944c544a91dc0b`. Final implementation verification:
`.task/agent-finish/runs/db0740d51e3b417f8128f0e90ae55b9d.json`, stable tested identity
`536a0939ff0ca3ffe70ba340e9ebb5267dd784171c306aa618c2fa12626d2a9d`.
Preparation, documentation, lint, formatting, types, 946 unit tests, 304 mocked browser
tests, 1,191 API tests, static contract/client/mock checks, live endpoint parity and
140 actual PostgreSQL tests passed. The mocked run skipped 17 cases and the general
API run skipped 125 opt-in cases; these skips are not promoted into passes.
PostgreSQL had zero skips; its exact record is
`.task/database-tests/runs/36f94a5756304f19a7f102c00b26c0e4/result.json`.
The separately executed actual two-client API/PWA/PostgreSQL browser/SSE scenario
passed one test, zero skipped, with stable source identity
`58ab8e116468dae440c42927552f12cad1bce8abb0c9f3b9d753bbf023572127`;
`.task/grocery-extras-completion/postmerge-live-qualified-result.json` retains its
source manifest and runtime metadata. The final implementation gate failed only
`spec:check`, on the two known unrelated main-spec statements over 500 characters
in household-live-updates and recipe-discovery. Earlier CI-test/cache failures are
retained as superseded records, not described as current regressions.

The user subsequently authorized syncing and archival after reviewing these limits,
and explicitly took ownership of physical Android testing. Android hardware testing
is not run by this agent and is not implied by the passing touch/visual-viewport
browser scenarios. The historical test-first evidence gaps and unchecked tasks are
preserved. Archival does not reconstruct missing original red evidence, establish
all-task completion, or erase the known strict-validation failure. Legacy artifacts
still cannot reconstruct an absent original pre-rename creation name; the documented
retained-name fallback remains. The existing recipe grocery SSE browser quarantine
also remains a skipped check.

Synced 29 added and five modified requirements across grocery-shopping,
household-live-updates, data-backup-and-recovery and scheduled-maintenance. Delta/main
parity, unrelated requirement preservation and unchanged Purpose sections passed.
Normal main-spec validation passed all 33 specs with the two known length warnings.
The approved long statements were not rewritten. Lifecycle documentation receives
its own scoped verification; the implementation identities above remain immutable.
