# Continuity, precision and shopping-focus checkpoint — 2026-11-07

This is partial implementation evidence, not completion. All seven tasks remain
open; no main-spec synchronization or archive has occurred. It supplements the
group-1 and group-2 evidence and the exact continuation record in
`.task/grocery-continuity-20261107/`.

## Behavior and ownership

- Add server-owned `weekly_plans.grocery_demand_evidence` JSONB alongside retained
  checked-demand baselines. It records original-input fingerprints and observed
  occurrence/recipe/normalized-name membership, separately from the public row DTO.
  Recompute and guarded checks read/write it at the existing coordinated position;
  tracked callers and exact recovery preserve it. Historical absence stays absent.
- Observed membership detects splits and merges even when one bucket still has an
  exact identity match. The affected groups receive fresh unchecked IDs and no
  inherited baselines; unchanged retries retain their new IDs. Membership is
  negative evidence only. It does **not** prove saved ingredient-row lineage.
- A baseline captured against identical original source operands cannot prove an
  increase merely because the numeric representation becomes more precise. It
  retains the originally acknowledged decimal, while the current row may show the
  coherent source fraction. Original amount and portion inputs are fingerprinted;
  actual later amount/portion changes remain eligible for exact comparison. No
  fraction is inferred from a double, and the baseline never ratchets forward.
- Reject baseline acknowledgement versions newer than the previously persisted
  row version, including the immediately next version that recompute itself would
  otherwise create. Treat that comparison as unknown and retain the check.
- Express the two new empty-JSON-object defaults with `jsonb_build_object()` in
  schema and compatibility DDL. The equivalent literal `'{}'` made existing EF
  raw-script migration tests fail in its SQL format-string parser. The constructor
  preserves the empty-object default and passes existing upgrade/idempotence and
  restore tests without escaping or rewriting the executed migration fixture.
- Extra check success no longer focuses Edit. Keep normal checkbox DOM stable;
  preserve focused shopping controls and the list viewport through reordering,
  using `preventScroll` and a layout-phase restoration. A disappearing keyboard
  target uses an adjacent checkbox or the stable list heading when empty. Do not
  steal focus from a later action or another week. Pending extra check controls use
  `aria-disabled` with the existing mutation guard so focus remains available.
- Align regular/extra tag targets and icons, localize the regular label through
  existing translations, and close current-section choices without mutation.
  Normal mutations retain ingredient-key scope; extras retain occurrence scope.
- Source-return acceptance now observes the already selected grocery view instead
  of clicking a tab behind its entering overlay. Source screenshots use per-run
  output paths rather than a shared predecessor directory.

## Test-first and actual checks

All log paths below are relative to `.task/grocery-continuity-20261107/`.

| Check | Observed outcome |
| --- | --- |
| `evidence-red.log` | 4 intended failures, 3 passes: split, merge, identical-input precision and invalid future baseline version |
| `version-association-red.log` | 1 intended failure, 1 pass: validate against the persisted version before recompute advances it |
| `units-green-final.log` | 101 exact-quantity/recompute tests passed, zero skips |
| `focus-unit-red.log` | 4 intended focus/category failures, 4 existing passes |
| `focus-unit-green.log` | 92 component tests passed |
| `focus-browser-red.log` | Intended Enter-focus failure against the old isolated app |
| `focus-browser-green.log` | 8 pass/8 fail: pointer/touch test captured Playwright's pre-activation scrolling |
| `focus-browser-diagnostic.log` | One diagnostic failure; event timing proves scroll changed before click dispatch |
| `focus-browser-second.log` | 16 passes after measuring viewport at actual click dispatch, before React mutation |
| `category-alignment-red.log` | Intended regular checkbox/tag vertical-alignment failure |
| `browser-full.log` | 53 pass/3 source-return fixture failures |
| `browser-final.log` | All 56 grocery/source cases passed, 4 workers, zero retries; mocked development runtime |
| `api-last.log` | Full API: 1,451 pass, 297 opt-in/platform skips, zero failures |
| `units-last.log` | Full frontend: 1,852 pass in 125 files |
| `types-last.log` | Type checking passed after correcting new fixture types and nullable week annotation |
| `eslint-correct-cwd.log` | Scoped ESLint passed; earlier `eslint.log` used the wrong cwd and is not a lint result |
| `client-check.log` | Generated client check passed; no generated hand edits |

Both grocery and canonical changes pass strict OpenSpec validation through
`task spec:check` with the repository-pinned 1.16.1 CLI. The global CLI was 1.16.0,
so the first attempts were blocked by the version precondition. A task-private
1.16.1 install under `.task/grocery-continuity-20261107/openspec-tool/` supplied
the required version via PATH; no global tool or repository dependency changed.
Logs: `openspec-grocery-pinned.log` and `openspec-canonical-pinned.log`.
`verify-plan.json` is a read-only whole-grocery scope preview, not verification.

The first continuity attempt also contained an invalid positive oracle: a legacy
recipe/name match was assumed to prove saved ingredient lineage. Contract review
corrected that precondition; the retained current regression explicitly refuses to
invent lineage. `continuity-red-escalated.log` is diagnostic history, not evidence
that incompatible legacy units must inherit checks. Initial compile/socket failures
are not behavioral red evidence; supported local socket escalation subsequently ran
the actual tests. No automatic-approval rejection remains outstanding.

### Real PostgreSQL

- Initial selected run: **25 pass, zero skips**,
  `.task/database-tests/runs/b7103f051faf4e759700c37ea2cbf557/result.json`, identity
  `5436586a95a94a7b4994cd0f18597c76160d32007c45146f8d282672ff374602`.
- Full suite: **318 pass, 31 fail, zero skips**,
  `.task/database-tests/runs/7b17e05560504f428f7e9a31e72c1dfc/result.json`, identity
  `2839a9d90121c708f7386844df9f482509843cd391e52eddd2b118ecf91dacb6`.
  Both new measured-increase/check processing-order cases passed. Complete failing
  names, messages and stacks are retained in `database-failures.json`.
- Corrected the newly added category fixture's duplicate date/slot, and the SQL
  default issue affecting three existing migration tests. Affected final selection:
  **31 pass, zero skips**,
  `.task/database-tests/runs/333e88ac3cd94045b2ae978e795ffd81/result.json`.
  Includes both measured-demand race orders, stale late-check conflict, fresh recheck
  surviving unchanged recompute, normal/extra category scope, structural retries,
  retained source-precision baseline, exact recovery, and the three migration cases.
- The other **27 earlier full-suite failures remain unresolved**. The full suite
  was not rerun after these four corrections, so 27 is the outstanding case list,
  not a claimed new full-suite execution. Many still read numeric wire quantities,
  name checks or retired markers; classify each against the approved contract and
  current source before changing its oracle. No legacy fence was weakened.
- Every invoked runner removed its disposable database, SDK and network resources.

### Isolated production build/browser qualification

The protected production harness was run **unchanged** in a disposable
`node:26.12.0-bookworm-slim` container, with pinned npm 11.21.1 and its installed
Chromium. It used a read-only source snapshot, copied into its private filesystem,
an owned network, synthetic harness settings and **no host port mappings**. Port
3000 belonged only to that container's namespace. No DV or production service was
tested or modified. This resolves the local focused production-harness isolation
constraint without modifying protected files.

Command inside the isolated source copy:

```text
node scripts/ci/production-browser.cjs qualify -- grocery.spec.ts grocery-recipe-sources.spec.ts --workers=4 --retries=0
```

Result: **56 first-attempt passes, zero failures/skips/retries**, Linux ARM64.
This qualifies the selected two files; the harness's `suite: all` label does not
mean that the four full capability inventories ran.

- Harness record:
  `.task/grocery-continuity-20261107/production-output/harness/runs/8f52db7c-39a5-4815-8ff6-74f66bcdff77/result.json`.
- Source digest: `4af345e2ddb98de0a6d4b962f3f6a87472f9b6cd205f96d890bbce7e29fb42ab`.
- Configuration digest: `4180d17c3771084d14dfdd058dc57e3910db3545375d0d76bfc2069d6422e57b`.
- Build ID: `6TrD9gC3sQY6mUShXWOzw`.
- The copy deliberately has no Git metadata; the harness's commit/branch fields
  are null. `production-source-manifest.json` independently binds its 2,961 source
  file hashes to the dirty checkout at HEAD
  `482d44731ab44ec703f70e1252751fc0964bf7f2`, branch `recipe-view-redesign`.
  All those source files matched the checkout after qualification. This is not a
  hosted or committed-candidate pass. The later addition of this evidence document
  is documentation outside the production harness's PWA/build inputs.
- `production-runtime.json` confirms image identity, exit 0 and container/network
  removal. `production.log`, build records, JSON results and browser artifacts are
  retained. The owned development server/copy were also removed; port 3119 is free.

## Remaining acceptance and evidence limits

1. **Positive incompatible-unit continuation remains unimplemented.** The legacy
   model has no saved ingredient-row IDs. An occurrence/recipe/name observation
   cannot prove the same saved ingredient continued across an edit. Do not turn
   `Members` into invented lineage. A saved-ingredient identity prerequisite must
   be reconciled with the approved sequence before claiming this case qualified.
2. Precision proof above covers **identical recorded source operands**. A changed
   source-text/evidence journey, or a baseline without a trustworthy input
   fingerprint, still needs review. Do not guess whether a change is human intent
   or precision recovery, and do not blanket-suppress actual increases.
3. Resolve the 27 outstanding full-PostgreSQL cases, finish incomplete-baseline and
   late/race acceptance, and run the affected actual live two-client browser/API/DB
   fixtures against the resulting candidate. Earlier live passes belong to earlier
   content. Rehearse the complete existing-data migration path; the selected
   compatibility tests are not a full `migrate.sh` rehearsal.
4. Shopping-focus acceptance now includes ordinary success, pointer/touch/Enter/
   Space, normal DOM identity/sorting, future-extra disappearance with adjacent and
   empty-list fallback, category scopes, navigation, EN/FR phone/tablet and 320 px
   at 200% text. Interrupted/rejected projected-extra focus and held/repeated key
   journeys still deserve explicit cases before closing group 3.
5. Full four-suite production qualification, hosted same-candidate qualification,
   complete inherited-task diff/scope closure and final `task verify` have not run.
   No CI, stage/commit/push, deployment, branch/worktree change or worker launch was
   performed. Do not complete tasks, synchronize main specs or archive yet.
6. The first full source-browser run inherited fixed screenshot destinations in
   `.task/grocery-baseline-20261107/renders/` and overwrote its 16 PNGs. Original
   render bytes were not captured by this session and cannot be claimed preserved.
   Earlier logs/results remain. Subsequent screenshots are invocation-specific.
   All 26 protected paths retain their entry hashes; earlier specification edits
   and unrelated dirty application changes were preserved.
