# Proposal

## Why

Issue #271 asks for similar core ingredients with different execution, not near-duplicates. Current scoring rewards similarity without an execution signal; separately, Planner's Find Similar callback navigates to `open`, reopening the source instead of requesting Similar.

## Outcome and Scope

Deliver a reviewable investigation, synthetic evaluation and one settled navigation correction. The owner's later delegation authorizes justified implementation beyond the original investigation-only issue. Keep ranking implementation pending concrete product decisions and household examples; do not pick new weights. Preserve all other search purposes, eligibility, rotation and planner assignment semantics. No production data or services.

## What Changes

- Document source-to-request-to-candidate-to-score behavior, limitations and primary-source competitor observations.
- Record representative evaluation examples and separate source observations, measured synthetic results and unvalidated household judgments.
- Correct Planner detail's Find Similar to enter `/recipes?similarTo=<id>`, matching other detail entry points, without creating an assignment target.
- Keep ingredient representation, execution evidence, near-duplicate fallback and suitability decisions open for morning review.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-search`: explicitly cover Planner detail entry under the existing Find Similar requirement. No scoring requirement changes in this slice.

## Impact

Planner callback and regression tests; active OpenSpec investigation artifacts. Search page, API, OpenAPI and generated client remain unchanged. PR #285 Search visuals and PR #286 installation metadata are separate. Base: main `2a5ff0b62484993c14d551aac6e035cf72caec29`. Draft PR only; issue remains open.
