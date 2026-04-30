# Skills Index

Load skills on demand only — never globally. A skill is loaded when the active adapter or feature spec names it, or when the trigger condition below clearly matches the active task.

| Skill | File | Load when… | Do NOT load when… |
| :--- | :--- | :--- | :--- |
| `contract-engineer` | [contract-engineer.md](contract-engineer.md) | Defining or changing API seams (routes, DTOs, shared types) | Reading existing routes only |
| `create-prompt` | [create-prompt.md](create-prompt.md) | Decomposing a feature into bounded build prompts for Kiro / Antigravity / Claude | Executing an already-written prompt |
| `database` | [database.md](database.md) | Adding or modifying PostgreSQL schema or EF Core migrations | No DB schema changes in scope |
| `death-audit` | [death-audit.md](death-audit.md) | Eliminating zombie code, dead exports, or stale documentation | Normal feature work |
| `dotnet-dev` | [dotnet-dev.md](dotnet-dev.md) | Writing or modifying C# / .NET 10 backend logic | Frontend-only or spec-only changes |
| `nextjs-dev` | [nextjs-dev.md](nextjs-dev.md) | Writing or modifying Next.js 15 RSC / PWA components | Backend-only or spec-only changes |
| `nextjs-qa` | [nextjs-qa.md](nextjs-qa.md) | Writing or fixing Playwright E2E tests | Unit/integration tests only |
| `openapi-expert` | [openapi-expert.md](openapi-expert.md) | Editing `specs/openapi.yaml` or regenerating the Kiota client | No spec changes in scope |
| `session-review` | [session-review.md](session-review.md) | End of a session — updating HANDOVER.md and memorialising decisions | Mid-session implementation work |
| `shared-understanding` | [shared-understanding.md](shared-understanding.md) | Stress-testing a plan before execution to surface hidden gaps | Plan already approved and execution is underway |
| `team-orchestration` | [team-orchestration.md](team-orchestration.md) | Acting as Lead Developer across multiple parallel agents or sub-tasks | Single-agent, single-task work |
| `testing` | [testing.md](testing.md) | Setting up or restructuring the test strategy or QA pipeline | Adding tests within an already-established pattern |
| `workflow-author` | [workflow-author.md](workflow-author.md) | Creating a new YAML workflow wired into the WorkflowOrchestrator | Editing existing workflow logic only |
| `designer` | [designer.md](designer.md) | Making UI/UX or visual design decisions (Solar Earth aesthetic) | Non-visual backend or infra work |
