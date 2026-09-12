# HM-C implementation and investigation evidence

Date: 2026-09-10. Status: implemented for review; candidate model fixtures and native
host qualification **blocked/unqualified**. Only HM-C was selected. HM-D is not begun.

## Inputs, authorization and preservation

The user selected HM-C from tasks.md, including requirements/design/task graph,
relevant manifest entries and HM-A/HM-B evidence, with one writer and parallel
read-only reviews. Starting HEAD was `55bd68f7961647fc9a3c4d754e8de2f46821b1e9`;
`git status --short` was empty. The manifest's original pre-migration baseline is
`13fcddedffa9c2a07b2498afb530e7906394b006`, not this task's starting checkout.

All HM-C-owned existing artifacts matched frozen baseline hashes except retained
team-orchestration, which matched its recorded HM-B identity as expected. Before
editing, 1,656 tracked file hashes were captured in a temporary operator inventory.
The final checker compares every tracked/untracked change to the clean starting
commit and an exact HM-C allowlist. No unrelated files were changed, staged, reset,
cleaned or stashed. Product source, SQL, Taskfile, scripts/agent, frozen fixtures,
HM-A/HM-B evidence and host/global memory are preserved. Context-loading, ontology
and registry are the intentional shared-owner updates; their historical A/B hashes
remain historical snapshots, not claims that those files never change afterward.

[Candidate/source identities](hm-c-content.json) include changed procedure bytes,
removal markers, evidence/checker bytes and verified source/tool inputs. The identity
file excludes itself to avoid a self-hash. [Fixture control inputs and results](hm-c-fixtures.json)
record exact prompts from the catalog (not supplied to a model), payloads/hashes,
operator replacements, commands and observed exits. These records distinguish
portable controls from candidate model executions.

## Migration closure

| Retired source | Useful destination | Removed procedure |
|---|---|---|
| team-orchestration | context-loading delegation/handoff and existing execution-packet template; active host adapter remains mechanics-only | Universal model/agent-count escalation, mandatory skill cascades, automatic contract resync and unrelated cleanup |
| tracer | context-loading investigation, conditional wfs-source-map, ontology navigation | Mandatory named-skill invocation; scripts/agent/slice.py and Taskfile slice/discovery targets preserved unchanged |
| contract-engineer | openapi-expert procedure and moved API design reference; database persistence guidance | Forced delegation to edit a contract and claimed storage/DTO shape identity |

API reference content and dotnet caller moved before the old directory was removed.
Surgical and vertical-slicing now use shared investigation. Registry has 13 actual
remaining entrypoints and their correct discovery names. HM-A/HM-B already migrated
spec-writer, spec-reviewer, AGENT and core incoming callers; those dependency changes
were preserved. Active reference scan covers .agents, .kiro, .github and specs,
excluding archive/arcive/05_ARCHIVE and this historical migration package.

Task-executor reuses supplied selection/host and authorization, keeps one-task scope,
consequential clarification and mandatory versus optional execution-packet content.
Surgical begins authorized investigation without an interview/readiness stop.
Delegation names inputs, ownership, acceptance and evidence; the lead remains the
sole writer here. Contract changes follow approved intent → tests → implementation;
no automatic contract rewrites or blanket no-spec-change rule remains in touched
procedures. Completion continues to route to the existing shared execution harness;
no HM-D completion/cache/tooling rewrite occurred.

Database guidance distinguishes schema-only preview from the full compatibility
prelude and apply. `task migrate` never implies reset or seed. `dev:clean:sync` is
identified only as prohibited substitution because it removes volumes/images.
Destructive data effects require explicit target/environment scope; migration
failure has no reset fallback. API DTOs, EF entities, JSONB snapshots and workflow
records remain distinct representations.

Verified source-map routes cover imports/reporting, workflow execution, planning
and groceries. Workflow authoring now uses actual bundled Workflows paths, YAML
`name`/task names and `Task<object?>` processor signature; contract and tests precede
endpoint implementation. Stateful frontend method dispatch/route precedence and
backend workflow persistence survive migration; fake success stubs are rejected.

## Actual checks

| Check / input | Actual result and limit |
|---|---|
| `python3 .kiro/specs/harness-modernization/evaluation/check-implementation-guidance.py` | Passed: three retirements, 13 registry entries, 23 documented Taskfile targets, 50 explicit source paths, changed Markdown links, exact diff scope, no staging, preserved tooling/prior evidence, candidate/source hashes. Static existence checks are supplemented by source review; they do not prove live behavior. |
| `python3 .kiro/specs/harness-modernization/evaluation/validate-package.py --smoke` | Passed: 143 frozen artifacts, 33 baseline target fingerprints, 14 requirements, seven tasks, eight scenarios, 37 payload hashes; seeded/positive controls for all eight and negative controls for old SQL, fabricated persistence and effect-before-data. No candidate harness loaded. |
| `python3 .kiro/specs/harness-modernization/evaluation/validate-package.py` | Passed final package parsing, hashes, links and Python syntax. Not a general JSON Schema validator. |
| `task test:agent` | Passed all 11 existing harness tests; no product or model behavior claim. |
| `task agent:slice -- /api/recipes` | Exit 0: found GET/POST contract, RecipeController handlers and generated route paths. Static navigation only; no live API/DB probe. |
| `git diff --check` | Passed after removing trailing-space findings; final added files also checked for trailing whitespace and parsed by candidate/package validation. |
| Two read-only candidate reviews | Authority/packet/dirty-worktree and source/commands/persistence reviews. Corrected UI-only endpoint wording, factory/storage/design paths, nonexistent GlobalUsings reference, workflow dependency names and overstatement of mock drift coverage. `agent:drift:mocks` is an ID/GUID-pattern audit, not schema validation. |

Environment observed: macOS host, Python 3.14.7, Node 26.8.2, Task 3.53.1,
Codex CLI 0.153.0. Docker info initially failed under the default sandbox; the
read-only permission escalation succeeded and reported server 29.7.2. Image listing
showed application/infrastructure images, no dedicated model fixture runner.
`codex exec --help` showed ephemeral/config controls, but neither help nor an installed
CLI establishes a fresh authenticated, pinned, memory-free runner with evaluator
material inaccessible. No credentials were read or copied to provision one.
Protected .agents writes required host permission escalation and succeeded; there
was no automatic-review rejection and no user authorization was re-requested.

## Fixture and host limitations

| Requested candidate fixture | Status |
|---|---|
| F02 UI busy state / labels / touch target | Candidate model execution blocked at isolated-runner setup; portable seeded/positive controls passed |
| F03 contract / tests / schema / generated client / real persistence | Candidate model execution blocked; controls passed, including rejection of old SQL constraint and fabricated persistence |
| F04 async readiness / ordering / duplicate / stale state | Candidate model execution blocked; controls passed, including rejection of effects before data |
| F06 dirty tracked/untracked bytes and Git status | Candidate model execution blocked; portable control passed; actual HM-C started clean, so no live dirty-worktree behavior claim |
| F08 misleading diagnostic output / protected files | Candidate model execution blocked; portable control passed; no model instruction-following claim |

The required disposable environment with separate processes/filesystem/ports, fresh
pinned model sessions, no inherited host memory and inaccessible operator fixtures
was not established. Docker availability alone does not meet those requirements.
No candidate fixture was supplied to a model; no model transcript, red/green ordering,
paired baseline run, token telemetry or latency measurement exists. Missing values
are null in the fixture record. No full HM-Q benchmark or adoption is claimed.
Existing HM-A/HM-B Codex and Antigravity (including Flash) host probes remain
unqualified; CLI presence and read-only subagent review do not qualify them.

Application/live-service/DB tests and `task agent:finish` were not run for this
procedural slice. Existing finish invokes impact → drift → review, and review can
stop shared processes and format/generate application files. This task uses HM-C's
explicit static/source/fixture-control checks and harness regressions; live model
fixtures stay blocked. This is recorded scope/evidence, not a new completion-policy
exemption. No schema was applied or data reset. Review the diff and these limitations;
stop here without HM-D, commit, push, deployment or host-memory changes.
