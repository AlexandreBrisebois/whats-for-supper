# Skills Index

Load skills on demand only — never globally. A skill is loaded when the active adapter or feature spec names it, or when the trigger condition below clearly matches the active task.

| Skill | File | Load when… | Do NOT load when… |
| :--- | :--- | :--- | :--- |
| `database` | [database/SKILL.md](database/SKILL.md) | Adding or modifying PostgreSQL schema, compatibility SQL or EF mappings | No DB schema changes in scope |
| `dotnet-dev` | [dotnet-dev/SKILL.md](dotnet-dev/SKILL.md) | Implementing or fixing C# backend behavior | Frontend-only or spec-only changes |
| `nextjs-dev` | [nextjs-dev/SKILL.md](nextjs-dev/SKILL.md) | Implementing Next.js features/components to spec | Debugging existing failures or backend-only work |
| `nextjs-qa` | [nextjs-qa/SKILL.md](nextjs-qa/SKILL.md) | Diagnosing Next.js test failures, hydration/UI state or E2E flakiness | New feature implementation |
| `openapi-expert` | [openapi-expert/SKILL.md](openapi-expert/SKILL.md) | Maintaining approved API contracts, generated clients, examples or stateful mocks | No API seam work in scope |
| `workflow-author` | [workflow-author/SKILL.md](workflow-author/SKILL.md) | Creating a new YAML workflow wired into the WorkflowOrchestrator | Editing existing workflow logic only |
| `designer` | [designer/SKILL.md](designer/SKILL.md) | Making UI/UX or visual design decisions (Solar Earth aesthetic) | Non-visual backend or infra work |
| `aws-well-architected` | [aws-architect/SKILL.md](aws-architect/SKILL.md) | Designing AWS infrastructure, choosing services, landing zone setup, cost decisions, or GitHub Actions CI/CD targeting AWS | No AWS infrastructure in scope |

OpenSpec owns specification planning, review, artifact formats and task application.
Repository skills provide technical guidance within the selected change; they do
not introduce a separate specification writer or task-executor workflow.

Investigation and bounded delegation use [context loading](../core/context-loading.md#investigation)
and the conditional [WFS source map](../core/wfs-source-map.md). API design guidance
lives with [openapi-expert](openapi-expert/api-design-principles.md); persistence
operations live with [database](database/SKILL.md).

For explicitly requested skill authoring, use the host's skill-authoring guidance
when available. Repository skills live under `.agents/skills/`; update this registry
when their discovery names or triggers change. Preserve established discovery names
when they differ from folder names. Keep shared policy with its existing owner and
check frontmatter, reference links and applicable harness validation.

For an explicitly scoped retirement of code or documentation, consult the optional
[retirement review](../references/retirement-review.md) for consumer migration and
preservation of unique information.
