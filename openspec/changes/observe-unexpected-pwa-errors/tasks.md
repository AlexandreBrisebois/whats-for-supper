# Tasks

Planning only. Select one [tracked session](../../../docs/telemetry/README.md); do not implement this whole file automatically. Read [design](design.md) and the [error scenarios](specs/anonymous-error-observation/spec.md).

## 1. F3-1 — Safe unexpected browser error through real forwarding

**Outcome and scenarios:** Script and promise failures, Private thrown content, Approved categories, Overlapping client hooks, Pipeline rejection and Disabled server with stale client.
**Owners and boundaries:** `pwa/src/instrumentation-client.ts`, telemetry error adapter/action/transport admission and tests; new `pwa/e2e/telemetry-errors.spec.ts`, real action/Node exporter and disposable receiver. External business API mocks remain in `pwa/e2e/mock-api.ts`.
**Dependencies and prerequisites:** F1 local receipt accepted; F2-1 optional browser context implemented. Reconcile all existing providers before edits; no package installation or provider migration in this change.
**Acceptance boundary:** Controlled browser errors export safe browser-authority logs, preserve navigation and cannot recursively report intake failure. No new business API/client/schema seam.

- [ ] 1.1 Test-first: add source-category, private-sentinel, exact payload, disabled, overlap, two-tab storm and recursive-failure tests plus a real-action script/rejection tracer. Run `task test:unit -- src/lib/telemetry/errors.test.ts src/lib/telemetry/telemetry.test.ts src/lib/telemetry/transport.test.ts` and `task test:e2e -- telemetry-errors.spec.ts --project=chromium`; record missing-behavior red before implementation.
- [ ] 1.2 Implement only initialized browser hooks and the strict forwarding/admission path. Rerun 1.1 green, asserting ERROR 17, fixed names/body/categories, generated occurrence identity, optional existing context, no raw diagnostics/storage, ten document errors/minute and 20 error/100 ordinary process partition within each producer's existing total cap.
- [ ] 1.3 Verify outage, opt-out, cross-origin missing-detail limits and subsequent navigation in `telemetry-errors.spec.ts` plus `telemetry-navigation.spec.ts`. Update `docs/sentrame.md`, tracker and evidence; inspect captured wire/bundle for forbidden fields and tokens. Run scoped `task verify`; stop before boundary/server hooks and handled business failures.

## 2. F3-2 — Render and Next server ownership

**Outcome and scenarios:** Route or root render failure, Server failure without a browser scope, Server error reaches a browser fallback, Failure after recovery or in another request, Early error and Continue after error.
**Owners and boundaries:** `app/error.tsx`, new `app/global-error.tsx`, `src/instrumentation.ts`, error adapter and existing transport. Test fixture routes/actions must be disposable, not shipped diagnostic endpoints.
**Dependencies and prerequisites:** F3-1 green; installed Next/React docs checked. Root replacement must work without LocaleProvider, IdentityValidator or observer survival. Preserve current reset/navigation behavior.
**Acceptance boundary:** Real client and Next server failures report with their respective authority; server-error browser fallback does not duplicate the server exception; independent requests/retries remain independent.

- [ ] 2.1 Test-first: add boundary/root replacement, effect replay, framework-marked server error, standalone request and recovered-then-failed-again cases. Run `task test:unit -- src/lib/telemetry/errors.test.ts src/app/error.test.tsx src/app/global-error.test.tsx` and `task test:e2e -- telemetry-errors.spec.ts --project=chromium`, observing red at actual missing hooks/boundaries.
- [ ] 2.2 Integrate minimal browser boundaries and `onRequestError`; use only fixed server routeType categories, no request serialization or inferred browser context. Reuse the root enabled handoff, with a boolean-only internal Next config read only if root replacement requires it. Rerun 2.1 green and verify no hidden forwarding endpoint becomes an arbitrary upload API.
- [ ] 2.3 Run `task test:e2e -- telemetry-errors.spec.ts telemetry-navigation.spec.ts auth-flow.spec.ts --project=chromium`; review error fallback keyboard/navigation, private payloads, producer quotas and no recursion. Update docs/tracker with source-specific blind spots and duplicate uncertainty; run scoped `task verify`. Stop before .NET logging, business recovery, raw diagnostics or automatic traces.

## 3. F3-3 — Protected receiver diagnostics and integration reconciliation

**Dependencies and prerequisites:** F3-1 and F3-2 accepted; reviewed local Sentrame, fresh isolated storage and private browser/server tokens. Deployed/device behavior is separate.

- [ ] 3.1 Qualify real WFS browser and Next errors via direct JSON intake, durable protected diagnostics and receiver reopen. Verify name/category/severity/authority, generated occurrence identities and optional versus absent context, with no messages/stacks/digests. Record exact versions/builds/clock basis and distinguish actual WFS results from the receiver's other samples. Update `docs/sentrame.md` and tracker; standalone diagnostics must work without a journey goal.
- [ ] 3.2 Reconcile all error scenarios, privacy/storm/recursion acceptance and unchanged application retry behavior. Run applicable preparation, full scope review and one `task verify -- <complete reviewed paths>`; record `record_path` and actual evidence states. Do not call handled business failures, .NET or installed-device collection qualified by this slice.
