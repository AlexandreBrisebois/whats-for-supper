# CAP-02 — URL capture and PWA share target requirements

> **Status:** Implemented capability baseline; behavior-first, accelerated cadence. This specification describes the shipped URL/share-target path and does not authorize changes. Source artifact: `docs/feature-inventory.md` CAP-02.

## Outcome

A member can paste or share a recipe URL, add appreciation and notes, and continue while acquisition/import runs.

## Scope

- Family-facing behavior described above, its current API/workflow seams, async states, and recovery.
- Actor: an authenticated household member unless explicitly identified as operator configuration. Recipe/library effects are household-shared; transient UI state is member/device-local.
- Entry: `/capture`; share-target query/form handling in the capture route and `pwa/public/manifest.json`/`pwa/public/sw.js`.

## Non-goals

- Redesigning adjacent recipe, planner, identity, workflow administration, or localization capabilities.
- Treating current implementation details as newly approved product policy.
- Implementing, migrating, or correcting behavior as part of this documentation packet.

## Verified baseline

- Contract: `POST /api/recipes/capture-url`, returning 202 with a recipe identifier.
- Ownership: `RecipeController.cs`, `url-import.yaml`, and web-acquisition agents/services.
- Evidence: `MinimalCapture.test.tsx`, `pwa/src/lib/api/recipes.test.ts`, and `WebAcquisitionAgentTests.cs`.
- Happy path: a normalized nonblank URL plus optional metadata queues acquisition and provides navigation/completion feedback.
- Failure path: missing/malformed/unacquirable sources show a family-safe error; technical diagnostics stay server-side.
- Concurrency: one-client submit locking exists; duplicate submissions across share target and paste are governed by duplicate handling, not assumed atomic.
- Async: 202 is pending; acquisition, extraction, and readiness complete after navigation.

## Requirements

- **CAP-02-R1 — Entry.** `/capture` accepts a pasted URL and PWA share-target `url`, `text`, and `title` parameters. A URL recovered from shared text opens the same review form as a pasted link.
- **CAP-02-R2 — Review and submission.** The member reviews the URL, may add appreciation and notes, and explicitly saves before capture begins. Optional metadata stays in the existing capture form.
- **CAP-02-R3 — Accepted outcome.** `POST /api/recipes/capture-url` returns a recipe ID with `202 Accepted`. The UI records that ID as pending and presents queued processing, never a ready recipe.
- **CAP-02-R4 — Failure and retry.** Invalid or failed submission leaves the review form available, exposes a family-facing error, and does not claim that acquisition completed.
- **CAP-02-R5 — Pending behavior.** The member can leave after acceptance while acquisition/import continues. Existing capture notification and recipe readiness behavior owns later completion feedback.
- **CAP-02-R6 — Duplicate and concurrency boundary.** The review form locks its Save action while submitting and performs its existing duplicate check. Cross-device idempotency is not an implemented guarantee.
- **CAP-02-R7 — Privacy and localization boundary.** The request uses authenticated family-member context; family-facing errors exclude operational diagnostics. Processing language remains independent of interface locale.
- **CAP-02-R8 — Preserved behavior.** Shared title/text may help recover the URL, metadata is optional, and capture does not block on extraction.

## Observable acceptance states

| State | Observable result |
|---|---|
| Ready/empty | Valid entry controls are available; absence of optional data is explained without fabricating content. |
| Pending | Inputs that could duplicate work are locked and status says queued/processing rather than complete. |
| Success | The authoritative result is visible or reachable and the next destination is explicit. |
| Validation failure | The offending field/action is identified; no server-side effect is claimed. |
| Service/workflow failure | Recoverable state remains; retry/refresh guidance is safe and diagnostics stay behind the operations boundary. |
| Stale/concurrent | A refetch/versioned response wins over late optimistic state; destructive replacement is not silent. |
| Unauthorized/not found | No household data is disclosed and the member is returned to a safe state. |

## Open questions / blockers for future change

1. What server idempotency key or version policy, if any, should be guaranteed across devices? Current evidence is insufficient for a stronger requirement.
2. Which SSE event names and polling intervals are product commitments versus current implementation choices?
3. Should pending work survive sign-out/member switching on the same device, and which member receives completion notification?
4. Product approval is required before resolving these questions or implementing any task below.
