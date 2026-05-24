# Requirements: Discovery Vote Visual Simplification (Older-Phone Smoothness)

## Vision
Deliver a smoother one-thumb Discovery experience on older phones by removing vote-driven visual churn (green highlight/pulse) while preserving the social value of live voting and ranking behavior.

## Product Decisions (Locked)
1. Remove vote-driven green outline and pulse animation from Discovery cards.
2. Keep vote-driven re-rank behavior in `discoveryStore.applyVoteUpdate` unchanged.
3. Keep SSE vote flow unchanged (`vote_updated` still updates Discovery state).
4. Keep backend contracts, DTOs, and OpenAPI unchanged.

## Pre-Mortem (Dead Ends and Blind Spots)
1. If visual branches are removed incorrectly, swipe physics could regress (drag, threshold, velocity).
2. If `hasFamilyInterest` logic is deleted instead of decoupled from visuals, social ranking value is lost.
3. If tests still rely on the old ring test id, the suite may fail for the wrong reason.
4. If visual simplification accidentally removes all vote feedback semantics, users might think votes are ignored.

Mitigations:
- Preserve all existing swipe and stack animation mechanics unrelated to vote highlight.
- Preserve `applyVoteUpdate` and rank movement rules in the store.
- Replace visual-branch tests with neutral rendering assertions for both `hasFamilyInterest=true/false`.

## Acceptance Criteria

### AC-1 Remove Vote-Driven Green Highlight
1. Discovery cards must not render a `hasFamilyInterest`-specific green ring/outline.
2. No vote-specific `data-testid` for highlight ring remains required in the card component.

### AC-2 Remove Vote-Driven Pulse Animation
1. Discovery cards must not run infinite/pulsing `scale` animation tied to `hasFamilyInterest`.
2. Vote state changes from other members must not trigger persistent card pulse loops.

### AC-3 Neutralize Vote-Specific Green Match Styling
1. No `hasFamilyInterest` branch may produce green “MATCH!” visual treatment.
2. Discovery card visual language remains neutral regardless of `hasFamilyInterest` value.

### AC-4 Preserve Social Ranking and Live Vote Flow
1. Existing `discoveryStore.applyVoteUpdate` re-rank rules remain unchanged:
   - position 0 locked,
   - positions 1–3 move up by at most two slots (never to 0),
   - position 4+ updates in place.
2. `useScheduleStream` continues forwarding `vote_updated` events to `discoveryStore.applyVoteUpdate`.
3. No backend endpoint, DTO, or schema changes are introduced.

### AC-5 Preserve Interaction Smoothness Baseline
1. Discovery swipe interactions (drag, release thresholds, transition off-screen, stack behavior) remain unchanged.
2. Visual simplification must not introduce new transition branches that increase animation work.

## Non-Goals
1. Redesigning the overall Discovery card stack animation system.
2. Changing vote semantics, thresholds, or backend vote processing.
3. Changing planner smart-default behavior or other feature areas.
