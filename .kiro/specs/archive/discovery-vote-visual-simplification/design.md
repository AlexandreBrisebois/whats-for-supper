# Design: Discovery Vote Visual Simplification (Older-Phone Smoothness)

## Summary
This change removes vote-driven green highlight and pulse visuals from Discovery cards to reduce perceived jitter and GPU churn on older phones, while preserving vote-driven ranking and live SSE vote updates.

## Vertical Trace (UI -> Client -> Seam -> API -> Service)

1. UI Entry: `pwa/src/components/discovery/DiscoveryCard.tsx`
- Current visual branch: `hasFamilyInterest` toggles ring, pulse animation, and green match treatment.

2. Stack Rendering: `pwa/src/app/(app)/discovery/page.tsx`
- Renders top stack cards and passes card props.
- Maintains swipe handlers and optimistic stack updates.

3. Client Live Event Seam: `pwa/src/hooks/useScheduleStream.ts`
- Receives `vote_updated` SSE event.
- Dispatches to `useDiscoveryStore.getState().applyVoteUpdate(...)`.

4. Client Ranking Logic: `pwa/src/store/discoveryStore.ts`
- `applyVoteUpdate` sets `hasFamilyInterest=true` and re-ranks cards by the defined movement policy.

5. API Contract and Backend Vote Path:
- Contract: `POST /api/discovery/{id}/vote` in `specs/openapi.yaml`.
- Controller: `api/src/RecipeApi/Controllers/DiscoveryController.cs`.
- Service: `api/src/RecipeApi/Services/DiscoveryService.cs` publishes `vote_updated` SSE.

## Contract Integrity
Status: **No drift / no contract change required**.

- No OpenAPI updates.
- No backend DTO/model updates.
- No change to `vote_updated` event shape.
- Frontend-only visual behavior adjustment.

## As-Is Failure Point
`hasFamilyInterest` currently drives:
1. outer green ring (`ring-sage` branch),
2. infinite pulse animation (`scale` loop with repeat Infinity),
3. green match ghost treatment.

When multiple cards are already marked by external voting, these branches produce competing focal points and visible jitter, especially on older devices.

## To-Be Design Contract
1. `hasFamilyInterest` remains a data signal used by store logic, not a visual style branch in `DiscoveryCard`.
2. Remove vote-specific green ring, pulse loop, and green match styling branches.
3. Preserve all existing swipe interactions and stack transitions not tied to vote highlight.
4. Preserve ranking logic and SSE event wiring exactly as-is.

## Mère-Designer Lens (Applied)

### The Why (Design Theory)
Persistent, high-contrast, repeating motion on multiple stacked cards creates visual hierarchy conflicts and motion debt. Reducing non-essential animated emphasis improves perceived responsiveness.

### The How (Parental Utility)
A calmer Discovery stack is easier to parse and swipe one-handed under stress; reduced motion overhead improves smoothness on older phones and lowers friction in the “decide dinner fast” workflow.

## Data-TestID Impact
1. Remove dependency on `discovery-card-interest-ring` in tests.
2. Keep `data-testid="discovery-card"` as the primary card anchor.
3. No new test ids required.

## Testing Strategy Matrix

1. Unit: `pwa/src/components/discovery/DiscoveryCard.test.tsx`
- Replace ring-presence assertions with neutral rendering assertions for both `hasFamilyInterest` states.
- Confirm component still renders and swipe container remains present.

2. Unit: `pwa/src/store/discoveryStore.test.ts`
- Keep existing re-rank behavior tests unchanged and green.

3. Integration-like unit: `pwa/src/hooks/useScheduleStream.test.ts`
- Keep assertion that `vote_updated` routes to discovery store update.

4. Optional manual perf sanity
- Rapid vote updates while swiping should show no green pulse/highlight branches and reduced perceived jitter.

## Risk Controls
1. Avoid deleting `hasFamilyInterest` from interfaces or store logic.
2. Limit code edits to visual branches in `DiscoveryCard` and corresponding tests.
3. Preserve drag thresholds, velocity thresholds, and existing card transitions.
