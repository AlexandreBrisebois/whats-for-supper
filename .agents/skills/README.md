# Skills Index

Load skills on demand only — never globally. A skill is loaded when the active adapter or feature spec names it, or when the trigger condition below clearly matches the active task.

| Skill | File | Load when… | Do NOT load when… |
| :--- | :--- | :--- | :--- |
| `database` | [database/SKILL.md](database/SKILL.md) | Adding or modifying PostgreSQL schema, compatibility SQL or EF mappings | No DB schema changes in scope |
| `death-audit` | [death-audit/SKILL.md](death-audit/SKILL.md) | Eliminating zombie code, dead exports, or stale documentation | Normal feature work |
| `dotnet-dev` | [dotnet-dev/SKILL.md](dotnet-dev/SKILL.md) | Writing or modifying C# / .NET 11 backend logic | Frontend-only or spec-only changes |
| `nextjs-dev` | [nextjs-dev/SKILL.md](nextjs-dev/SKILL.md) | Writing or modifying Next.js RSC / PWA components | Backend-only or spec-only changes |
| `nextjs-qa` | [nextjs-qa/SKILL.md](nextjs-qa/SKILL.md) | Writing or fixing Playwright E2E tests | Unit/integration tests only |
| `openapi-expert` | [openapi-expert/SKILL.md](openapi-expert/SKILL.md) | Editing `specs/openapi.yaml` or regenerating the Kiota client | No spec changes in scope |
| `session-review` | [session-review/SKILL.md](session-review/SKILL.md) | End of a session — updating HANDOVER.md and memorialising decisions | Mid-session implementation work |
| `workflow-author` | [workflow-author/SKILL.md](workflow-author/SKILL.md) | Creating a new YAML workflow wired into the WorkflowOrchestrator | Editing existing workflow logic only |
| `designer` | [designer/SKILL.md](designer/SKILL.md) | Making UI/UX or visual design decisions (Solar Earth aesthetic) | Non-visual backend or infra work |
| `aws-well-architected` | [aws-architect/SKILL.md](aws-architect/SKILL.md) | Designing AWS infrastructure, choosing services, landing zone setup, cost decisions, or GitHub Actions CI/CD targeting AWS | No AWS infrastructure in scope |
| `create-a-skill` | [create-a-skill/SKILL.md](create-a-skill/SKILL.md) | Explicit repository skill authoring | Ordinary feature planning |

Specification planning and review use the [shared workflow](../core/specification-workflow.md),
with the [execution-packet template](../templates/execution-packet.md) for bounded handoffs.
These are conditional procedures, not skill entrypoints.

Investigation and bounded delegation use [context loading](../core/context-loading.md#investigation)
and the conditional [WFS source map](../core/wfs-source-map.md). API design guidance
lives with [openapi-expert](openapi-expert/api-design-principles.md); persistence
operations live with [database](database/SKILL.md).
