# Context Loading

## 1. Context principle
Agents must load the minimum context required to safely and accurately complete the current task. Over-loading context increases token consumption, dilutes focus, and raises the risk of hallucination or unintended side effects.

**Surgical Context Discipline**: Do not perform broad `grep` or `list_dir` searches. Use the **`tracer`** skill to establish vertical context. State your intent and what you are seeking before reading new files to allow for user intervention.

## 2. Minimum necessary context
Always prefer targeted, active task context over broad, repo-wide reads. Read only the files directly impacted by the current objective, their immediate dependencies, and the specific specifications governing those features. 

## 3. Minimum necessary change
Before finalising any plan, evaluate the smallest set of changes that achieves the goal. Apply the same minimality discipline to what you write as to what you read.

Ask explicitly:
- Can this be done by modifying one file instead of several?
- Does this require a new abstraction, or can an existing one be extended or reused?
- Is any planned step speculative — useful in the future but not required by the current task?

Reject any planned change that cannot be directly traced back to the current task's stated goal. Scope creep in plans is as harmful as scope creep in execution. If a "while I'm in here" improvement is genuinely valuable, surface it separately rather than folding it into the current task.

## 4. Priority loading order
When establishing context for a task, load information in the following priority order:
1. **Active Task State**: The current objective and immediate next steps.
2. **Contract and Specs**: The OpenAPI specification or relevant roadmap documents governing the feature.
3. **Targeted Code**: The specific vertical slice or directly impacted source files.
4. **History (Selective)**: Handover, journal, or history files should be loaded only when resolving ambiguity regarding past decisions or active workflows, not reflexively on every turn.

## 5. Escalation and decomposition
When a task involves high entropy, architectural ambiguity, or requires a context window that exceeds safe operational limits, do not attempt to load the entire project state. Instead, decompose the work. Use atomic delegation to break the task into smaller, highly focused build prompts or sequential turns with isolated context boundaries.

## 6. Context hygiene
Actively manage context throughout the session. Summarize findings, document decisions, and narrow the active context window rather than repeatedly loading the full project state across multiple turns. Discard irrelevant or outdated context when moving between discrete phases of a task.

## 7. Skill loading
Skills in `.agents/skills/` are load-on-demand only.
Load a skill only when:
1. the active adapter instructs it for the current task type, or
2. a feature spec or task explicitly names the skill.

Do not load skills globally by default.
Use only the minimum subset of skills required for the current bounded task.

## 8. Repository reference map

Use this table to locate resources without scanning the filesystem. Load only what the current task requires.

| Resource | Location | Load when… |
| :--- | :--- | :--- |
| Roadmap | `specs/00_STRATEGY/ROADMAP.md` | Starting any new task — identifies active vs planned phases |
| OpenAPI spec | `specs/openapi.yaml` | Any contract, DTO, or route change |
| ADRs | `specs/decisions/` | Task conflicts with or extends a past architectural decision |
| Feature specs | `.kiro/specs/` | Active feature has a spec — read it before touching that feature |
| Build prompts | `specs/prompts` | Looking for a pre-written implementation prompt for the current task |
| Mockups | `specs/mockups/` | UI work requiring design reference |