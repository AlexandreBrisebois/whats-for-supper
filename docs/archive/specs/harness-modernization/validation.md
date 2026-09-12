# Phase 0 validation

Status: Phase 0 complete. Subsequent [HM-A candidate evidence](hm-a-validation.md) is recorded separately; HM-B through HM-Q remain unexecuted.

Baseline: `13fcddedffa9c2a07b2498afb530e7906394b006`. Validation date: 2026-09-09.

| Check | Actual result |
|---|---|
| Package structure and parsing | Passed: YAML/JSON parse, Python fixture/checker syntax, local Markdown links and destination existence checks. |
| Baseline identity | Passed: 143 artifact SHA-256/byte counts and 33 exact Taskfile target-block fingerprints match the recorded commit. |
| Coverage and ordering | Passed: all 14 requirements, seven acyclic tasks, nine retirements/ten retained skills, and live caller migration ordering. |
| Fixture integrity | Passed: eight scenarios and all 37 setup-payload hashes. |
| Portable fixture smoke | Passed: all eight seeded outcomes, initial oracle outcomes and positive controls. |
| Additional negative controls | Passed: reject unchanged SQL constraint, fabricated persistence and effects emitted before data is ready. |
| Existing harness regression baseline | `task test:agent`: 11 tests passed. These are current tooling tests, not host/model behavioral tests. |
| JSON Schema | JSON parses; core structure and consistency constraints reviewed. A full third-party JSON Schema meta-validator was not available in this environment; the package checker does not claim to implement one. |
| Scope | New specification package only; no tracked harness or application edits. |
| Model evaluations / native host probes / token comparison | Not run; intentionally deferred. No candidate is behaviorally qualified by Phase 0. |
| Full application/finish gate | Not run: Phase 0 is confined to specification and fixture artifacts; existing full gates can format files and stop shared processes. |

## Reproduce

```sh
python3 .kiro/specs/harness-modernization/evaluation/validate-package.py --smoke
task test:agent
git status --short
```

The fixture checker uses temporary directories and disables Python bytecode writing to avoid stale timestamp-based cache reuse between seeded and positive control content. Expected failing seeded tests are benchmark controls, not WFS product failures. Positive controls test evaluator feasibility; model task sequencing, tool honesty and scope still require transcript review during real evaluations.

## Read-only review closure

Two independent reviewers inspected the manifest/dependencies and evaluation design. Corrections included retained team-orchestration caller updates before prompt-planner retirement; preservation of incidental CI/package/ADR references; nested native shim classification; AWS task coverage; historical arcive/ references; independent SQL/persistence observation; intermediate async assertions; and schema constraints rejecting contradictory passing results.

Phase 0 stops here. No skill was retired, no memory source was rewritten, and no model evaluation was launched.
