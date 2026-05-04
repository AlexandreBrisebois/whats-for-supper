# ADR 033: Next.js 16 Proxy Pattern Migration

## Context
Next.js 16 deprecates `middleware.ts` in favor of a `proxy.ts` convention. The project migrated to this pattern as part of the Phase 2 auth stabilization work.

## Decision
1. Use `pwa/src/proxy.ts` instead of `pwa/src/middleware.ts`.
2. The file must export a named async function `proxy(request: NextRequest): Promise<NextResponse>`.
3. The `config` object with `matcher` remains the same.

## Status
Implemented. `middleware.ts` has been deleted. `proxy.ts` is the active file.

## Consequences
- Do not create `middleware.ts` — it will be ignored by Next.js 16.
- All request interception logic lives in the `proxy` export in `pwa/src/proxy.ts`.
