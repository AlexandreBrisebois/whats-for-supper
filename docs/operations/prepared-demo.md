# Prepare and operate a resettable demo

Use a separate, private household and disposable qualification data. Never capture a real household for public use. The public demo is shared; its authentication is not separate operator authority.

## Private preparation

1. Keep `DEMO_MODE=false` and restrict network access to the operator while preparing. Use synthetic member names, authored recipes and nonprivate source/hero media. Do not put credentials or personal details in recipe notes, PDFs, images or household settings.
2. Prepare at least seven discoverable, ready supper recipes for two synthetic members. The automated fixture uses Maple and Cedar with lentil soup, bean rice, tomato pasta, chickpea stew, vegetable curry, potato bake and garden noodles. Its ordinary voting, explicit save, extra, cooking and reset exercise lives in `DemoShowcaseLoopPostgresTests.Synthetic_household_can_vote_save_shop_cook_and_reset_without_replaying_activity`. It does not change consensus thresholds or manufacture visitor votes. The companion round-trip test checks original PDF and hero byte preservation.
3. Verify the intended recipes, member preferences, feature overrides, ingredient categories and `family_goto` references. `family_goto` is the declared household setting. Unclassified stored keys stop capture/reset rather than being erased. Deployment environment, secrets, backup archives and browser preferences are outside the baseline.
4. Use authenticated `POST /api/management/demo-capture`. Follow the returned workflow/task identity until completion: 202 is acceptance, not success. Check `GET /api/management/status` for `demoSnapshotReady`, `demoBaselineId` and `demoSnapshotErrorCode`. A valid cron alone does not validate a baseline.
5. While still private and with demo mode disabled, exercise a manual `POST /api/management/demo-restore`. This is one-shot. Verify ordinary reads, assets and empty activity before enabling public access.

## Storage and publication

Capture publishes an immutable version-2 directory under `DataRoot/demo/<baseline-id>` and atomically selects it through `DataRoot/demo/current`. Missing/corrupt assets, invalid references or unsupported schemas fail preflight; failed capture retains the selected prior baseline. Legacy core-only snapshots require private recapture. Never hand-edit a selected snapshot or copy partial files into it.

Reset stages assets under the existing recipe recovery-generation root, drains cooperating writes/workers, then journals database/file publication. The selected baseline and live recipe roots must be separate. Publication durability requires the supported Linux filesystem runtime and PostgreSQL. Independent exact recovery still requires its own absolute `Recovery:BackupRoot` outside live roots; demo coordination does not enable that unrelated facility.

The default coordination wait is five seconds (`Recovery:WaitSeconds`, bounded 1–60); the publication deadline is 30 seconds (`Recovery:MaxFreezeSeconds`, bounded 1–3600). A drain timeout fails before publication. An interrupted database/file publication is reconciled to the complete prior or committed generation before normal operations resume. Keep the journal, active pointer and generation directories together; do not delete them to bypass recovery.

## Public activation and reset behavior

Enable API demo mode only after private qualification. Capture, manual reset, ordinary destructive recovery, and equivalent workflow trigger/retry paths are refused in visitor mode. Scheduled reset uses `DEMO_RESTORE_CRON_UTC` (UTC); the existing scheduler reconciles future occurrences, including after a terminal reset failure. `Calendar:TimeZone` still owns civil dates.

Each reset restores prepared recipe/member facts, preferences, approved overrides/categories and assets. It clears visitor calendar entries, saved meals, grocery items/checks/extras, votes, reports, voting history and cooked dates. A new empty current-week voting record owns a fresh round; it contains no assigned meals, checks or old notification. Matching alone never saves meals.

Old jobs and maintenance commands are fenced. Only the active reset and qualified, never-claimed future default Dreaming work survive. Qualification requires a pending parameter-free instance, future pending roots, untouched waiting/pending tasks and reviewed model-free maintenance processors/dispatch targets. Running, retried or unreviewed work is invalidated. Search/filter state is rebuilt without model requests; compatible prepared vectors are reused.

## Interruption and diagnostics

- Inspect `demoRecoveryState`, `demoLastResetTaskId` / `demoLastResetStatus`, and `demoNextRestoreAt` separately. A future occurrence does not turn a failed reset into success. Conversely, a successful reset does not prove successor scheduling succeeded.
- Restart reconciliation uses the existing publication journal. The authenticated recovery resume endpoint reconciles that journal; it does not select a different baseline. Preserve the failure evidence if reconciliation cannot complete.
- Browsers pin `X-Demo-Generation`. Stale or unversioned allowed writes return 412 `DEMO_RESET_REQUIRED` without mutation. Clients must refresh and never replay old requests. SSE `demo_reset`, reconnect snapshots and response generations also detect resets. The PWA removes the old draft and offers a localized continuation; continuing reloads authoritative state and clears volatile/PDF ownership while retaining valid device preferences and the demo acknowledgement.
- Do not promise a reset countdown or uninterrupted availability. Provider setup and actual physical-device/host durability qualification are separate from local emulated browser and disposable database tests.

## Local qualification

From the repository root, use `task test:database -- --filter FullyQualifiedName~DemoShowcaseLoopPostgresTests` for disposable Linux/PostgreSQL publication and ordinary API acceptance. Use `task test:e2e -- demo-reset.spec.ts demo-mode.spec.ts demo-management-access.spec.ts` for isolated browser coverage. The database runner fingerprints the source tree: do not edit files while it runs. Full task completion also requires the repository's scoped `task prepare`, `task verify` and generated-client checks; these focused commands alone do not certify deployment.
