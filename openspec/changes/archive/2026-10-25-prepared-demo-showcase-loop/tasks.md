# Tasks

Implement PR #340 on `feature/prepared-demo-showcase-loop`, based on the demo safeguards branch at `fdde5fe3`. The implementation request supersedes the original planning-only restriction. Preserve unrelated locale catalog edits. No merge, push, archive, deployment, live household operations or provider calls are selected.

## 1. Decisions and contract

- [x] 1.1 Reconcile the accepted fresh-start policy: restore prepared facts/assets and audit dates; clear calendar, saved meals, groceries/extras, votes/reports and voting/cooking history. Create one new empty current-week voting owner with fresh identities; no activity rebasing, threshold change or automatic meal assignment.
- [x] 1.2 Capture/replacement requires private non-demo mode. Public resets are scheduled only; protect management, generic dispatch/retry and queued execution. Legacy/incomplete snapshots require recapture. Non-demo manual restore is one-shot; terminal automatic failure remains visible while future recurrence is reconciled.
- [x] 1.3 Use bounded write/worker coordination and existing recoverable file/database publication. Invalidate old household jobs and maintenance commands; preserve current reset orchestration and only reviewed never-claimed future Dreaming maintenance. Preserve independent recovery configuration and ordinary backup semantics.
- [x] 1.4 Contract first: management 403, readiness/reset/successor diagnostics, X-Demo-Generation, allowed-mutation 412, versioned media and connected/demo_reset SSE. Regenerate Kiota and synchronize method-sensitive/stateful mocks. Preserve #348 provider refusal, local import/resolution, Search/Similar and context acknowledgement.

## 2. Baseline and publication

- [x] 2.1 Test-first management access including parameterized sibling dispatch and non-demo controls (`task test:api -- --filter FullyQualifiedName~DemoManagementAccessTests`). Protect acceptance and execution without adding a role system.
- [x] 2.2 Capture a version-2 complete inventory with explicit empty collections, declared settings/references and hashed media. Stage and validate before atomic baseline selection; preserve the prior baseline on failure. Use configured workflow/recipe/data roots.
- [x] 2.3 Reuse recovery publication/journal/restart reconciliation; drain first capture and reset writes, workers and reaper. Recheck claimed reset eligibility inside publication. Reject missing/corrupt/legacy inputs before mutation and reconcile pre/post-commit interruptions.
- [x] 2.4 Pass final real PostgreSQL fresh-round, recipe/PDF/hero/preferences/override/category, activity/history clearing, repeated reset, stale request/media, maintenance fencing and ordinary recovery regressions: `task test:database -- --filter 'FullyQualifiedName~DemoShowcaseLoopPostgresTests|FullyQualifiedName~OnlineRecoveryPostgresTests|FullyQualifiedName~GroceryExtraRecoveryPostgresTests'`.

## 3. Recurrence and diagnostics

- [x] 3.1 Test-first one-shot private restore, deduplicated automatic successors, failure/restart reconciliation and actual scheduled worker execution with provider traps. Keep UTC cron and existing scheduler ownership.
- [x] 3.2 Report baseline readiness/identity/errors, publication recovery, last reset outcome and confirmed future occurrence separately. Return counts from the published transaction, including rebuilt search. Demo coordination alone does not enable independently configured recovery status.
- [x] 3.3 Document private synthetic preparation, Linux publication, legacy recapture, activation and interrupted reset recovery in `docs/operations/prepared-demo.md`. Add a secondary localized self-hosting link to existing demo guidance without replaying the introduction.

## 4. Clients and playable qualification

- [x] 4.1 Test-first generation transport: pin reads, send generation on mutations, reject 412 and late responses without replay, probe after successful writes for missed reset. Integrate both generated SDK and raw fetch. Carry server-rendered identity into the browser and key recipe media URLs.
- [x] 4.2 Remove obsolete mounted drafts on reset/SSE/reconnect/read change; invalidate pending PDF ownership and provide focused accessible EN/FR continuation. Full-document continuation reloads authoritative stores while preserving valid device preferences and acknowledgement.
- [x] 4.3 Exercise reset/re-entry in EN/FR on iPhone, Pixel Phone and iPad portrait/landscape emulations, including focus, touch size, cleared search drafts and preserved acknowledgement. Inspect rendered output. Physical devices are not qualified by emulation.
- [x] 4.4 Pass deterministic synthetic household browse/vote/convergence/explicit-save/grocery/cook/reset qualification across real API/PostgreSQL and the stateful browser loop; rerun #348 model-free import/local-resolution/provider regressions. Fixtures contain no private content or provider credentials.

## 5. Completion

- [x] 5.1 Reconcile final artifacts, task evidence and actual diff ownership. Run scoped `task prepare -- <complete-owned-paths>` including contract-generated closure, then `task gen:client:check` and applicable final `task verify -- <complete-owned-paths>`. Report exact record paths and failures/blocks separately; do not treat focused checks as completion.

## Evidence and checkpoint

Earlier access-slice red: eight behavioral failures/four controls, then two indirect-dispatch failures; focused green 26 tests and one management-denial browser case. Earlier database checkpoints: 47 passed at `.task/database-tests/runs/df69856c2e3f40bd867c17d514dc4f57/result.json`; 14 at `3b2b108b96484b1dade057b787d6b09e`. These identities precede subsequent changes.

Current-session red/green evidence:

- Prior recorded maintenance/obsolete-reset red `8cc220656fa14ab8b5d095362cfa8296`: two failures/one control. Publication fixes passed; reaper race reproduced in `a4f47bea1a9f4525aca10270902188b8` (56 passed/one failed). After write-lease correction, `a983371c895f4b359c360ad119d0a761` passed 57 PostgreSQL tests, zero skipped.
- Transport test initially failed five behaviors/one control; six passed after implementation. Reset boundary initially retained an old editor; passed after implementation. SSR identity test initially failed to expose the response generation; four server-fetch tests passed after implementation. Combined transport/boundary/image checks: 18 passed.
- Diagnostics red `c98444f4073346f68010a02d2bd553da`: rebuilt search reported zero instead of one. Independent recovery status native red reported available instead of disabled. Focused API group passed 80 after fixes; final database run remains required.
- Synthetic round red `45756ae9100f433e87adc818c0c93784`: discovery was unowned despite fresh round state (21 passed/one failed). New empty voting-owner record fixes that gap without assigning meals. Follow-up `fc4f89c2736d41b68b463ba34df4f2ee`: 57 passed; fixture used a nonexistent GET grocery route (405), corrected to the ordinary schedule read. Not a passing loop claim.
- Parameterized sibling-dispatch red accepted forbidden capture; traversal now keys both definition and parameters. Focused access green is recorded before final verification.
- Browser reset and dependency suite: 28 passed. Earlier French fixture failures were caused by an English member preference; corrected fixture validates actual French UI. Existing API-mutation assertions counted Next development stack-frame POSTs after deliberate SSE disconnects; evidence traced them to the dev client, and assertions now count API requests only. Production behavior was not weakened.
- Full PWA units passed 1,019 tests before the final self-hosting addition; final verification must cover later edits. Earlier catalog-inventory and required-diagnostics assertion failures were reconciled with the new owned catalog and approved contract.

The original remote planning validation belongs to PR head `62d3c27e46f2b7a799dc6f2c5278986dcdd2cf59`, not this implementation. No deployed, physical-device, power-cut or production qualification is inferred from local results.

Final focused acceptance: `.task/database-tests/runs/c4460e6086454aada6462f2f82e7837d/result.json` passed 58 PostgreSQL tests with zero skipped, including the complete synthetic ordinary API loop and independent recovery regressions. `DemoManagementAccessTests` passed 26 tests after the sibling-dispatch regression. All 1,019 PWA units passed after the self-hosting addition. All 36 OpenSpec items passed strict validation. The complete stateful browser journey passed after fixing its viewport/navigation fixture: the Next development overlay intercepted a Home click, so navigation uses keyboard activation. Earlier 28-case demo/reset suite passed; final gate covers the added journey and prepared output.

First full gate `.task/agent-finish/runs/53fa941ba637477e9c38c63314434943.json` retained stable identity but failed three checks: an obsolete legacy-demo clock test, a getter-only DTO parsing mismatch, and an older history fixture that assumed activity preservation and declared missing media. Updated the clock test to retain ordinary-backup compatibility, added explicit JSON names without changing the error wire shape, and reconciled the history fixture with complete capture and activity clearing. Focused follow-up: 17 clock tests passed; static schema drift passed; real PostgreSQL history regression passed at `.task/database-tests/runs/c20fb6fd118448208e86c70484487113/result.json`. The failed gate also passed 1,019 frontend unit tests, 352 browser tests (18 skipped), all 36 strict OpenSpec items, generated-client freshness and live endpoint parity; those partial results do not make the failed gate successful.

Final prepared-source verification passed at `.task/agent-finish/runs/1df41d1451df4b5c882f769444d48052.json` for 110 task paths, with six unrelated locale edits excluded and stable full content/runtime identity. Passed: all 36 strict OpenSpec items, lint/format/types, 1,019 frontend unit tests, 352 browser tests (18 skipped), 1,249 native API tests (153 opt-in/platform skips), generated-client freshness, static route/schema/mock contracts and live endpoint parity. Separate Linux/PostgreSQL verification passed 177 tests with zero skipped at `.task/database-tests/runs/77aa1a38c18746f1aad5c45715a67b15/result.json`. Live parity used a disposable local API and synthetic PostgreSQL database with isolated data roots and an unreachable provider endpoint; no household data or provider calls were used. Later changes only record completion in this file and HANDOVER.md and receive documentation-only verification; they do not alter the tested implementation. Physical-device, deployed-host and power-cut qualification were not run. No commit, push, merge, archive or deployment performed.
