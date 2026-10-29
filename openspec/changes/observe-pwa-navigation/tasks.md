# Tasks

Planning only; all implementation and qualification tasks are pending. Select one numbered group/session from the [tracker](../../../docs/telemetry/README.md), not this whole change by default. Read [design](design.md) and the [scenarios](specs/anonymous-navigation-observation/spec.md).

## 1. F2-1 — Correlated route presentation through real forwarding

**Outcome and scenarios:** Access redirect, Navigate and backtrack, Hidden navigation, New document or concurrent tab, Warm resume, Arbitrary forwarding attempt, Stale enabled browser and Opening remains independent.
**Owners and boundaries:** Existing gate/classifier/shared observer, telemetry context/actions/server/tests; new `pwa/e2e/telemetry-navigation.spec.ts`. Real Server Action and Node exporter; mock only external business APIs via `pwa/e2e/mock-api.ts` and the receiver boundary.
**Dependencies and prerequisites:** F1 implementation groups 1–3 and direct receiver task 4.1 accepted; deployed/device task 4.3 is not a prerequisite. Reconcile actual F1 file names and local receiver identity first. No business API, generated-client or schema change.
**Acceptance boundary:** An isolated Home -> Search -> Home path reaches a disposable capture receiver. App behavior is unaffected by opt-out, malformed input, rate limiting or receiver failure.

- [ ] 1.1 Test-first: add context/classification/closed-input tests and a real-action browser tracer; run `task test:unit -- src/lib/telemetry/navigation.test.ts src/lib/telemetry/telemetry.test.ts src/lib/telemetry/transport.test.ts` and `task test:e2e -- telemetry-navigation.spec.ts --project=chromium`, observing intended missing-behavior red. Include private sentinels, two tabs/reload, remounts, visibility, invalid clocks and disabled/timeout cases.
- [ ] 1.2 Implement only the route tracer and privacy/admission boundary through the real action/serializer; rerun 1.1 green and review captured payloads for UUID scope, distinct events, sequence, source/observed times and static labels. Verify the existing opening wire contract remains unchanged and no persistent state or retries exist.
- [ ] 1.3 Run `task test:e2e -- telemetry-opening.spec.ts telemetry-navigation.spec.ts auth-flow.spec.ts onboarding.spec.ts --project=chromium`; update `docs/sentrame.md`, the tracker and this group's evidence with actual status, wire identity and missing qualification. Stop before Planner surfaces and business events; run scoped `task verify` for the complete changed paths before handing off this selected slice.

## 2. F2-2 — Planner and Grocery presentation

**Outcome and scenarios:** Phone tab transition and Wide companion pane; visible composition, not click attribution.
**Owners and boundaries:** Shared telemetry observer/context and `app/(app)/planner/page.tsx`, planner composition tests, the same real-action browser fixture and business API mocks.
**Dependencies and prerequisites:** F2-1 green; existing Planner layout and week state must be preserved.
**Acceptance boundary:** Phone tab changes and wide embedded Grocery produce the expected primary/surface evidence without duplicate Grocery instances or claimed shopping outcomes.

- [ ] 2.1 Test-first: add phone, wide, resize, data-loading and hidden/resume cases; run `task test:unit -- src/app/'(app)'/planner/page.test.tsx src/lib/telemetry/navigation.test.ts` and `task test:e2e -- telemetry-navigation.spec.ts --project=chromium`, recording red for missing composition evidence.
- [ ] 2.2 Implement only the shared Planner/Grocery presentation declaration and minimal surface lifecycle needed for the companion pane. Rerun 2.1 green; assert static labels only, no week dates/content, no tab-click inference and preserved week/tab behavior.
- [ ] 2.3 Run `task test:e2e -- planner.spec.ts grocery.spec.ts telemetry-navigation.spec.ts --project=chromium`; update integration docs/tracker and record actual phone-layout versus physical-device evidence separately. Review scope and run scoped `task verify`; stop before grocery mutations and general overlay migration.

## 3. F2-3 — One shared surface pilot and coverage debt

**Outcome and scenarios:** Open and close Quick Find, Document disappears, New route contains private segments and Bespoke surface is introduced.
**Owners and boundaries:** Shared surface lifecycle under telemetry, QuickFindModal composition and tests; route classification test and known-overlay inventory. Touch common Modal only if needed by a real consumer; no unused wrapper.
**Dependencies and prerequisites:** F2-2 green. Use existing Quick Find interaction tests and preserve focus/gestures/selection/drafts.
**Acceptance boundary:** One production surface emits bounded presentation cycles through real forwarding; new route or bespoke dialog coverage debt is visible without raw exports or claims of exhaustive static discovery.

- [ ] 3.1 Test-first: add open/close/reopen, effect replay, hidden state, unmount/navigation and identity-injection cases. Run `task test:unit -- src/lib/telemetry/surfaces.test.ts src/lib/telemetry/coverage.test.ts src/components/planner/QuickFindModal.test.tsx` and the real-action `telemetry-navigation.spec.ts` tracer, recording intended behavioral red.
- [ ] 3.2 Adopt the shared declaration in Quick Find, implement route inventory/known-overlay exceptions and rerun 3.1 green. Assert one static declaration per adopted surface, runtime `other` for unknown routes and no translated labels/DOM scraping. Document every existing bespoke exception in the coverage fixture with its source owner; do not migrate those features.
- [ ] 3.3 Rerun `task test:e2e -- planner.spec.ts utility-flows.spec.ts telemetry-navigation.spec.ts --project=chromium`; update `docs/sentrame.md`, inventory baseline columns and tracker with limits and owned exceptions. Review scope and run scoped `task verify`; stop before semantic selection/cancellation/outcome events.

## 4. F2-4 — Receiver qualification and integration reconciliation

**Owners and prerequisites:** Completed F2-1 through F2-3; disposable current local Sentrame build, fresh compatible SQLite, private test credentials. Never reset a retained deployment database.

- [ ] 4.1 Exercise actual WFS browser -> action -> Node JSON/no compression -> local Sentrame -> durable protected reads/reopen. Verify all three names, source, service, labels/context and timestamp projection; record exact WFS/receiver/version/config identities and payload review without secrets. Do not require a graph or configure a fictitious goal. Update docs/tracker with the actual direct-receiver status; leave deployed/phone cells not-run unless separately selected.
- [ ] 4.2 Reconcile scenario acceptance, privacy/volume and existing opening preservation. Run applicable `task prepare -- <complete reviewed paths>`, review the full diff, then `task verify -- <complete reviewed paths>` once. Record returned `record_path` and passed/failed/blocked/not-run/not-applicable evidence; check no custom business event, SDK migration or receiver change slipped in.
