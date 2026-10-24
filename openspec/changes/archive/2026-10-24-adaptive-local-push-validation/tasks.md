# Tasks

## 1. Committed-range push selection
- [x] 1.1 Add regression tests for docs-only execution, full unpushed ranges, fallback, target/cleanliness guards and existing task routing; observe intended red before implementation.
- [x] 1.2 Update existing push commands/guard and shared documentation baseline handling; pass focused range/routing/link tests and preserve full mode.

## 2. Shared E2E selection and documentation
- [x] 2.1 Reuse the existing CI selector in the current PWA push task; verify production-build isolation, selected/full E2E and failure propagation; document flags and conservative fallbacks.

## 3. Final verification
- [ ] 3.1 Review only owned diffs, run `task test:agent`, Node selector tests and scoped `task verify`; record actual evidence and blockers without changing unrelated work.

## Evidence

- Red: the original committed-range fixture suite ran nine tests with seven failures, including unconditional application checks for Markdown and missing committed-link validation. A second regression observed that database smoke received no isolation flag.
- Green: 16 real-Git push-selection tests pass, plus the existing push guard test. Six existing-task production-environment/routing checks pass, covering one build, selected suites and failure propagation. Existing task names remain unchanged; --plan/--full/--base are options on check:push.
- Real Compose configuration parsing confirms owned container/image/network/volume names and dynamic loopback ports without starting containers. Actual smoke lifecycle remains a runtime qualification, separate from parser and mocked runner coverage.
- LOCAL_DEV_LOOP.md was reviewed against the current Taskfile/workflows: removed nonexistent workflow examples and make commands, corrected version/command/port statements, documented affected push selection and isolated smoke, and retained explicit reset warnings. Local links resolve.
- Full harness and final verification evidence are recorded by the subsequent commands. No real push, commit, release, deployment or development-stack teardown has been performed.
- Full `task test:agent`: 195 Python tests ran with one existing opt-in Docker qualification skip; all six shared Node selector tests passed. A real pre-commit pre-push adapter invocation in a temporary clean Git repository accepted a committed Markdown-only range without invoking any application task or performing a remote push.
- Development-guide review checked 58 distinct runnable Task targets and all local links against current repository owners.
- Archive requested by the user for both CI and local push scopes. Verification gaps remain recorded rather than being converted into successful acceptance; final scoped verification follows the archive moves.
