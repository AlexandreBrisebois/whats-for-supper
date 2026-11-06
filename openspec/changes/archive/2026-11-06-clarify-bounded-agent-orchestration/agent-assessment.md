# Codex agent assessment

## Recommendation

No existing deterministic Taskfile target needs conversion to an agent. Keep commands as reproducible executors, skills as reusable procedures, and the lead responsible for acceptance/integration. First improve the shared orchestration guidance. If repeated work later justifies a named specialist, consider one bounded **scope reviewer** before a broader agent catalog.

This is an assessment, not approval to create definitions or alter configuration.

## Official guidance consulted

Official documentation describes standalone custom-agent TOML under `.codex/agents/` or `~/.codex/agents/`, with role instructions and optional model settings. Permissions and MCP access follow the parent; a “read-only” instruction is not a separate sandbox. It recommends bounded parallel work, especially read-heavy tasks, and warns of coordination/token overhead. These facts support optional specialists, not replacing repository gates. [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)

Skills provide reusable instructions and progressive loading. That supports retaining the repository's existing skills rather than copying their procedures into every agent. [Build skills](https://learn.chatgpt.com/docs/build-skills)

Agent defaults and concurrency limits are configurable. Their documented existence does not establish effective settings or supported dispatch in this session. [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)

Sources were opened on 6 November 2026. These are current documentation claims, not a minimum-supported-version guarantee. No GitHub access was needed.

## Current checkout and client evidence

| Item | Observed result | What this establishes |
|---|---|---|
| Repository | `recipe-view-redesign`, HEAD `92bd234bfd156101a32e14ecacb053f421ee910e` | Current planning baseline; earlier conversation HEADs are historical |
| Existing dirty files | Planner page and `useSupperServingsEditor` | Unrelated application edits to preserve |
| Project `.codex` | Only `hooks.json`, with empty hooks | No existing project custom-agent definitions or project agent config found |
| `codex` on shell PATH | Not found | Shell lookup problem, not proof of missing installation |
| Bundled executable | `/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex` | Installed local CLI is available by explicit path |
| Bundled CLI version | `0.167.0-alpha.3.2` | Version/help actually executed; no upgrade performed |
| Installed ChatGPT app version | `26.1103.31037` | App metadata only |
| CLI warning | PATH alias creation not permitted; version/help still succeeded | Do not retry with wider access merely to suppress this warning |
| Native delegated tasks | Exposed and used in this Mac task | Ad hoc subagents work; this does not prove named TOML discovery |
| Custom-agent parsing/discovery/spawn | Not exercised | Installed-version and host compatibility remain unqualified |
| Hosted support/global agent config | Not tested/inspected | No portability or absence-of-global-agents claim |

The current host's exposed spawn tool accepts task instructions/model/effort; it does not expose a named custom-agent selector. A bundled CLI version and current web examples are insufficient to assert those files would be used by this active host. Do not recommend an upgrade solely from a version number; qualify the intended client's discovery with an explicitly authorized local probe if definitions are later selected.

## What should stay as it is

| Existing task or owner | Recommendation | Reason grounded in this checkout |
|---|---|---|
| `task prepare`, `task verify`, `task verify:plan` | Keep deterministic commands | They own selection, effects, fingerprints and invocation evidence; a specialist cannot replace those checks |
| `agent:drift:*`, `agent:reconcile`, `gen:client:check` | Keep commands | Reproducible checks have defined limits and real exit status; a model review adds judgment rather than executing a new authority |
| `agent:slice`, `agent:api`, `agent:summary`, `agent:status` | Keep discovery/navigation commands | Output is context, not a person-like role or acceptance proof |
| `test:agent`, impact runner, PostgreSQL qualification | Keep test harnesses | Owned resources, assertions and records must not become conversational substitutes |
| OpenSpec skills | Keep workflows | Artifact/dependency/lifecycle procedures stay with their installed owner |
| `openapi-expert`, `designer`, `nextjs-qa` and existing implementation skills | Keep skills | Procedures already have scope and shared-policy references; duplicating them in TOML creates drift |
| Codex adapter | Keep the mechanics router | The missing decisions are shared coordination policy, not a Codex-only workflow |

## Optional specialists worth evaluating later

| Candidate | Bounded assignment | Benefit to evaluate | Concern and boundary |
|---|---|---|---|
| Scope reviewer — first candidate | Read a selected immutable diff, approved artifacts and verification records; return concrete acceptance gaps/risks with paths | Independent judgment and less raw review output in the lead context | Shared sandbox still applies; no edits, no final acceptance authority, no unapproved broad scan or duplicate full gate |
| Seam investigator — second candidate only if repeated demand | Trace one reported route or UI failure to contract/client/service/persistence and return evidence | Keeps repeated investigation narrow | Existing discovery tools/skills should be reused; do not invent fixes, read every subsystem, mutate DV or claim a source trace is live proof |
| Permanent implementation/QA agent catalog | Do not introduce now | Benefit is not established | Encourages overlapping writers, duplicated instructions and unnecessary model/tool cost; task-specific workers remain adequate |

These are engineering recommendations from the local inventory, not roles mandated by official documentation. They are not part of this change's implementation scope.

## Qualification before any later definition change

First select the intended execution client and verify its actual standalone-file discovery/schema, instruction loading, relevant skill access and model availability. Preserve the user's model/effort preference. A future smoke assignment must be bounded, use permitted resources and record what actually loaded; no new remote session is implicit. Do not override built-in names casually or treat role instructions as security isolation. Adding TOML, a project config, persistent hooks or a new specialist remains a separate reviewed change.
