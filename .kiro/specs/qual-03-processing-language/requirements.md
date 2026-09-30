# QUAL-03 — Processing-language configuration requirements

> **Status:** Proposed documentation of current behavior; behavior-first, accelerated cadence. This specification does **not** authorize implementation. Source artifact: `docs/feature-inventory.md` QUAL-03.

## Outcome

Operators can configure the target language for newly processed photo, URL, and description recipes without changing member interface locale.

## Scope

- Family-facing behavior described above, its current API/workflow seams, async states, and recovery.
- Actor: an authenticated household member unless explicitly identified as operator configuration. Recipe/library effects are household-shared; transient UI state is member/device-local.
- Entry: deployment configuration key `IMPORT_TARGET_LANGUAGE`; existing recipes use issue/re-import UI.

## Non-goals

- Redesigning adjacent recipe, planner, identity, workflow administration, or localization capabilities.
- Treating current implementation details as newly approved product policy.
- Implementing, migrating, or correcting behavior as part of this documentation packet.

## Verified baseline

- Contract: capture endpoints and import-report endpoint; no current family-facing settings operation for this configuration.
- Ownership: `RecipeAgent.cs`, extraction/synthesis prompts, import workflows, and recipe language fields.
- Evidence: agent prompt/extraction tests and photo/URL/description integration coverage; dedicated configuration matrix is not evident and is proposed.
- Happy path: a supported configured target is appended to processing instructions for new captures while UI preference remains independent.
- Failure path: missing/`NONE` preserves source/input language; invalid operator values and provider failures require explicit operational handling.
- Concurrency: each workflow must use a stable effective setting; behavior if configuration changes mid-run is an open decision.
- Async: background processing applies the effective target consistently through extraction/synthesis and re-import.

## Requirements

- **QUAL-03-R1 — Entry and eligibility.** When an authenticated member enters this capability in an eligible state, the system shall expose the relevant action and enough context to understand its effect; when ineligible, it shall hide or disable it with a truthful explanation.
- **QUAL-03-R2 — Accepted outcome.** When valid input is confirmed, the system shall perform only the scoped action, return/retain a durable correlation identifier where background work exists, and distinguish acceptance from completion.
- **QUAL-03-R3 — Validation and failure.** When input, authorization, network, source, or processing fails, the system shall preserve recoverable member input/state, show a family-safe actionable message, and avoid claiming success or readiness.
- **QUAL-03-R4 — Async consistency.** While work is pending, the member may navigate away; polling/events/refetch shall reconcile to authoritative server state, and stale or late results shall not overwrite a newer attempt.
- **QUAL-03-R5 — Concurrency.** Repeat activation shall be locked while a request is active. Cross-device conflicts shall converge on server state, and unsupported atomicity shall not be represented as guaranteed.
- **QUAL-03-R6 — Accessibility and responsive use.** Every pointer/gesture action shall have a labeled keyboard/touch alternative, dialogs shall expose name and focus containment/restoration, progress/error changes shall be announced without focus theft, and controls shall remain usable on phone and larger layouts.
- **QUAL-03-R7 — Privacy and localization.** Family UI shall not reveal technical diagnostics, secrets, or another household's data. User-facing copy shall use supported locale resources; recipe processing language shall remain distinct from interface locale.
- **QUAL-03-R8 — Preserved behavior.** member `preferredLanguage` controls UI only; existing sourced recipes change through explicit issue/re-import, not bulk implicit translation

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
