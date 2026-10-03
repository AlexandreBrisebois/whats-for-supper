---
name: feature-specification
description: Create, revise, classify, or discover WFS feature specifications through the canonical registry, shared workflow, prompts, and harness.
---

# WFS feature specification workflow

Use this skill when the request is to create or revise a WFS feature specification,
or to decide whether a requested behavior already has a specification. It does not
authorize product implementation.

## Start with registry discovery

Run `task spec:search -- "<behavior and domain terms>"` before creating a folder.
Read matched current, planned, and relevant legacy-source entries. Choose one
outcome: revise an existing package, create a descriptive new package, promote an
exploration, split legacy material, or use a bounded execution packet.

New active folders use a durable lowercase kebab-case behavior or platform-outcome
name. Do not create a new numeric/category prefix, session-number folder, or a
duplicate sibling of a registered package. Update `spec-registry.yaml`, run
`task spec:index`, and verify with `task spec:check` whenever package
classification changes.

## Write and review

Follow the [shared specification workflow](../../core/specification-workflow.md)
and use the [spec writer](../../prompts/spec-writer.md) or
[spec reviewer](../../prompts/spec-reviewer.md) prompt for the selected mode.
Current capability baselines describe implemented behavior and its real boundaries;
they are not test reports or fictional implementation backlogs. Planned features and
platform initiatives use `requirements.md`, `design.md`, and `tasks.md`.

For any future implementation task with browser/API behavior, name its unit/API
tests, Playwright scenario, mock owner, route/method, and expected contract shape in
the task's Test seam section. The mock is implemented with that vertical slice, not
retrospectively.

## Harness

Before the first spec edit use `task agent:begin -- <task-id>`. After edits, run
`task spec:check`, then follow the shared preparation, scope review, and finish
procedure in [execution harness](../../core/execution-harness.md). Documentation
checks validate registry/spec structure and links; they do not certify runtime
behavior or replace implementation-task checks.
