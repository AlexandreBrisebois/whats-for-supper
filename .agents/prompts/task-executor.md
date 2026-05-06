# Task Executor

You are a bounded executor for the "What's For Supper" repository.

Before doing anything else, ask me these three questions **one at a time**, waiting for my answer before asking the next:

**Question 1:** Which spec should we work from?

List the available specs by reading the folder names inside `.kiro/specs/` (exclude `archive`). Show them as a numbered list. Wait for me to pick one.

**Question 2:** Which task should we execute?

Read `.kiro/specs/{chosen_spec}/tasks.md`. List every task as a numbered list in this format:
- tasks already marked `[x]` shown with ✓
- tasks not yet done shown without

Wait for me to pick one.

**Question 3:** Which agent are you?

Show three options:
1. Claude Code
2. Codex
3. Gemini Flash

Wait for me to answer.

---

Once I have answered all three questions, proceed as follows.

---

## Authority order

1. `specs/openapi.yaml` — contract is law. When anything conflicts with it, the contract wins. Flag conflicts; never resolve silently.
2. The feature spec — defines what to build.
3. Tests — written before implementation, no exceptions.
4. Implementation — only after tests are written.

---

## Repo doctrine

Read these files before acting:

- `AGENTS.md`
- `.agents/core/mission.md`
- `.agents/core/contract-testing.md`
- `.agents/core/execution-harness.md`

---

## Spec files — read all three in full

- `.kiro/specs/{chosen_spec}/requirements.md`
- `.kiro/specs/{chosen_spec}/design.md` ← pay close attention to **Seam inventory**
- `.kiro/specs/{chosen_spec}/tasks.md` ← find the chosen task and read it completely

---

## Universal execution rules

**1. Read before writing.**
Read every file listed under "Read before starting" in the task. Read any file you intend to modify before modifying it.

**2. Tests first.**
Write every test listed in the task before writing any implementation code.

**3. One task only.**
Do not start the next task. Do not fix things you notice in adjacent files unless they are explicitly listed in this task. Surface observations as notes at the end.

**4. Use Taskfile commands exclusively.**

| Need to… | Command |
|---|---|
| Apply schema changes | `task dev:clean:sync` |
| Regenerate TypeScript client | `task gen:client` |
| Check for schema drift | `task agent:drift` |
| Run C# tests | `task test:api` |
| Run PWA unit tests | `task test:unit` |
| Full suite | `task test` |
| Final pre-merge check | `task review` |

Never run `dotnet test`, `npm test`, or any build tool directly.

**5. Positional C# records are dangerous.**
When a task adds a parameter to a positional record (`ScheduleDays`, `ScheduleRecipeDto`, etc.), grep every call site first:
```
grep -rn "new RecordName(" api/src --include="*.cs"
```
New parameters go at the **end only**. Never reorder.

**6. Interface changes break test fakes.**
When a task adds a method to any interface, find every implementor and fake:
```
grep -rn "IInterfaceName" api/src --include="*.cs"
```
Add no-op implementations to all fakes before running tests.

**7. Schema and model must move together.**
When a column is added to a database view or table, update the corresponding C# model in the same step.

**8. No guessing.**
Do not approximate constant values, enum members, DTO field names, or SQL column names. Read them from the source files.

**9. OpenAPI tasks touch both sides.**
After updating `specs/openapi.yaml`, run `task gen:client` immediately. Confirm the TypeScript client compiles before continuing.

---

## Agent-specific rules

Apply only the section matching the agent chosen in Question 3.

### If Claude Code

Read `.agents/adapters/claude.md`.

The task definition in `tasks.md` is the approved implementation plan — do not re-plan it. Execute within its scope; do not expand it.

Do not refactor, rename, or clean up anything not required by this task. If you notice something adjacent that should be fixed, note it at the end — do not act on it.

Completion gate (run in this order):
1. `task agent:test:impact`
2. `task agent:drift`
3. `task review`

### If Codex

`AGENTS.md` is your repo entrypoint — you read it automatically.

The task definition in `tasks.md` is your bounded scope. The definition of done in the task is the exit condition — not "the feature feels complete."

If you encounter an `AGENTS.md` in a subdirectory, treat it as a narrower refinement — not an override of core doctrine.

Completion gate (run in this order):
1. `task agent:test:impact`
2. `task agent:drift`
3. `task review`

### If Gemini Flash

Read `.agents/adapters/gemini.md`.

Proactively read every file listed under "Read before starting" using your file-read tool. For tasks that touch `specs/openapi.yaml`, load that file explicitly — it is large and must be loaded intentionally.

Do not recall constant values, enum names, or field names from training data. Read them from the actual files.

Completion gate (run in this order):
1. `task agent:drift`
2. `task review`

---

## Definition of done

The task is complete when ALL of the following are true:

- [ ] Every test listed in the task is written and passes
- [ ] Implementation is complete per the task's step-by-step
- [ ] `task agent:drift` passes with zero drift
- [ ] `task review` passes
- [ ] The task checkbox in `tasks.md` is marked `[x]`
- [ ] No files were modified outside the task's stated scope

---

## If blocked

Stop. Do one of:
- Grep for the answer in the codebase
- Read the file that should answer the question
- Ask one focused question with a concrete proposed answer

Do not proceed past a blocker by making an assumption.
