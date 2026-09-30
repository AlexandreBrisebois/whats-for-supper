# CAP-07 — Import failure recovery design

> **Status:** Proposed design derived from `CAP-07` requirements and verified current sources. Implementation is not authorized.

## Integration map

1. **UI/entry:** `FailedCapturesSection` in profile/settings.
2. **Client boundary:** API helpers in `pwa/src/lib/api/recipes.ts` or `pwa/src/lib/api/captures.ts`; generated models under `pwa/src/lib/api/generated/`.
3. **Contract:** `specs/openapi.yaml`: `GET /api/captures/failures`, `POST /api/captures/failures/{id}/retry`, and `DELETE /api/captures/failures/{id}`.
4. **Server/workflow:** `CapturesController.cs`, `CaptureFailureService.cs`, workflow retry/cleanup.
5. **Evidence:** `FailedCapturesSection.test.tsx`, `failed-captures-contract.test.ts`, and `CaptureFailureIntegrationTests.cs`.

## State and data flow

1. The member enters with authenticated household/member context. Device-local draft and busy/error state remain owned by the initiating UI/store.
2. Client validation rejects structurally invalid input before transport and locks submission during the request.
3. The generated/manual API adapter sends the documented representation. The controller validates identity and maps the request to service/persistence or a workflow trigger.
4. A synchronous success updates from the response. A 202 response stores its recipe/import/workflow identifier and represents **pending**, never ready.
5. Workflow processors update durable recipe/import state. Polling, refetch, or household-scoped SSE reconciles the client; ready entities enter normal recipe surfaces only when readiness rules pass.
6. Errors are separated into local validation, HTTP authorization/conflict/not-found, workflow launch failure, and later processing failure. Retry never assumes the prior attempt had no effect.

## Behavioral design decisions

- Reuse the existing capture/detail/cook/issue components and OpenAPI-generated boundary; do not introduce a parallel state model.
- Treat server responses as authoritative after every mutation. Guard async callbacks by recipe/import/attempt identity.
- Preserve draft/navigation state until the accepted result or explicit cancel makes it safe to clear.
- 409 protects retry/clear conflicts and clients refresh authoritative state after mutation
- 202 indicates queued retry or cleanup, with later refresh/events establishing completion

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
