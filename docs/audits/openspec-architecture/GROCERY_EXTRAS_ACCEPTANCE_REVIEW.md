# Grocery extras acceptance review — 2026-10-26

## Conclusion and scope

The completed version-before-visibility correction fixes a reproducible defect in the entry HEAD. This bounded audit found no additional current product defect justified by the everyday-grocery-extras archive's seven unchecked tasks. Those markers primarily preserve historical process evidence and an old final gate disposition. Remaining live/device qualification is a coverage limit, not evidence of a failing product.

Review only; no implementation, archive-checkbox changes, dependency installation, checkout/reset/stash, commit or PR. Entry HEAD is `e680fb7966978da3fbde25453a241c7e69e2b2a1`; index is empty. Existing tracked changes are Taskfile.yml, data-backup-and-recovery and demo-household ownership documentation, grocery-shopping and household-live-updates synced scenarios, and weekStore.ts/test.ts. Existing untracked work includes the architecture audit package, inventory script/tests and both October 26 archives. Before-image hashes and status: `/var/folders/7x/450tvgfj1lg2gx9p89txzx0w0000gn/T/wfs-extras-acceptance-audit-6zszolmq`.

Reviewed the archived proposal, design, tasks and evidence; current source/test owners; and all four affected canonical owners. Grocery-shopping and household-live-updates were read in full during the immediately preceding lifecycle review and remain unchanged in this audit; data-backup-and-recovery and scheduled-maintenance were read in full here. Preserve both URL/photo finalization requirements and full relevant-spec review. Overlap tooling and benchmarking remain deferred.

## Historical markers versus present behavior

| Record | Classification | Evidence and disposition |
|---|---|---|
| Tasks 1.2, 2.2, 3.1, 4.2, 5.1 | Historical process-evidence gaps | Complete original preimplementation red records are unavailable. Current green tests cannot reconstruct development order. Retain unchecked markers; do not implement the feature again to clear them. |
| Tasks 6.1 and 6.2 | Historical final acceptance/gate disposition, plus continuing qualification limits | The post-merge gate failed only two strict-spec length checks. Current strict validation passes all 34 specs; that failure is superseded for current documentation, while the failed historical record remains failed. Physical Android remains unqualified. No blanket task completion inferred. |
| Real two-client SSE acceptance | Passed historically; changed inputs prevent current-identity qualification | The actual API/PWA/PostgreSQL test passed with stable source identity `58ab8e116468dae440c42927552f12cad1bce8abb0c9f3b9d753bbf023572127`. It was not merely mocked and was not never-run. Current stream/week-store/shared inputs differ, so rerun qualification would have a purpose. |
| PostgreSQL acceptance | Passed historically; not rerun here | `.task/database-tests/runs/36f94a5756304f19a7f102c00b26c0e4/result.json` records 140 passed, zero skipped, stable identity. Current ordinary API tests skip relational opt-ins; those skips do not supersede or refresh database evidence. |
| Physical Android keyboard behavior | Continuing qualification limit | User-owned; not run by this agent. Touch viewport/focus simulations cannot establish hardware keyboard behavior. No observed hardware failure supplied. |
| Recipe grocery SSE quarantine | Existing separate test gap | `pwa/e2e/grocery.spec.ts` still skips the recipe `grocery_updated` scenario. It does not establish an extra-occurrence defect; no quarantine fix is authorized by this review. |
| Legacy missing creation-name metadata | Documented compatibility limitation | Original pre-rename spelling cannot be recovered for old rows/artifacts that never stored it. Current creation metadata and retained-name fallback exist. No new evidence warrants a migration or guessed history. |

## Why the completed correction was real

Executed the actual helper declarations extracted from entry HEAD and current weekStore.ts, transpiled with the installed TypeScript package in memory. Used the same calendar identity helpers and the prior schedule call's prefiltering order. With future view `2026-10-26`, current occurrence week `2026-10-19`, loaded unchecked version five, and incoming checked version four:

- Entry HEAD returns `[]`, incorrectly dropping the newer row.
- Current source returns the unchecked version-five occurrence.

The first experiment omitted the calendar helper's `civilDate` dependency and failed before exercising behavior; including the actual dependency produced the comparison above. That setup error is not product failure evidence. This helper experiment supplements the public-store regression suite; it does not qualify transport or a device.

The accepted regression suite exercises event, initialization, assignment refresh, sync and snapshot entry points at future offsets 1/2/8, equal/newer checked winners, pending updates/deletion, authoritative omission and current/past preservation. The historical live browser test instead covers current-week add/check/rename/category/delete plus missed-event reconnect. Its old success could not rule out delayed checked-state ordering in a future view.

## Identity and verification

Compared current SHA-256 values directly with `.task/grocery-extras-completion/postmerge-live-qualified-result.json`, rather than assuming the old Git commit represented its dirty tested snapshot. The extras schema/compatibility SQL, entity, service/controller, rollover service/processor/workflow, composer, API wrapper, recovery test file and live fixture/browser test match that manifest. Shared schedule/stream/recovery owners, generated contract inputs and week-store state have changed; therefore the old success is historical evidence, not current full-stack acceptance.

- **Passed now:** `task test:unit -- src/store/weekStore.test.ts src/hooks/useScheduleStream.test.ts src/hooks/useScheduleStream.grocery.test.ts src/components/planner/GroceryList.test.tsx` — 221 tests, four files.
- **Passed now:** `task test:api -- --no-restore --filter 'FullyQualifiedName~GroceryExtra|FullyQualifiedName~DreamingGroceryExtra'` — 32 passed, 17 skipped, zero failed. Skipped PostgreSQL/live checks remain unqualified. Log: `/tmp/wfs-extras-current-api.log`.
- **Passed now:** `task spec:check` — 34/34 strict canonical specs.
- **Passed previously for the completed correction:** `.task/agent-finish/runs/97193a88793a41ca875266c144a4ddca.json`; post-archive documentation `.task/agent-finish/runs/5739f215ce5f45fdb7202553c5537621.json`.
- **Not run here:** real PostgreSQL suite, mocked Playwright, actual two-client live stack, physical Android. No services or deployment were started.
- **Not applicable:** a new behavioral red/green implementation cycle or client generation; this audit changes no behavior or contract.

The new report receives a documentation-only harness verification after writing; its exact durable run record is reported in the completion reply. Prior successes remain attached to their original identities.

## Recommended bounded next action

Do not reopen the feature or clear historical checkboxes. If further qualification is selected, target current two-client extra reconciliation and reconnect, with explicit future-week delayed-state coverage for the corrected ordering; keep physical Android checks separate and user-owned. Existing current-week live coverage alone cannot establish that added concurrency scenario. Extend coverage only within that separately selected qualification scope, and change production code only after reproducing an approved behavioral failure. Stop before another implementation.
