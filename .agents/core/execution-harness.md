# Execution harness

Use Taskfile.yml as the command interface; inspect the selected targets and their
scripts before execution. Commands do not grant authority to reset data, kill shared
processes, stage files or extend the selected task. A worktree alone does not isolate
processes, ports or databases.

## Completion and preparation

`task agent:finish` is the single applicable implementation completion entrypoint.
It selects checks from tracked, staged and untracked paths; mixed classes take their
union and unknown paths select the conservative union. No-change/review-only work
records findings without implying tested implementation. Task-specific acceptance
and isolated model/host qualification remain separate obligations in the task evidence.

| Change class | Applicable checks |
|---|---|
| Documentation | Changed links, Python syntax where present, diff whitespace; review instruction meaning |
| Harness | Documentation checks and `task test:agent`; selected loading/fixture checks remain explicit task evidence |
| Application | Documentation, lint/types, unit/API/impact tests and static contract/client checks |
| Contract/schema | Application checks plus live endpoint parity and task-specific real database behavior |
| Unknown | Union of all classes; never silently reduce verification |

Before final verification, run `task agent:prepare` after inspecting its effects.
It generates the client for contract changes, then formats application code. Unknown
preparation blocks before writes until paths/effects are classified; unknown final
verification still selects the full union.
Documentation/harness preparation requires no application generation or formatting;
fix relevant syntax/whitespace before final checks. Review the resulting diff and
preserve unrelated work. `gen:client:sync` also stages files and is not preparation.

Finish performs no formatting/generation in the source tree. Agent Python commands
use `-B` to avoid adding/updating bytecode during verification. Kiota check generates
and formats only in its temporary output directory. `review` remains a reusable
application validation target, with no formatter or process-kill step; it does not
include E2E and is not a second completion workflow. `gate` is the developer loop
and still kills processes: inspect its effects and use dedicated resources.

Finish captures content/config/runtime identity before verification and checks it
after every check. Mutation fails content evidence and leaves remaining checks
not-run. Its JSON record is `.task/agent-finish/last-run.json`; later edits invalidate
that identity and require new applicable verification. Record evidence-file updates
as later documentation content rather than attaching old success to a new digest.

`agent:test:impact` includes tracked/untracked changes and falls back to all E2E for
unknown/unmapped application paths. Cache identity covers all tracked/untracked source,
configuration, installed dependencies/browser bytes, tool executables and hashed
runtime/environment inputs. Success is stored only under the pre-test identity when
post-test identity agrees. CI and `WFS_DISABLE_TEST_CACHE=1` disable reuse, not mutation
detection. Reuse additionally requires `WFS_ISOLATED_RUNNER=1` and no external
`BASE_URL`. The cache cannot prove external live-service state; E2E must use the
repository's mocked API boundary.

## Effects, blockers and supporting commands

- `task agent:reconcile` and `agent:drift:routes` inspect source route coverage;
  `agent:drift:schemas` checks DTO property/requiredness patterns;
  `agent:drift:mocks` audits ID/GUID patterns. None proves live API/database behavior.
- `task agent:drift:endpoints` probes the generated live API specification once.
  Unavailable service is blocked (script exit 2), not zero mismatches.
- Finish requires dedicated processes/ports/data for E2E/API tests. Set
  `WFS_ISOLATED_RUNNER=1` only after establishing them; this is an operator assertion,
  not host/model qualification. Missing task-specific real database evidence remains
  explicitly blocked and must be recorded with its actual command and tested identity.
- A timed-out/interrupted finish child group is stopped and reaped without retry.
  Kiota retains its compatible runtime, clean-output and one-shot timeout behavior.
  Correct the cause before a new authorized attempt; monitor a running command only.
- `task agent:audit AREA=<keyword>` (backed by `test:audit`) is optional, advisory and
  bounded to affected coverage. Heuristics never require unrelated cleanup or deletion.
- `task agent:slice -- <route>` and `task agent:api` support static navigation.
  `task agent:status` remains the explicit HANDOVER reader under context-loading policy.

Inspect `.task/agent-finish/last-run.json` and report passed, failed, blocked, not-run
and not-applicable separately. A passing static check cannot cancel a blocked live
check. Finish records automated checks only; do not claim completion while selected
acceptance, fixture or loading evidence is missing.
