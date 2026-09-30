# LIB-04 — Recipe imagery and provenance: design

> Status: **Proposed design derived from current behavior**; implementation is not authorized.

## Integration map

- **Entry/presentation:** `pwa/src/components/recipes/OriginalPhotosViewer.tsx`.
- **Supporting path:** `pwa/src/components/recipes/RecipeDetailSheet.tsx`.
- **Supporting path:** `pwa/src/store/uiStore.ts`.
- **Supporting path:** `api/src/RecipeApi/Controllers/RecipeController.cs`.
- **Supporting path:** `pwa/src/lib/imageUtils.ts`.
- **Contract:** `specs/openapi.yaml`: `GET /api/recipes/{recipeId}/original/{photoIndex}`, `GET /api/recipes/{id}/hero`, `POST /api/recipes/{id}/originals`, `POST /api/recipes/{id}/hero/regenerate`.
- **State ownership:** Detail/viewer own transient presentation; API and workflow/global UI feedback own persisted files and background state.

## Data and control flow

1. The member enters the feature through the current route/component and the client resolves identity and contextual inputs required by **LIB-04-AC1**.
2. The client invokes the generated/API wrapper for the OpenAPI operation; the controller validates identity/input and delegates canonical selection or mutation to the service/persistence layer.
3. The client maps the response into presentation state only if its request identity still matches the active query, filter, recipe, or route context.
4. Mutations disable equivalent repeat actions, reconcile from the accepted response or a bounded refetch, announce the result, and preserve recoverable context on failure.

## State, failures, and recovery

- Model initial/loading, populated, empty, mutation-pending, recoverable-error, and terminal/ineligible states separately.
- Generation/request identifiers or equivalent cancellation guards reject late async results. Optimistic UI, where retained, must roll back on rejection and reconcile canonical server state.
- Retries must be idempotent from the user’s perspective. Navigation/unmount must cancel timers and prevent updates to another recipe/member/context.
- Offline/network failures must not be described as successful persistence; current visible data may remain available with explicit stale/retry feedback.

## Security and privacy

- Use the established household secret and active-member headers/cookies; do not place secrets or bundle contents in logs, URLs, analytics, or accessible labels.
- Validate identifiers and all mutable/uploaded/imported input server-side. Enforce household ownership and eligibility again at the API/persistence boundary.
- Destructive and elevated actions retain explicit confirmation and server-side authorization; client hiding is not authorization.

## Localization and accessibility

- Source all user-facing English/French text through `pwa/src/locales/{en,fr}/common.json`.
- Prefer semantic headings, buttons, dialogs/sheets, status announcements, visible focus, logical focus return, and reduced-motion-safe alternatives. Gesture, hover, color, imagery, and iconography cannot be the only action or status channel.

## Performance and compatibility

- Bound result/page/image payloads, deduplicate in-flight requests, and avoid resetting visible content during incremental work.
- Preserve current Next.js/PWA navigation and Web Share progressive enhancement. Treat optional semantic search, SSE, and device APIs as degradable integrations.

## Verification strategy

- Contract tests assert request/response/status parity for each listed operation.
- API integration/service tests assert identity, eligibility, persistence, ordering/ranking, concurrency, and failure semantics.
- React unit tests assert states, accessibility names/state, stale-response guards, rollback, and navigation parameters.
- Playwright tests assert the primary user journey plus retry/recovery using schema-compliant builders and `MOCK_IDS`.
- Traceability: AC1 → entry/primary response; AC2 → mutation or incremental behavior; AC3 → eligibility/context/recovery; AC4 → concurrency and accessibility.

## Tradeoffs and unresolved design

The current split retains local transient UI state and narrow Zustand cross-route/shared state rather than introducing a new global owner. A future approved change must compare that baseline with URL/server-owned alternatives when state must survive reloads or multiple devices. Open product questions in `requirements.md` block any task that would change observable behavior.
