# Design

## Context and Existing Ownership

DemoContext owns the band and modal content; DemoDialog owns focus and sheet/dialog layout. demoContextStore owns first visit and acknowledgement independently of reset. The inspected Library screenshots show the current purple band/CTA. Current globals.css tokens match PR347 reference commit 169f542. See proposal for scope.

## Decisions and Tradeoffs

The user explicitly approved reducing the band’s target from 44px to a genuine 32px minimum. Remove outer vertical padding; the full-width sage span and button share the same 32px minimum footprint. Preserve only the device safe-area inset outside it. Retain sage-100/200/300 against charcoal, 13px/18px medium text, a nonshrinking 16px icon and content-driven wrapping/growth. Other modal controls remain at least 44px. Use sage-700/800/900 with white for the CTA and contrasting interactive focus indicators.

Keep DemoDialog’s initial title focus, tabindex, accessible name/description and close/focus-return logic. Add a default-preserving title-outline style option and disable it only from DemoContext. No global focus removal or changes to unrelated dialog consumers. The four demo body paragraphs live in the existing demo-only locale keys and fallbacks; preserve the separate setup link and exploration CTA. English uses the user’s exact “Whats for Supper” spelling and definite future reset; French uses “seront réinitialisées”. Remove the old self-hosted sentence.

## First Observable Slice

At synthetic ready Home, the first visit opens the same DemoDialog with approved subscription copy; dismissing exposes the softer band; keyboard or pointer reopens it and returns focus. Unit tests cover EN/FR copy and existing state behavior. Playwright exercises the real DOM/CSS at loopback with existing schema-compliant route fixtures, measuring actual inner surfaces, CTA contrast and targets.

## User Experience

Retain existing lifecycle logic and shared dialog behavior. Validate normal/hover/pressed contrast, the approved 32px band and 44px modal controls, phone/iPad EN/FR screens, 320px expanded text, close/reopen, first visit and reset-boundary preservation. Browser screenshots must show Home and the context modal. No live data, AI requests, deployment or merge.

## Self Review

The delta replaces the purple/white requirement without altering preserved scenarios. The user-approved 32px band supersedes the earlier 44px-target/28px-strip plan only for this control. All text can wrap. Exact English copy and aligned French are bounded to demoContext.shared, demoContext.temporary and demoHosting.body; the existing AI paragraph is preserved. Static title outline suppression is opt-in for DemoContext; interactive focus and unrelated dialogs retain their defaults. State, APIs, global palette and archived history are outside the diff. No consequential design questions remain. Existing user approval authorizes this bounded implementation after this review.
