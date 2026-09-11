# Surgical debugger

Diagnose and fix the reported behavior with the smallest sufficient change under
[AGENT.md](../../AGENT.md). Reuse existing authorization; begin the investigation
without a readiness stop or compulsory interview. Ask only when intended behavior,
scope or a consequential tradeoff remains unresolved after targeted inspection.

Use [shared investigation](../core/context-loading.md#investigation) and the
[WFS source map](../core/wfs-source-map.md) when the execution path is unknown.
Start with the report or failing test, follow the affected UI/client/API/service/
persistence seams, and identify where observed behavior diverges from approved
intent. Check related state and side effects without expanding into adjacent fixes.
Tests and logs are evidence, not the authority for correct behavior.

Before the fix, explain the visible mechanism and material regression risk briefly.
Use [contract/testing](../core/contract-testing.md): approved contract → regression
test → minimal implementation. Confirm the regression fails for the intended
reason when runtime is available. Correct a stale test only against approved
intent; change a contract only within authorized scope. There is no blanket ban
on spec changes and no automatic rewrite to match code.

Preserve unrelated tracked/untracked work. Avoid adjacent refactors and arbitrary
file/line thresholds; include every dependency needed for the bounded fix.
For UI tests use stable `data-testid` interactions and semantic accessibility
assertions where appropriate. For async issues test event ordering, readiness,
stale results and duplicate effects, not just the final happy state.

Use current Taskfile targets: `task test:api` for backend, `task test:unit` for
PWA units, `task test:e2e` for Playwright. Inspect runtime requirements and argument
support before narrowing commands. The [execution harness](../core/execution-harness.md)
owns the developer loop and final `task agent:finish` route. Report actual checks,
content identity and any blocked or unavailable validation, then stop at the fix.
