# Skills Index

Load skills on demand only — never globally. A skill is loaded when the active adapter or feature spec names it, or when the trigger condition below clearly matches the active task.

| Skill | File | Load when… | Do NOT load when… |
| :--- | :--- | :--- | :--- |
| `contract-engineer` | [contract-engineer/SKILL.md](contract-engineer/SKILL.md) | Defining or changing API seams (routes, DTOs, shared types) | Reading existing routes only |
| `create-prompt` | [create-prompt/SKILL.md](create-prompt/SKILL.md) | Decomposing a feature into bounded build prompts for Kiro / Antigravity / Claude | Executing an already-written prompt |
| `database` | [database/SKILL.md](database/SKILL.md) | Adding or modifying PostgreSQL schema or EF Core migrations | No DB schema changes in scope |
| `death-audit` | [death-audit/SKILL.md](death-audit/SKILL.md) | Eliminating zombie code, dead exports, or stale documentation | Normal feature work |
| `dotnet-dev` | [dotnet-dev/SKILL.md](dotnet-dev/SKILL.md) | Writing or modifying C# / .NET 10 backend logic | Frontend-only or spec-only changes |
| `nextjs-dev` | [nextjs-dev/SKILL.md](nextjs-dev/SKILL.md) | Writing or modifying Next.js 15 RSC / PWA components | Backend-only or spec-only changes |
| `nextjs-qa` | [nextjs-qa/SKILL.md](nextjs-qa/SKILL.md) | Writing or fixing Playwright E2E tests | Unit/integration tests only |
| `openapi-expert` | [openapi-expert/SKILL.md](openapi-expert/SKILL.md) | Editing `specs/openapi.yaml` or regenerating the Kiota client | No spec changes in scope |
| `session-review` | [session-review/SKILL.md](session-review/SKILL.md) | End of a session — updating HANDOVER.md and memorialising decisions | Mid-session implementation work |
| `shared-understanding` | [shared-understanding/SKILL.md](shared-understanding/SKILL.md) | Stress-testing a plan before execution to surface hidden gaps | Plan already approved and execution is underway |
| `team-orchestration` | [team-orchestration/SKILL.md](team-orchestration/SKILL.md) | Acting as Lead Developer across multiple parallel agents or sub-tasks | Single-agent, single-task work |
| `testing` | [testing/SKILL.md](testing/SKILL.md) | Setting up or restructuring the test strategy or QA pipeline | Adding tests within an already-established pattern |
| `workflow-author` | [workflow-author/SKILL.md](workflow-author/SKILL.md) | Creating a new YAML workflow wired into the WorkflowOrchestrator | Editing existing workflow logic only |
| `designer` | [designer/SKILL.md](designer/SKILL.md) | Making UI/UX or visual design decisions (Solar Earth aesthetic) | Non-visual backend or infra work |
