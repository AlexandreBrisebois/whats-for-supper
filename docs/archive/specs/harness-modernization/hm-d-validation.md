# HM-D — verification and completion evidence

Date: 2026-09-10. Status: implemented; automated harness checks passed on the
recorded candidate, but required candidate model runs remain **blocked/unqualified**.
The task checkbox remains open. Only HM-D was selected; stop before HM-E.
Historical HM-C statements that HM-D was unselected describe that earlier run.

## Starting state and preservation

Starting HEAD: `55bd68f7961647fc9a3c4d754e8de2f46821b1e9`. The worktree already
contained HM-C tracked and untracked changes. Before implementation, Git status and
1,662 tracked/untracked path identities were captured in `/tmp/hm-d-start.json`.
The exact starting path count, status, overall digest and per-file before/after hashes
are in [content evidence](hm-d-content.json). All HM-D primary artifact inputs matched
the manifest's frozen baseline hashes. Shared registry/spec changes preserve HM-C;
all other initial dirty paths remain byte-identical. No staging, reset, stash, commit,
push, deployment, product changes, host memory or HM-E consolidation occurred.

The [HM-D-only implementation diff](hm-d-implementation.patch) is reconstructed
against the captured starting bytes/hashes, including the initially dirty registry
and spec status sections. It excludes this slice's evidence artifacts to avoid
recursive content. The frozen artifact manifest and prior A/B/C evidence are unchanged.
One implementation writer performed dependent edits sequentially; no agents delegated.
Protected repository `.agents` writes required sandbox escalation and were approved;
there was no automatic-review rejection or additional user permission request.

## Concrete changes and retirement closure

| Area | Result |
|---|---|
| Completion policy and Taskfile | `agent:prepare` generates applicable client content then formats; `agent:finish` remains the single completion entrypoint. Documentation/harness changes select links/syntax/whitespace and agent regressions; application selects lint/format-check/types/unit/API/impact/static contracts; contract/schema adds live and real database obligations; unknown takes the union. Mixed changes union requirements. |
| Final validation | `review` no longer formats, kills processes or prints readiness to commit. PWA formatting uses a new check-only target. Kiota check still generates/formats only in its temporary directory. Agent Python commands use `-B` to prevent bytecode writes. Finish compares the pre-check identity after each check and never caches finish. |
| Impact/cache | NUL-safe staged/unstaged/untracked discovery, conservative unknown/unmapped fallback, existing recipe mappings and generated next-env impact exclusion preserved. Identity includes all Git-tracked/untracked source, selected tests, configuration, tool executable/platform/environment hashes, installed Node/browser bytes and ignored dotenv inputs. It detects changed/new/deleted inputs after tests, rejects mutation and caches only the pre-test identity. Cache reuse requires a declared isolated runner, no external BASE_URL, no CI and no disable flag. |
| Timeout handling | Finish owns/stops/reaps its child process group on timeout/interruption, without retry. Impact uses the installed local Playwright CLI with a 900-second bound. Kiota compatible-runtime selection, manifest pin, clean-output, roll-forward removal and one-shot timeout remain unchanged and tested. |
| Evidence boundaries | Five check statuses remain distinct. Live endpoint unavailability exits 2 at script level. Static reconciliation no longer hides absent controller routes when offline and labels source/mock coverage as static. Finish reports `automated_checks_passed` and explicitly leaves task-specific acceptance unevaluated; it does not announce task/host/model completion. |
| Incidental callers | README and LOCAL_DEV_LOOP reflect prepare-before-validation and review's actual scope. `test:e2e` now forwards CLI arguments for the focused QA caller. CI, package and pre-commit interfaces otherwise remain unchanged. |

Legacy `.agents/skills/test-audit/scripts/audit.py` was compared with active
`scripts/agent/test_audit.py` before retirement. Both discover PWA unit/E2E and API
tests by filename/content and flag logic/mock-heavy candidates. Active already
preserved those heuristics, can report both together, and adds selector analysis;
there was no useful unique legacy executable behavior to transplant. Active
`agent:audit` → `test:audit` → `scripts/agent/test_audit.py` remains intact, with
advisory output that does not require unrelated cleanup.

| Retired source | Destination / reason |
|---|---|
| testing/SKILL.md | Core contract-testing and execution-harness retain approved contract → tests → implementation, seam evidence, mocked boundary, actual check statuses, optimistic/reconciled checks and timeout discipline. nextjs-qa retains locator nuance. Removed blanket failure assumptions and universal E2E completion claims; the linked SKILL_NEXTJS_TESTING.md did not exist. |
| test-audit/SKILL.md | nextjs-qa and agent-toolbox retain bounded coverage discovery, shared builders, logic-to-unit candidates and E2E seam preservation. Removed mandatory cleanup/deletion and baseline gate cascades. |
| test-audit/scripts/audit.py | Deleted as behavior subsumed by the active script; Taskfile callers preserved. |

Registry rows were migrated before removal. The final active-reference scan across
.agents, .kiro, .github and specs (excluding archive/arcive/05_ARCHIVE and historical
modernization evidence) has no caller to either retired entrypoint/support path.
There are 11 remaining entrypoints; session-review remains for HM-E. nextjs-qa's
references retain testid-first interactions and semantic role/name/state assertions;
visibility alone is no longer presented as proof of hydration. No cascade to
unrelated death-audit, mandatory interview or nonexistent mock-server command remains.

## Actual commands and results

| Command/check | Result and boundary |
|---|---|
| `task test:agent` — test-first runs | Initial new behavior cases failed before implementation. Additional reconciliation, formatting-target, introduced-link bytecode and unknown-preparation regressions also failed before their fixes. Final suite: **28 passed**, including original Kiota coverage. |
| `task agent:prepare` | Passed; documentation+harness class requires no application formatting/generation. No source mutation. |
| `task agent:finish` — first integrated run | Failed correctly: documentation and 27 tests passed, but content identity changed when unittest updated untracked Python bytecode. No success was attached to a post-test identity. The rejected tested identity was
  `a6be7c1384c6a59850489ff34e5dd3059cc5a40ad51a40fb201c2ed08441e020`. Agent Taskfile commands now use `-B`; only generated pyc paths absent from the starting inventory were removed. |
| `task agent:finish` — final candidate | A captured passing candidate run is in [finish evidence](hm-d-finish.json). The authoritative local `.task/agent-finish/last-run.json` additionally verifies the final evidence-file updates, with its exact pre-test identity, individual statuses and mutation verdict. Its automated pass does not close blocked task-specific candidate qualification. Final command/result is also reported in the session. |
| `python3 .kiro/specs/harness-modernization/evaluation/validate-package.py --smoke` | Passed frozen package parsing/hashes/links and all eight deterministic seeded/positive controls, including F05/F07. This command does not invoke a model or load the candidate. |
| F05/F07 focused operator controls | Passed exact Taskfile fixture commands and operator oracles in temporary directories; command output and before/after hashes are in [fixture evidence](hm-d-fixtures.json). F05 probe ran once and exited 3; static passed, live blocked, completion false, all payload bytes preserved. F07 seeded check failed, operator replacement tripled quantities, check/oracle passed, Other task section preserved. F07 is a fixed stale checkpoint replay, not a live interruption experiment. |
| `task agent:drift:routes` | Passed static controller/spec route comparison. |
| `task agent:drift:schemas` | Passed static DTO property/requiredness pattern comparison; no DB behavior claim. |
| `task agent:drift:mocks` | Passed ID/GUID-pattern audit; not schema or live mock parity. |
| `task agent:drift:endpoints` | **Blocked**: request to `http://127.0.0.1:5001/openapi/v1.json` failed with `Operation not permitted`; script exit 2, Task exit 201. No retry/startup. This proves a sandbox access block, not that the API is down. |
| `task agent:audit AREA=harness` | Passed advisory discovery; one PWA E2E and one API test matched text. Findings were not used to expand product changes. |
| Diff/introduced-link checks | Passed. Existing unrelated broken links in README/LOCAL_DEV_LOOP were identified but not migrated; regression covers checking newly introduced links without forcing historical cleanup. |

An intermediate `agent:prepare` classified the new spec `.patch` evidence artifact
as unknown and started `gen:client`. The operator interrupted it before generation
changed application source; Task reported interrupt, the owned group was stopped,
and preparation returned blocked without retry. A regression now recognizes spec
diff artifacts as documentation and blocks unknown preparation before writes; unknown
verification still selects the full union. Starting application hashes remained exact.

One timeout-test red run had an incomplete mock at the old subprocess boundary and
accidentally attempted Playwright startup on localhost:3000. Sandbox `EPERM` stopped
startup; the attempt failed, was not counted as E2E evidence and was not retried.
After correcting the test boundary, all application tracked/untracked source hashes
matched the starting inventory. Ignored runtime reports may have been generated;
no shared-process kill or cleanup was attempted.

## Blocked/not-run evidence and remaining limitations

Python 3.14.7, Node 26.8.2, Task 3.53.1 and Codex CLI 0.153.4 were observed on macOS.
A read-only Docker info probe was denied at the default sandbox socket boundary.
No fresh pinned model runner with dedicated process/filesystem/ports, absent host
memory and evaluator-inaccessible materials was provisioned. CLI presence and HM-C's
older Docker observations cannot establish it. **F05 and F07 candidate model runs are
blocked at runner setup**, with no baseline/candidate pair, model transcript, telemetry
or model score. Portable controls do not substitute for them. All prior Codex,
Antigravity/Gemini/Flash qualification remains unqualified; no adoption claim.

Application lint/type/unit/E2E/API, real database behavior and live Kiota generation
are not applicable to this harness-only candidate's automatic class checks; their
runner paths/ordering are covered by harness tests/source inspection, not full WFS
execution. Real task-specific DB evidence remains an explicit blocked obligation for
contract/schema work; generic API tests or static parity cannot discharge it.

Identity hashing deliberately includes actual installed inputs and can cost more than
a changed-file-only cache. It detects pre/post mutation, not transient writes that
are reverted before observation; concurrent writers must be excluded by the runner.
The isolation environment flag is an operator assertion after setup, never proof of
qualification. Final evidence files necessarily follow earlier checks; earlier
identities remain historical, and the final finish run validates the updated records.
No acceptance threshold was weakened to count missing candidate runs as passed.
