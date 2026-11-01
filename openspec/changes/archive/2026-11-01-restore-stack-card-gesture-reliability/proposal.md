# Proposal

## Why

Alex reports difficult card grabbing and repeated attempts to open card detail in the latest beta, while Discovery voting feels easy and the last stable did not show the problem. Source inspection identifies different movement resistance and a persistent tap-suppression bug; full-layout Chromium comparison now also reproduces a beta-specific title/body touch cancellation at the new inner scroll boundary, while actual-device qualification remains pending.

## Outcome and Scope

Restore reliable movement in Browse STACK MODE using Discovery's shared movement mechanics, and make a new tap work immediately after an incomplete or interrupted gesture. “Flip” is interpreted as opening recipe detail: the current card has no reverse face and its tap callback opens RecipeDetailSheet. Preserve ordinary-phone card dimensions, existing short-screen adaptations, one-handed controls, keyboard detail activation, browsing navigation and Discovery voting.

Alex approved implementation of this reviewed scope in the cloud. Alex subsequently authorized commit/push of this fix into review/profile-settings-home-visuals. Tags, release, manual build dispatch and PR publication remain excluded. Diagnostic and acceptance fixtures are local and use no production services/data.

## What Changes

- Share the existing horizontal movement mechanism between Discovery and Browse, including direct tracking rather than Browse's reduced elasticity. Retain each consumer's release thresholds and action meaning.
- Scope tap suppression to the current pointer session; an abandoned short drag must not poison later taps.
- Explicitly handle cancellation and departed card lifecycles, with no accidental navigation/detail opening or stale animation completion.
- Apply the effective horizontal-drag touch policy to the beta's inner card-body scroller and retain current responsive scrolling. The release-pinned Motion experiment shows that a declaration-only `touch-action` edit is insufficient because Motion overrides it; any further scroll correction needs a full-layout reproduction.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: add direct manipulation and interrupted-gesture recovery; clarify that drag-suppressed detail activation applies only within the current gesture.

## Impact

Expected implementation boundary: `RecipeStackCard.tsx`, `DiscoveryCard.tsx`, one small shared movement hook/module and their focused unit/browser coverage. Browse page changes are limited to cancellation/scroll integration if required by the pinned-runtime reproduction. No API/schema, SDK, persistence, voting-policy, dimensions, typography or layout redesign.

Reviewed baseline: `dockerhub/v0.1.37-beta.17` → `74ed426925896fa01b28f093e399e4f93e48d9a0` on `review/profile-settings-home-visuals`, versus stable `dockerhub/v0.1.36` → `ee6e5ffe4057c1023be00112345a14e76b09ecdc`. Exact provenance, diagnosis, evidence limits and test plan are in design.md.
