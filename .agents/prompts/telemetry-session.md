---
name: telemetry-session
description: Opt-in bounded WFS telemetry planning, investigation, implementation or qualification using the existing tracker and one selected task slice.
---

# WFS telemetry session

Use this prompt only when explicitly selected. It is a reusable session prompt, not a new skill, startup rule, workflow engine or blanket authorization to implement the telemetry roadmap.

## Session selection

Read the user's selected `Session`, `Mode` and `Authorized scope`, then resolve that row in [the work tracker](../../docs/telemetry/README.md). If the user selects a row without a mode, infer `investigate` for I sessions and `apply` for F sessions only when their request actually authorizes that work. If authorization is unclear, ask one focused scope question and continue independent read-only work. Do not select the whole change merely because OpenSpec says artifacts are ready.

Modes:

- `investigate`: trace the selected journey; update only the authorized existing inventory/tracker and task evidence. Do not instrument or create successor changes automatically.
- `plan`: create/update only the explicitly selected OpenSpec planning artifacts using their installed workflow; stop before implementation.
- `apply`: use the OpenSpec apply skill for the exact selected task IDs and implemented prerequisites. Complete that vertical slice only.
- `qualify`: exercise only the selected isolated receiver/deployed/device cell with synthetic data. Confirm the selected resources are disposable; do not enable a real household deployment through an implicit assumption.

## Load exact dependencies

1. Read AGENT.md, its context-loading owner and active-host adapter; inspect Git status plus staged/unstaged/untracked differences before any edit. Preserve unrelated work. Use relevant skills for the actual selected layer, not every available skill.
2. Read the selected change's proposal/design/spec/task group, tracker row, latest linked session evidence and only its prerequisite groups. Reconcile source/config identities and unchecked work with the current tree.
3. For F1 read its existing opening artifacts and telemetry action/server/tests, root composition and IdentityValidator. For F2 also read the implemented observer/classifier, Planner composition, selected shared surface and existing tests. For F3 also read installed Next instrumentation/error docs, current error UI and registered providers.
4. For I/J work read the selected inventory card and canonical capability scenarios, then the actual UI/store -> generated wrapper -> approved OpenAPI method/path -> controller/service/workflow -> persistence/publication boundary and tests. Resolve facts from source before asking the user.
5. For receiver compatibility read local `/Users/alex/Code/sentrame/docs/DEVELOPER-GUIDE.md`, `docs/integration/OTEL-CONTRACT.md`, `docs/integration/AGENT-INTEGRATION.md`, relevant USER-GUIDE sections and `docs/verification/standard-otel.md`; inspect implementation only where needed. Record HEAD/dirty state, exact versions and relevant doc hashes. Do not edit Sentrame from a WFS session or substitute its older published/GitHub version.

## Establish the bounded result

State the session goal, selected task IDs, prerequisite evidence, likely files/owners, smallest observable end-to-end result, checks, privacy/volume limits and stopping point. A successor dependency is not authorization to implement it. Ask consequential product questions one at a time only after available evidence is inspected.

Preserve these settled meanings: fresh document/reload means new opening and anonymous scope; warm resume/unlock/cooking time does not rearm opening; Welcome is entry after access redirect. No persistent identity or cross-document linkage. Discovery is repeated voting until personal exhaustion or presented convergence; saved votes, household convergence, closed voting and meal assignments are distinct. Grocery all-checked is not automatically a saved shopping-trip completion.

## Execute one useful slice

For implementation follow the repository's approved contract -> test-first red -> green -> bounded refactor sequence. Record intended behavioral red before changing production logic. Complete the real internal seams; mock only external providers/receiver and existing business API boundaries appropriate to that check. Browser interception alone does not qualify the real Server Action/Node export. For an API contract change update OpenAPI, regenerate Kiota, update method-sensitive mocks/builders/state behavior and consumers within that same slice; do not hand-edit generated code.

Use the commands and acceptance in the selected task group, reconciling proposed filenames with actual prerequisite output. Each slice owns its tests and docs. If the selected work is documentation-only, use consistency/link/source checks and mark the behavior cycle not-applicable. Do not invent tests or runtime passes.

Keep server-authoritative default-off runtime opt-in, server-held credentials, browser/server authority, fixed safe names/categories and bounded export. No raw paths/queries/content, product/person/household IDs, messages/stacks, content hashes, all-click capture, DOM scraping, console monkey patching or automatic telemetry-failure recursion. Retain shared automatic coverage; explicit semantics belong only where the selected operation knows them. No new backend, provider duplication, workflow engine, durable queue, Collector or independent step sampling.

For each proposed business observation record question, trigger, trusted owner, standard carrier/name, minimum safe attributes/context, success/failure/cancellation/retry semantics, volume and loss limits, what it proves, and receiver mapping/support/qualification. Reuse existing providers/exporters/processors where justified; source samples do not prove compatibility with WFS's installed package graph. Do not promote click/optimistic state/HTTP success/SSE into persistence.

## Verify and hand off

Separate unit/component/mock checks, real API/database seams, real browser/action/Node capture, actual exporter-to-Sentrame durable protected reads/reopen, deployed container/proxy/tunnel and physical installed-phone behavior. Report passed, failed, blocked, not-run and not-applicable independently. An unavailable required check leaves its task unchecked. Do not reset existing receiver storage or infer delivery/completeness from HTTP/action success.

Update only selected task evidence and the tracker/inventory rows you own before final verification. Run required preparation when applicable, inspect the complete task-owned diff and use scoped `task verify -- <complete reviewed changed paths>` per the harness; retain its actual `record_path`. Do not broaden/repeat checks after success without a new change or unresolved concern.

Leave a compact handoff: selected session/tasks; goal and authorization; WFS/receiver/config identity; changed owners; red/green and acceptance evidence; remaining unchecked work/qualification gaps; exact next session and reason. Mark no successor complete, create no commit/deployment, enable no collection, and sync/archive nothing unless separately selected. Stop at the selected result; a checkpoint is preferable to silently expanding the session.
