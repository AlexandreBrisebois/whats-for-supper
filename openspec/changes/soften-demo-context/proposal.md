# Proposal

## Why

The current saturated purple demo band and CTA dominate the cream Home screen. The approved adjustment reduces their visual weight before demo visitors arrive while preserving the explanation and its accessible interaction.

## Outcome and Scope

Keep the full-width target at least 44px high, with an approximately 28px pale sage inner strip, cream surrounding space and smaller medium text. Preserve first visit, dismissal, reopening, reset and focus behavior. Change only demo presentation and the approved self-hosting subscription sentence; no API, provider, account, global palette or deployment changes.

## What Changes

- Replace purple/white demo band requirements with pale sage/charcoal, retaining 4.5:1 contrast in normal, hover and pressed states.
- Use 13px/18px medium text and a 16px help icon; permit wrapping and text growth.
- Give Start exploring a dark sage surface, white text, darker interaction states and contrasting focus.
- Retain “A self-hosted household keeps your own plans.” and use exactly “AI features require your own subscription.” Align French naturally.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `demo-household`: soften the reopenable context presentation and clarify subscription copy.

## Impact

DemoContext, EN/FR demo-reset locale copy, focused unit/browser acceptance, and this OpenSpec delta. Existing tokens come from globals.css and match reference commit 169f542. No backend or data changes. Archived specifications remain untouched.
