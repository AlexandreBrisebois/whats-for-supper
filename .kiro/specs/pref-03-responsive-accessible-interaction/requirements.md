# Responsive and Accessible Interaction — Requirements

**Kind:** Current-capability feature specification

**Derivation:** Behavior-first, accelerated cadence

**Source:** `PREF-03` in [`docs/feature-inventory.md`](../../../docs/feature-inventory.md), verified against current non-archived source, contract, and tests

**Status:** Baseline proposal for future change control; this specification does not authorize implementation

## Outcome

Primary WFS journeys remain operable and understandable across supported phone, tablet, and larger layouts using touch, keyboard, and assistive technology.

## Scope

### In scope

- responsive application shell and safe areas
- semantic names, focus, keyboard and non-gesture alternatives
- loading, empty, error, confirmation, and destructive-action states
- touch-target and reduced-motion considerations

### Non-goals

- certifying every external browser/assistive-technology combination
- changing the Solar Earth visual identity
- claiming full offline support

## Verified current baseline

- `pwa/src/components/common/Layout.tsx`, `Navigation.tsx`, and app layouts own shell geometry and route presentation.
- Primary gesture experiences expose buttons/labels in Discovery, OriginalPhotosViewer, planner, and browse components.
- Component and E2E tests use semantic roles and stable `data-testid` seams, but accessibility is a cross-cutting obligation rather than one centralized service.

The baseline records current ownership; it is evidence to review, not a requirement
that every implementation detail remain unchanged.

## Requirements

### PREF-03-R1 — Responsive layout

Primary routes shall remain readable and actionable at supported phone, tablet, and wide viewport sizes without obscuring content behind fixed navigation or safe areas.

### PREF-03-R2 — Semantic operation

Every essential action shall have a semantic control, accessible name, visible focus, and keyboard activation; gesture-only actions shall have an equivalent control.

### PREF-03-R3 — State communication

Loading, empty, success, pending, and failure states shall be visually and programmatically distinguishable without relying only on color or motion.

### PREF-03-R4 — Destructive safety

Deletion, purge, discard, and displacement actions shall communicate consequences and use proportionate confirmation or elevated authorization.

### PREF-03-R5 — Motion and touch

Controls shall provide usable touch targets and interactions shall respect reduced-motion needs where motion is non-essential.

### PREF-03-R6 — Regression evidence

Feature changes shall retain semantic assertions and targeted mobile/wide checks for the affected journey.

## Preserved behavior

- Existing household meal workflows remain usable when this capability is degraded,
  except where the capability is the explicit security or persistence prerequisite.
- Changes preserve household/member boundaries and do not broaden collection of
  recipe, identity, or secret data.
- OpenAPI remains authoritative for any affected API operation.

## Acceptance scenarios

1. The primary success path satisfies every `PREF-03-R*` requirement with the
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
