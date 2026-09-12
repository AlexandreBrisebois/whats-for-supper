# HM-E — memory and specialist cleanup evidence

Date: 2026-09-11. Status: implemented; required native loading and candidate F07
verification are **blocked/not-run**, so HM-E acceptance remains open. HM-Q is
unselected. No candidate adoption, commit, push, deployment or application behavior
change is authorized or performed.

## Dependency decision and starting state

Starting HEAD: `52e2ed2d3505d74020e7628fc83c53e1019f63e1`, branch `harness-upgrade`.
Git status was clean (no unrelated tracked or untracked work). Starting tracked and
untracked path hashes were captured in `/tmp/hm-e-start.json`; durable before/after
and verification-source hashes are in [content evidence](hm-e-content.json).
One implementation writer made dependent edits sequentially; no delegated writers.

[HM-D evidence](hm-d-validation.md), its captured finish JSON, current Taskfile and
`scripts/agent/finish.py` distinguish automated checks from task acceptance, support
explicit preparation, check input identity for mutation, and preserve blocked checks.
The 28 pre-existing agent regressions remain in the now-30-test suite. This supports
HM-E implementation under the explicit user selection without pretending HM-D is
accepted. HM-D's task status remains `implemented-verification-blocked`, checkbox
open, and its F05/F07 candidate/model/native qualifications unchanged. There is no
concrete unmet implementation dependency requiring memory work to stop. Missing
candidate evidence remains a qualification dependency, not a deterministic pass.

All primary HM-E inputs matched their frozen manifest baseline except registry and
Taskfile, which contain the approved prior-slice migrations. Shared core destinations
also retain their A–D changes. The manifest, prior evidence, evaluation protocol,
fixtures, archived specs and existing ADRs are unchanged; the closure check compares
them with starting HEAD. Host/global memory was neither edited nor synchronized.
The quick host-memory registry search returned no HM modernization entries and supplied
no task facts. Repository `.agents` writes needed sandbox escalation, approved without
an automatic-review rejection; no extra user permission interview was introduced.

## Changes and provenance

- [Ledger](hm-e-ledger.md) maps repository memory, all checkpoint facts and useful
  session-review content to verified owners or deliberate obsolete/duplicate decisions.
  [JOURNAL inventory](hm-e-journal-inventory.json) covers all 1,325 starting lines in
  58 contiguous sections. JOURNAL's original body is byte-identical beneath its freeze
  notice. Unique unselected Pantry Pasta/quick-fix history and older unresolved AI
  validation remain explicitly historical, not newly authorized tasks.
- Network reference now distinguishes empty browser base/same-origin `/api` from
  absolute internal-server fetches, including explicit cookie/identity forwarding.
  It records literal-slash concatenation risk, legacy port defaults and differing
  DATA_ROOT compositions rather than importing false universal claims. No network
  configuration or application URL builder changed.
- ADR 044 preserves the verified branch-backlog/resumption rationale. Shared execution
  and context owners retain meaningful handoffs and task evidence; ontology defines
  resume checkpoint. The compact HANDOVER preserves release planning, .NET validation,
  generated/lockfile reconciliation and the still-skipped C7 test. It records the
  observed Preview 7 dotnet-ef versus Preview 6 runtime question without fixing it.
- Verified empty directories left by five prior retirements (including test-audit/scripts) were removed with `rmdir`; no file content was removed. Active registry caller and useful session-review procedures were migrated before
  retiring its entrypoint. `.agents/MEMORY.md` and `.agents/core/memory/` were retired
  only after salvage. There are exactly ten retained skill entries with complete
  registry rows and the preserved `aws-well-architected` discovery identity.
- Designer and its references point to actual CSS/font owners; Mère-Designer and
  caveman are explicitly scoped opt-ins, without persistent activation or savings
  claims. Existing CNF selected household-utility lens is preserved as that spec's
  explicit review choice, not a repository-wide persona. Death-audit is explicitly
  invoked bounded maintenance. Authoring prevents universal-policy duplication,
  compulsory generic skills and recursive loads.
- AWS entrypoint starts from WFS C# CDK and the manual OIDC deployment workflow.
  Supporting examples remain conditional, preserve useful specialized material, and
  require current verification for prices/versions/permissions before use. Generic
  compulsory interviews, acronym protocol, global cost/format mandates and service
  substitutions were removed. Existing AWS workflow/config was not altered.
- `agent:summary` now prints compact navigation only, without handover, registry,
  stale build-prompt listings or implicit drift work. `agent:status` still explicitly
  reads HANDOVER. LOCAL_DEV_LOOP documents those two behaviors. Focused executable
  regressions preceded the Taskfile edit.

Exact changed paths and dispositions are in `implementation_files` and
`evidence_files` in the content record. Additional destination/caller-only touches
are core network/context/execution/ontology, ADR 044, the summary documentation and
summary/status regression. These implement the HM-E graph/user effects and manifest
destinations; they do not rewrite the frozen manifest's prior ownership history.

## Actual checks

| Command/check | Result and limit |
|---|---|
| `task test:agent` before tooling edit | Expected red: 30 tests, one failure because real summary target printed checkpoint and registry sentinel content. Explicit status test passed. |
| `task test:agent` after tooling edit | Passed: 30 tests, including both real Task targets in disposable sentinel directories. Test-suite simulated timeout/unknown/cache messages are regression outputs, not live application runs. |
| Skill Creator `quick_validate.py` function, all ten retained directories | Passed frontmatter/name/placeholder validation. AWS version moved to metadata; discovery name preserved. This does not prove host-native skill loading. |
| Active `.agents` relative-link scan | Initial scan found three new designer links with one excess parent component; corrected. Corrected; final closure recorded below. |
| `python3 -B evaluation/validate-package.py --smoke` (full spec-relative path used) | First assembly run stopped at not-yet-created HM-E content record; not a passing check. Final assembled package passed: 143 frozen artifacts, 33 targets, 37 payload hashes, acyclic graph and all eight seeded/positive controls (including F07). Controls invoke no candidate/model. |
| `python3 -B .kiro/specs/harness-modernization/evaluation/check-memory-cleanup.py` | Passed: 58 sections/1,325 lines, nine retirements, ten skills, 55 active route files; hashes, scope, untouched original files and prior evidence preserved. |
| `task agent:summary`; `task agent:status` | Passed, exit 0: summary prints six navigation lines; status prints the active checkpoint only. Sentinel regressions also pass. |
| `task agent:prepare` | Passed, exit 0: documentation+harness class; no application formatting/generation. |
| `task agent:finish` | Passed, exit 0: documentation, 30 agent regressions and content identity. Captured run in [finish evidence](hm-e-finish.json); final evidence updates are checked again by the closing run. Its automated result does not discharge the native/candidate evidence below. |

Closure-script bring-up also found empty prior-retirement directories and a legacy
non-UTF-8 text input. Empty directories were inspected then removed; the read-only
caller scan now decodes unmatched bytes with replacement without changing the file.
Neither failed attempt was reported as passing closure.

## Selected native and interrupted-task checks

[Selected probe records](hm-e-probes.json) retain exact prompts and unavailable
measurements as null. Selected probes are LP-01 (fresh root navigation), LP-04 (fully specified fresh F01,
no history) and LP-05/F07 (fresh-session checkpoint replay with stale evidence).
HM-E's explicit user/task selection authorizes these focused probes despite the
older generic loading-probes header naming A/Q. No HM-Q paired benchmark was started.
F07 is a fixed pre-interruption checkpoint replay, not a live interruption test.

| Setup observation | Actual result |
|---|---|
| `docker info --format '{{.ServerVersion}}'` | Default sandbox socket access denied, exit 1. Approved read-only escalation returned Docker 29.7.2, exit 0. Docker is available; the initial error does not prove it is down. |
| `docker image ls --format '{{.Repository}}:{{.Tag}} {{.ID}}'` | Read-only inspection passed; existing images are application/database/proxy/utility images, with no identifiable prepared pinned model runner. No image pull/build/container or shared process changes. |
| Runtime/version checks | Codex CLI 0.153.4; Python 3.14.7; Node 26.8.2; Task 3.53.1; Gemini CLI 0.46.0. `antigravity` not found on PATH. Gemini CLI is not Antigravity qualification. |
| `file <installed Codex executable>` | Mach-O arm64 host binary, not a Linux-container runner. |
| `codex exec --help`; `codex login status` | Read-only help/status: local CLI supports fresh/ephemeral config controls and reports ChatGPT login. This is not a pinned Astra runner or proof of usable isolated auth/native tracing. No credentials copied and no model invocation. |

**LP-01, LP-04, LP-05 and F07 candidate: blocked at isolated runner setup; model
invocations not-run.** A dedicated model-capable process/filesystem environment with
an absent host memory profile, pinned model/settings, non-exposed evaluator material
and usable authentication/native-load diagnostics was not provisioned. The available
host CLI has read access to evaluator/history and host context; pointing it at a
worktree or reusing this session would not meet isolation. Docker availability alone
does not supply its Linux host tooling/profile/authentication. Antigravity and the
selected Gemini/Flash configurations remain unavailable/unqualified. The already-supplied session skill catalog is not rewritten by repository retirement;
fresh host discovery remains unconfirmed. No model scores,
fresh/resumed token comparison, native load trace, duplicate-body metric, interruption
behavior or efficiency result was invented. Static closure, sentinel target tests and
package controls are explicitly not substitutes.

## Acceptance and limitations

HM-E implementation/retirement closure is reviewable; **HM-E acceptance is not
complete** while required native fresh/resumed and candidate F07 evidence is missing.
HM-D remains open and unqualified, with all prior evidence intact. HM-Q/adoption was
not performed. No real WFS lint/type/unit/E2E/API/database/build/deployment checks are
claimed by this documentation/harness slice. Source-inspected network and historical
facts are bounded by their recorded bytes, not live production assertions.

Evidence documents necessarily follow some checks. The content record hashes operative
files and source verification inputs separately from evidence documents; a captured
finish result belongs to its own tested identity. A final `agent:finish` after evidence
updates must pass for the assembled working tree; its current `.task/agent-finish/last-run.json`
retains that exact identity without recursive self-hashing.
