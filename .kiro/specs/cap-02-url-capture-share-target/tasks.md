# CAP-02 — URL capture and PWA share target follow-up work

> **Status:** The capability is implemented. These are possible future changes, not a reconstruction plan for the shipped path.

## Current boundary

The shared mock route is `POST /api/recipes/capture-url` in
`pwa/e2e/mock-api.ts`; `pwa/e2e/capture-flow.spec.ts` exercises share-target URL,
shared-text recovery, accepted processing, failure, and a malformed acceptance
response. Future changes preserve this seam or deliberately replace it.

## Candidate 1 — Durable pending recovery

- **Problem:** Pending correlation is session-local; reload or a missed completion event can lose the capture-specific completion context.
- **Before implementation:** Decide the server-owned recovery rule and whether it is shared with other capture modes.
- **Test seam:** Name affected API/status route, Playwright scenario, mock owner, route/method, and response shape before selecting code work.

## Candidate 2 — Cross-device duplicate policy

- **Problem:** The current local submit lock and duplicate check do not define an idempotency guarantee across devices.
- **Before implementation:** Decide whether the server should reject, reuse, or expose a concurrent URL capture attempt.
- **Test seam:** Contract/API integration plus a deterministic browser mock for the approved conflict response.

## Candidate 3 — Accessibility and localization correction

- **Problem:** Any approved changes to review-form focus, status semantics, or copy must be checked against the shared capture surface rather than adding a parallel URL form.
- **Test seam:** Focus/status component tests and `capture-flow.spec.ts`; update the existing capture-url mock only if the response contract changes.
