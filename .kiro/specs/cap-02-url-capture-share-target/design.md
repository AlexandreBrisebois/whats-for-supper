# CAP-02 — URL capture and PWA share target design

> **Status:** Implemented design baseline derived from current source. It explains the shipped path and does not authorize changes.

## Integration map

1. **UI/entry:** `/capture`; share-target query/form handling in the capture route and `pwa/public/manifest.json`/`pwa/public/sw.js`.
2. **Client boundary:** `pwa/src/lib/api/recipes.ts` uses the generated capture-url request builder; `MinimalCapture` owns review, duplicate lookup, busy/error, and pending state.
3. **Contract:** `specs/openapi.yaml`: `POST /api/recipes/capture-url`, returning 202 with a recipe identifier.
4. **Server/workflow:** `RecipeController.cs`, `url-import.yaml`, and web-acquisition agents/services.
5. **Browser seam:** `pwa/e2e/capture-flow.spec.ts` uses the shared `pwa/e2e/mock-api.ts` capture-url route for normal acceptance and test-local routes for failure cases.

## State and data flow

1. The member enters with authenticated household/member context. Device-local draft and busy/error state remain owned by the initiating UI/store.
2. Client validation rejects structurally invalid input before transport and locks submission during the request.
3. The generated API adapter sends the documented representation. The controller validates identity and maps the request to URL capture and its workflow trigger.
4. A synchronous success updates from the response. A 202 response stores its recipe/import/workflow identifier and represents **pending**, never ready.
5. Workflow processors update durable recipe/import state. The existing capture notification/SSE path handles later completion; this URL-capture path does not add independent polling.
6. Errors are separated into local validation, HTTP authorization/conflict/not-found, workflow launch failure, and later processing failure. Retry never assumes the prior attempt had no effect.

## Behavioral design decisions

- Reuse the existing capture/detail/cook/issue components and OpenAPI-generated boundary; do not introduce a parallel state model.
- Treat server responses as authoritative after every mutation. Guard async callbacks by recipe/import/attempt identity.
- Preserve draft/navigation state until the accepted result or explicit cancel makes it safe to clear.
- One-client submit locking exists; duplicate submissions across share target and paste are governed by duplicate handling, not assumed atomic.
- `202` is pending; acquisition, extraction, and readiness complete after navigation.

## Security, privacy, and household isolation

Protected mutations carry family-member identity according to `specs/openapi.yaml`; controllers must re-establish authorization and never trust a client recipe/import association. Asset/source access and import diagnostics remain household-scoped. Logs may retain correlation IDs and technical causes, while normal UI receives allow-listed family-safe reasons. Uploaded/shared content must be treated as untrusted input.

## Accessibility, devices, and localization

Use semantic buttons/inputs/fieldset/dialog naming, visible focus, focus restoration, keyboard escape where cancellation is safe, and live status for async outcomes. Do not make swipe, camera, hover, or color the only mechanism. Preserve safe-area and touch targets. Route copy through `pwa/src/locales/en/common.json` and `pwa/src/locales/fr/common.json` when future changes are approved; never infer recipe processing language from UI locale.

## Failure and recovery

- Client validation: retain draft, focus/associate the error, make no request.
- Request uncertainty: retain identifier/draft, disable blind duplicate resubmission until authoritative lookup/refetch.
- 401/403/404: disclose no cross-household existence; return to a safe surface.
- 409/concurrent action: explain the active/conflicting state and refetch.
- Accepted workflow failure: retain durable failure/report state and correlation ID; expose only safe retry/clear actions.
- Offline/reconnect: do not claim cancellation; reconcile status before permitting a duplicate action.

## Verification strategy

- Component tests assert entry, validation, keyboard/focus, pending locks, family-safe errors, and late-result guards.
- API contract tests assert exact request/response/error shapes and generated-client parity.
- Server unit/integration tests assert authorization, eligibility, persistence transitions, idempotency/conflicts, and workflow launch failure.
- Real-database tests cover concurrent updates and durable status where the feature writes workflow/import state.
- End-to-end tests cover the complete happy path plus one recoverable failure without mocking away the selected seam.

## Alternatives and unresolved decisions

A purely client-side duplicate/concurrency policy is simpler but cannot guarantee cross-device correctness; a server idempotency/version contract is preferred if product requires that guarantee. SSE-only feedback is lower latency but polling/refetch remains necessary for reconnect and missed events. Exact policies remain blocked by the open questions in `requirements.md`.
