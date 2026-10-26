# Proposal

## Why

The current saturated purple demo band and CTA dominate the cream Home screen. The approved adjustment reduces their visual weight before demo visitors arrive while preserving the explanation and its accessible interaction.

## Outcome and Scope

Use the explicitly approved 32px minimum full-width sage target, without decorative cream padding above or below; preserve necessary device safe-area inset. This is a scoped exception to the former 44px band requirement; modal controls remain at least 44px. Preserve first visit, dismissal, reopening, reset and focus behavior. Change only demo presentation, the static title outline and the approved four-paragraph disclaimer; no API, provider, account, global palette or deployment changes.

## What Changes

- Replace purple/white demo band requirements with pale sage/charcoal, retaining 4.5:1 contrast in normal, hover and pressed states.
- Use 13px/18px medium text and a 16px help icon; permit wrapping and text growth.
- Give Start exploring a dark sage surface, white text, darker interaction states and contrasting focus.
- Use the user’s exact four-paragraph English disclaimer, including “Whats for Supper” and definite future reset, with natural aligned French. Remove the old self-hosted-household sentence; preserve the separate setup link and Start exploring.
- Suppress only the disclaimer’s static title outline while preserving initial focus semantics and visible keyboard focus on interactive controls.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `demo-household`: soften the reopenable context presentation and clarify subscription copy.

## Impact

DemoContext, a scoped title-style option on DemoDialog, EN/FR demo-only locale copy, focused unit/browser acceptance, and this OpenSpec delta. Existing tokens come from globals.css and match reference commit 169f542. No backend or data changes. Archived specifications remain untouched.
