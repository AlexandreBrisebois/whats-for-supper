# Proposal

## Why
The local push hook unconditionally runs every API and PWA check, including a production build and full browser suite, for Markdown-only pushes.

## Outcome and Scope
Update existing `task check:push` and its existing child tasks to validate the complete committed range being pushed. Preserve clean-source and revision guards. Documentation avoids application tools; uncertain impact remains conservative. No duplicate task interface or worktree-diff routing.

## What Changes
- Classify committed from/to refs; manual invocation uses the upstream range, otherwise full validation.
- Select documentation/spec, tooling, API, PWA, contract and database checks by impact, unioning mixed changes.
- Reuse CI E2E suite selection; production builds occur once only when PWA checks apply.
- Add `--plan`, `--base` and `--full` to the existing command; retain existing guard behavior.

## Capabilities
Tooling only; `skip_specs: true` applies.

## Impact
Taskfile, existing push guard, hook label, documentation baseline checking, focused regression tests and local developer documentation. No application behavior or API contract change.
