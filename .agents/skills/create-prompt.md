---
name: create-prompt
description: Generate bounded engine Tasks with explicit model-fit labels for Kiro, Antigravity, and Claude, defaulting to the smallest viable model.
---

# Skill: Create Prompt

## Mission

Turn a vague or high-level implementation request into one or more **launch-ready workstream Tasks** that are:
- bounded,
- test-first,
- low-context,
- executable by the smallest viable model,
- reusable in Kiro, Antigravity, or Claude.

Your job is not to solve the feature directly. Your job is to package the work so another agent can execute it safely with minimal ambiguity.

**Primary artifact:** an engine Task.  
**Secondary artifact:** an optional markdown export of the same Task for `build-prompts/` or manual review.

---

## Rules

### 1. Resolve ambiguity first

If the task is underspecified, conflicting, or architecturally unclear, stop and use [shared-understanding](.agents/skills/shared-understanding.md) before generating Tasks.

Do not emit workstreams for unresolved intent.

---

### 2. Default to small models

Always try to make the task executable by a **small model** first.

Use these labels:

- `SMALL_SAFE`  
  Narrow file set, stable pattern, clear test target, no contract design.

- `MEDIUM_REQUIRED`  
  Moderate reasoning, several files, existing slice, some coordination needed.

- `LARGE_REQUIRED`  
  Cross-layer design, unresolved ambiguity, contract/schema design, or high blast radius.

You must choose the **smallest viable label** and explain why.

---

### 3. Decompose into bounded workstreams

Split the work into isolated tasks, usually in this order:
1. Database
2. Backend
3. Frontend
4. Tests / cleanup

A single workstream should usually:
- touch at most 1–3 files,
- have one clear outcome,
- have one verification path,
- avoid refactoring unrelated code.

If a workstream grows beyond that, split it again.

---

### 4. Minimize context

Only include the minimum context required:
- exact target files,
- exact seam references,
- exact test location,
- exact commands.

Do not dump broad repo background into the Task.

Exclude irrelevant directories and unrelated slices.

---

### 5. Optimize for execution, not style

For small models:
- provide exact file paths,
- provide exact method/component target zones,
- provide exact commands,
- forbid unrelated edits,
- avoid open-ended wording.

Use imperative language:
- `Implement ONLY ...`
- `Do NOT modify ...`
- `Stop and escalate if ...`

---

### 6. Make outputs task-first

Every generated work item must be expressed first as an **engine Task**.

A markdown prompt file is optional and should be treated as:
- a human-readable export,
- a durable artifact in `build-prompts/`,
- or a manual launch format for tools that do not consume Tasks directly.

Do not make markdown the canonical form if the engine can accept a Task payload.

---

## Prompt Generation Procedure

When asked to create workstreams, follow this sequence:

1. Clarify ambiguity if needed.
2. Identify the smallest valid execution slices.
3. Assign a model label to each slice.
4. Prefer `SMALL_SAFE` by reducing scope and supplying tighter constraints.
5. Emit one Task per slice.
6. Order Tasks by dependency.
7. Include a stop/escalation boundary in every Task.

### Task Emission Rule

When asked to create workstreams, emit:
1. the engine Task payload first,
2. then the optional markdown export only if requested or useful for storage/review.

If the orchestration environment supports Tasks directly, do not expand into markdown unless explicitly needed.

---

## Model Selection Heuristics

Use `SMALL_SAFE` when all are true:
- one vertical slice,
- no new contract design,
- explicit target files,
- clear existing pattern,
- deterministic test command.

Use `MEDIUM_REQUIRED` when any are true:
- 2–5 files in one slice,
- moderate reasoning,
- some adaptation of existing patterns,
- light coordination with neighboring code.

Use `LARGE_REQUIRED` when any are true:
- new contract or schema design,
- unresolved ambiguity,
- multiple workstreams must be coordinated together,
- high drift risk,
- repo-wide implications.

If a task starts as `MEDIUM_REQUIRED` or `LARGE_REQUIRED`, first try to split it into smaller `SMALL_SAFE` workstreams.

---

## Output Contract

Every generated workstream must be emitted as an **engine Task** first.

### Engine Task Schema

```yaml
id: <stable-workstream-id>
title: <short descriptive title>
model_label: SMALL_SAFE | MEDIUM_REQUIRED | LARGE_REQUIRED
why_this_model: <brief justification>
launch_targets:
  - kiro
  - antigravity
  - claude
owner_skill: <best-fit skill>
objective: <one exact outcome>

target:
  - <explicit path>
  - <explicit path>

forbidden:
  - <path or area that must not be touched>

required_context:
  - <contract reference>
  - <existing file + target zone>
  - <minimal seam/type reference>

task:
  - <bounded instruction>
  - <bounded instruction>
  - <bounded instruction>

tdd_gate:
  - <write or update failing test first>
  - <confirm failure before implementation>
  - <implement until tests pass>

verification:
  - <exact command>
  - <exact command>

escalate_if:
  - More than 3 files need edits
  - Contract/schema changes are required
  - New ambiguity appears
  - Unrelated tests fail

micro_handover:
  - changed_files
  - tests_run_and_results
  - deviations
  - risks_or_drift
```

### Optional Markdown Export

If a markdown export is requested, render the same Task in this format:

```md
# WORKSTREAM: <slug>

Model-Label: SMALL_SAFE | MEDIUM_REQUIRED | LARGE_REQUIRED
Why-This-Model: <brief justification>
Launch-Targets: Kiro, Antigravity, Claude
Owner-Skill: <best-fit skill>

## Objective
<one exact outcome>

## Scope

TARGET:
- <file path>
- <file path>

FORBIDDEN:
- <file path or area>

## Required Context
- Contract: <spec reference>
- Existing code: <file + target zone>
- Related types/seams: <only what is needed>

## Task
1. <bounded instruction>
2. <bounded instruction>
3. <bounded instruction>

Implement ONLY this task.
Do NOT refactor unrelated code.

## TDD Gate
- Add or update the failing test first.
- Confirm failure before implementation.
- Implement until the test passes.

## Verification
- `<exact command>`
- `<exact command>`

## Escalate If
- More than 3 files need edits.
- Contract/schema changes are required.
- New ambiguity appears.
- Unrelated tests fail.

## Micro-Handover
- Changed files
- Tests run and results
- Deviations
- Risks / drift discovered
```

---

## Quality Bar

A good Task:
- can be executed without rereading half the repo,
- has a single owner skill,
- has explicit file boundaries,
- has a clear done condition,
- can fail safely,
- tells the model when to stop.

A bad Task:
- mixes planning and implementation,
- spans too many files,
- hides contract decisions,
- relies on “use judgment” wording,
- lacks test commands,
- has no escalation boundary.

---

## Handover Requirement

Every executing agent must end with a Micro-Handover containing:
- changed files,
- test commands and results,
- deviations from Task,
- risks or drift to record in `HANDOVER.md`.