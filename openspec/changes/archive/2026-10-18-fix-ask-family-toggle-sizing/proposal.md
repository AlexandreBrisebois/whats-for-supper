# Proposal

## Why

Long state-dependent copy in DiscoveryToggleCard lets its flex track shrink on narrow screens while its fixed thumb overflows. The recipe-editing specification already requires the concise English subtitle; both English and French translations remain available.

Search alternatives also stack a 12-pixel flex gap and 24-pixel image margin, with nested padding and single-line titles. Browse list cards already use compact edge-to-edge 4:3 images and two-line names. The Search spacing originated in c7bec241c32db74e33e70402843bf25c91ad22a5 (May 13), independently of the recent voting work.

## Outcome and Scope

Restore the localized subtitle and stable track/thumb geometry in recipe detail and its shared StackActionBar consumer at 320, 390 and 1280 CSS pixels. Preserve handlers, accessibility, pending/error behavior and all discovery business rules. No API, persistence, deployment or production-data changes.

Also match regular Search cards to Browse at 360, 390 and 430 pixels, preserving Top Pick, ranking, filtering, Similar/planner context, issue badges, detail-return and continuation/recovery behavior. Both fixes are explicitly authorized in one PR.

## What Changes

- Restore the existing localized concise subtitle in both states.
- Make regular Search cards use Browse-like image ratio, corners, padding, two-line names, readable times and mobile grid gaps; keep Top Pick distinct.
- Reserve track width and allow the text column to wrap.
- Test rendered geometry, exact PATCH values and pressed states, with component and shared-consumer regression coverage.
- Preserve docs/user-guide.md: it already explains Human OFF, human re-enable and eventual Dreaming cooldown accurately.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- recipe-search: compact ordinary-result presentation consistent with Browse.
- Toggle behavior repairs existing recipe-editing requirements without a delta.

## Impact

DiscoveryToggleCard, its component tests, recipe browser regression and shared StackActionBar acceptance. Existing API and generated client remain unchanged. Browser mocks establish UI/request behavior, not database persistence.
