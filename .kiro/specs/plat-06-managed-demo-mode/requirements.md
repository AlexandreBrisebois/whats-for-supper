# Managed Demo Mode — Requirements

**Kind:** Current-capability feature specification

**Derivation:** Behavior-first, accelerated cadence

**Source:** `PLAT-06` in [`docs/feature-inventory.md`](../../../docs/feature-inventory.md), verified against current non-archived source, contract, and tests

**Status:** Baseline proposal for future change control; this specification does not authorize implementation

## Outcome

A showcase deployment repeatedly returns to a known household state, avoids AI cost, and clearly exposes unavailable capabilities without weakening normal-mode behavior.

## Scope

### In scope

- strict demo-mode configuration
- master snapshot capture and scheduled restore
- AI-work bypass and deterministic seeded results
- health signaling and PWA adaptation

### Non-goals

- using demo mode as an authorization boundary
- silently enabling demo behavior for invalid configuration
- promising persistence of visitor changes across restore

## Verified current baseline

- `DemoModeOptions` parses `DEMO_MODE` strictly and defaults invalid values to false with a warning.
- `DemoWorkflowSeeder` schedules `demo-restore`; management endpoints trigger demo capture/restore workflows.
- `DemoModeBypassProcessor` and `DemoModeChatClient` prevent configured AI work/cost.
- `HealthController` exposes demo status and the Welcome page adapts entry behavior.

The baseline records current ownership; it is evidence to review, not a requirement
that every implementation detail remain unchanged.

## Requirements

### PLAT-06-R1 — Fail-closed configuration

Only an explicit valid true value shall enable demo mode; missing or invalid configuration shall run normal mode and emit safe diagnostics for invalid input.

### PLAT-06-R2 — Master state

An authorized operator can capture a coherent master snapshot and restore recipes, plans, votes, grocery state, and related assets defined by the demo contract.

### PLAT-06-R3 — Scheduled reset

The configured restore schedule shall avoid overlapping active restores and shall leave a diagnosable workflow record.

### PLAT-06-R4 — AI bypass

AI-dependent processors shall use deterministic bypass behavior or report the feature unavailable without invoking paid model services.

### PLAT-06-R5 — Visitor clarity

The PWA shall identify demo-specific unavailable actions and shall not imply that visitor changes are durable beyond the reset policy.

### PLAT-06-R6 — Isolation

Demo switches and credentials shall not weaken normal deployment authentication, persistence, or processing when demo mode is false.

## Preserved behavior

- Existing household meal workflows remain usable when this capability is degraded,
  except where the capability is the explicit security or persistence prerequisite.
- Changes preserve household/member boundaries and do not broaden collection of
  recipe, identity, or secret data.
- OpenAPI remains authoritative for any affected API operation.

## Acceptance scenarios

1. The primary success path satisfies every `PLAT-06-R*` requirement with the
   selected household/member context.
2. Missing, stale, invalid, or unavailable dependencies produce the specified safe
   fallback or explicit failure rather than false success.
3. A second device, late response, retry, or identity change cannot silently replace
   newer authoritative state.
4. The affected behavior is operable with its required non-pointer alternative and
   exposes meaningful state to assistive technology where a UI exists.
5. Contract, persistence, and workflow changes are proven at their actual seams,
   not inferred from a static or mocked check alone.

## Decisions retained by this baseline

- Current public behavior is the starting compatibility boundary, not immutable
  architecture.
- Household data remains self-hosted and the least-privilege/least-data behavior is
  preferred.
- Background work must report accepted, completed, and failed states distinctly.

## Open questions before a future change

1. Which requirement is being changed, and what current behavior must remain
   backward compatible during rollout?
2. Does the change alter OpenAPI, persistence, deployment configuration, event
   delivery, or another feature spec? If so, approve those handshakes first.
3. What production or real-device evidence is required beyond repository automation
   for the selected change?
