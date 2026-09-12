# HM-E source-to-destination provenance ledger

Date: 2026-09-11. Sources are the starting HEAD bytes recorded in
[content evidence](hm-e-content.json). All line ranges below refer to those bytes,
before the JOURNAL freeze notice. This is a migration inventory, not renewed evidence
that old tests passed on current code. Current inspections establish only the stated
static property; historical commands/results remain historical.

## Repository memory and checkpoint facts

| Source lines | Fact / decision | Destination and verification |
|---|---|---|
| `.agents/MEMORY.md:1–12` | Same-origin browser/cookie/SSE rationale retained; literal `/` for both bases rejected. | `.agents/core/network-topology.md`: verified `config.ts`, `api-client.ts`, `useScheduleStream.ts` and `server-client.ts`. Browser default is empty; stream concatenates base + `/api/stream`; server concatenates absolute internal origin + endpoint and forwards auth/identity explicitly. Production override sets `http://api:9001`. A `/` base produces `//api/stream`; no runtime change made. |
| `.agents/MEMORY.md:14–16` | Persistent API files and NAS port defaults are useful implementation facts, not universal infrastructure mandates. | Network reference points to `docker/compose/apps.yml`, `production.yml`, `production-overrides.yml`: bind mounts target `/data`; both production variants default 9100/9180 with overrides. `production.yml` container DATA_ROOT uses host value whereas apps uses `/data`; recorded the discrepancy rather than claiming every composition preserves storage. Public-release exposure remains spec-owned. |
| `.agents/MEMORY.md:18–23` | Mandatory branching/auditor persona retired; preserve consequential clarification and branch backlog intent. | Existing `.agents/core/specification-workflow.md` already owns clarification/options/conditional manifests; ADR 044 preserves rationale. No new questioning requirement. |
| `.agents/core/memory/2026-05-11-spec-review-evolution.md:1–29` | Preserve review backlog, independent risk branches, progress tracking, horizontal seams/vertical risks, decision options and conversation provenance. Compulsory one-by-one interviews, personas and universal pre-build gate are obsolete. | ADR 044 verified against current `.kiro/specs/cnf/cnf-cross-spec-review/{requirements,design,tasks}.md` and shared specification workflow. Correct grouped CNF path retained. Writer/reviewer distinctions already live in prompts/workflow. |
| `HANDOVER.md:1–11` | Release planning remains active; old `specs/features/public-synology-release/` path is stale. | Compact Public Synology checkpoint points to `.kiro/specs/01-public-synology-release/tasks.md`, which says planned and has unchecked batches. Requirements/design still name `0.1.0-beta.1`. Release gates and publication boundary retained; no claim that prior planning is deployed. |
| `HANDOVER.md:12–19` | .NET migration validation and generated/lockfile determinism are unresolved active work. | Compact .NET checkpoint retains both. `global.json`, `api/RecipeApi.csproj`, test csproj, ADR 043, `.config/dotnet-tools.json`, generated Kiota lock and `pwa/package-lock.json` inspected. SDK/projects align with Preview 6; dotnet-ef is pinned to Preview 7, a remaining migration consistency question, not silently corrected by HM-E; clean starting status disproves the old dirty-tree phrasing. No package determinism, build, vulnerability or test validation inferred. |
| `HANDOVER.md:20–23` | Mandatory write-here then archive-to-JOURNAL loop removed. | `.agents/core/execution-harness.md` owns meaningful handoffs and spec evidence; JOURNAL frozen. No active task information discarded by removing bookkeeping. |
| `HANDOVER.md:25–29` | Toast, fallback routing and URL parsing notes duplicate existing owners. | ADR 042, ADR 040 (actual file is `040-playwright-mock-layering.md`) and ADR 035; verified `useUiStore`, `ToastContainer`, `action-pivot.spec.ts` and `home-recipe.spec.ts`. Gate-at-every-turn note superseded by HM-D execution policy/Taskfile. No new ADR needed for duplicated facts. |
| `HANDOVER.md:30–31` | Deferred C7 reload test remains skipped. | Compact .NET checkpoint retains the unresolved test. Verified `pwa/e2e/home-goto.spec.ts:396–398`; no implication that the old polling explanation is current diagnosis. |

## Session-review salvage before retirement

| Source lines / content | Disposition |
|---|---|
| `session-review/SKILL.md:13–20` delta, tests, active plans, handover, archive/roadmap | Changed paths/checks/content identity go to selected spec evidence; meaningful active checkpoint goes to HANDOVER under execution-harness. Relevant spec state remains synchronized; mandatory plan/roadmap/history edits removed. |
| `:22–28` durable architectural/contract/UX decisions | Preserve rationale in ADRs when needed; affected spec/config/contract documentation stays with its owner. Existing specification and contract/testing workflows already cover synchronization. ADR 044 captures unique review rationale. |
| `:30–35` narrow lookups, reuse context, tooling gaps | Context-loading already owns targeted reads/reuse. Execution-harness retains optional scoped tooling proposals. No automatic script promotion or compulsory tooling-gap section. |
| `:37–40` env/task/schema documentation checks | Execution-harness retains synchronization of affected documentation; existing change-class checks apply. Removed the false inference that static `agent:reconcile` proves database parity. |
| `:42–58` compaction, cleanup, final checklist/enforcement | Compact handoffs preserved; automatic death-audit, multi-file writing and universal final-response prerequisite removed. Active registry caller migrated before deletion. |

## Unique historical findings

- **Pantry Pasta / 15 Min Fix** (`JOURNAL:911–923,991–997`): retain the proposal here as historical, unselected intent: a built-in pasta/sauce/cheese meal bypassing external lookup, and a quick-fix idea. Current Home source has no matching old controls and ROADMAP has no Pantry Pasta entry. No verified active owner or acceptance exists; do not recreate UI or silently promote this to an active task.
- **Older harness optimization** (`:1006–1017,1280–1294`): old IN_PROGRESS utility-skill follow-up is superseded by this approved HM task graph. Claims of model efficiency/100% parity had no qualifying model evidence and are not promoted. Original logs remain frozen.
- **Dietitian follow-up / production checklist** (`:395–404`): the active grouped dietitian spec now owns prerequisites (orchestration Wave 7 and CNF/health dependencies). Old merge/backup/monitor instructions are historical, not authorization. No production checks were inferred.
- **Capture retry compare-and-set** (`:349–352,393`): old capture_failures-row/CAS implementation claim is obsolete against current `CaptureFailureService` (paused workflow tasks, resets failed task/instance state). Do not migrate the SQL recipe as current behavior or alter application code to match it.
- **Kiota settings wrapper** (`:817–822,850–852`): old mandatory additionalData workaround is obsolete against current familyStore direct `{ key, value }` POST and generated settings serializer. Preserve the old diagnosis only in frozen history.
- **Search rationale** (`:381–392`): centralized fingerprint, thin agent translation, filesystem-first purge, in-memory 60-second pantry snapshots and embedding compatibility already have ADR 037/039/040/041 and code/flow/config owners. Verified named services, `InventoryCaptureService.SnapshotTtlSeconds`, `SearchFingerprintService`, `RecipePurgeService` and DEPLOY search section. No duplicate policy created; old absolute operational wording is not new authorization.
- **Live AI smoke** (`:583`): historical F3 Gemini-key smoke limitation remains history with archived Phase 13. No model/live-service qualification was run in HM-E; old completed headings do not erase this limitation.

## Complete JOURNAL section inventory

The machine-readable [journal inventory](hm-e-journal-inventory.json) covers every
starting line exactly once, including prologue, headings and duplicated entries.
Each section names preserved history and existing owners or a deliberate obsolete/
duplicate decision. No historical checkbox, result, command or narrative body was
rewritten; the only JOURNAL edit is its freeze notice. The frozen original body is
hashed separately. The unique findings above are the only unresolved material needing
an additional task-evidence record; all other section-specific facts already have
an owner or remain explicitly historical, unverified observations.
