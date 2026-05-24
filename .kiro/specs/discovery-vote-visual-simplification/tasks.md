# Tasks: Discovery Vote Visual Simplification (Older-Phone Smoothness)

## Implementation Plan
This work is sequenced in Red-Green waves so regression risk is isolated and behavior remains intentional.

## Tasks

- [ ] 1. DiscoveryCard Unit Tests — Red Baseline for Visual Branch Removal
  - Update `pwa/src/components/discovery/DiscoveryCard.test.tsx`.
  - Replace old ring-specific assertions with tests that assert visual parity for `hasFamilyInterest=true/false`.
  - Add assertions that no vote-specific highlight branch is required for rendering.
  - Run targeted component tests and confirm failing/red state before implementation changes.
  - _Requirements: AC-1, AC-2, AC-3_

- [ ] 2. DiscoveryCard Visual Simplification — Green
  - Update `pwa/src/components/discovery/DiscoveryCard.tsx`.
  - Remove `hasFamilyInterest`-specific ring/outline styles.
  - Remove vote-driven infinite/pulsing scale animation.
  - Remove green match-specific visual branch tied to `hasFamilyInterest`.
  - Keep drag/swipe mechanics and stack transitions unchanged.
  - _Requirements: AC-1, AC-2, AC-3, AC-5_

- [ ] 3. Regression Guards — Preserve Vote Ranking and Live Event Path
  - Verify `pwa/src/store/discoveryStore.test.ts` remains green with re-rank rules intact.
  - Verify `pwa/src/hooks/useScheduleStream.test.ts` remains green for `vote_updated` dispatch into discovery store.
  - No logic changes to ranking/event flow unless a test reveals accidental drift.
  - _Requirements: AC-4_

- [ ] 4. Validation and Completion Gates
  - Run `task agent:test:impact`.
  - If test impact is unclear or broadens, run `task review`.
  - Confirm no contract files changed and no API drift introduced.
  - _Requirements: AC-4, AC-5_

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": [1],
      "goal": "Establish red tests that encode the new neutral visual contract"
    },
    {
      "wave": 2,
      "tasks": [2],
      "dependsOn": [1],
      "goal": "Implement visual simplification while preserving interaction behavior"
    },
    {
      "wave": 3,
      "tasks": [3],
      "dependsOn": [2],
      "goal": "Prove social ranking and SSE vote flow are unchanged"
    },
    {
      "wave": 4,
      "tasks": [4],
      "dependsOn": [3],
      "goal": "Run validation gates and confirm drift-free completion"
    }
  ]
}
```

## Definition of Done
1. Discovery cards no longer show vote-driven green highlight/pulse branches.
2. Vote-driven ranking behavior remains unchanged and covered by tests.
3. SSE vote update wiring remains unchanged and covered by tests.
4. No OpenAPI/backend contract changes introduced.
