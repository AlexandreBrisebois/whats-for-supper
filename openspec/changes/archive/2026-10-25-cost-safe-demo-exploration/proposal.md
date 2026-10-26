# Cost-safe demo exploration

## Why

Visitors should explore prepared household recipes and ordinary local workflows without starting paid model work or mistaking unavailable AI processing for success. Alex explicitly approved this bounded implementation and the context band on 2026-10-25; the larger reset redesign remains separate in PR #340.

## What Changes

- Enforce API demo mode at chat/stream, native embedding and direct hero boundaries, regardless of credentials, worker retries or force flags.
- Return an explicit 403 `DEMO_AI_UNAVAILABLE` before model binding/body processing for AI capture, reimport, original-photo regeneration and hero generation entry points. Retain prepared bytes and local household work.
- Keep typed Search lexical, compatible prepared Similar usable, and index/reconciliation lexical-only without repeating unavailable embedding work.
- Explain unavailable AI operations before private file selection/upload; offer ordinary prepared recipe navigation rather than simulated success.
- Add the reviewed purple/white top-of-shell context band, short EN/FR sheet/dialog, safe first-visit introduction and guarded browser-local dismissal memory.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `demo-household`: model isolation, honest restricted actions, retained local exploration and contextual explanation. Shared behavior outside demo mode is unchanged.

## Impact

Provider composition/agents, search/index owners, selected MVC resource filters, OpenAPI/Kiota/mocks, and a small PWA mode/context surface. No new framework or dependency version changes. No reset format/publication, table replay, date rebasing, operator-role change, recurrence, stale-generation framework, deployment or live reset. Preserve Home PR #339 and beta issue #345 ownership. Tests use synthetic disposable state, dummy credentials and provider/transport doubles only; production and live demo are forbidden test targets.
