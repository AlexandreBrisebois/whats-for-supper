# Design

## Context and Existing Ownership

DemoContext owns the band and modal content; DemoDialog owns focus and sheet/dialog layout. demoContextStore owns first visit and acknowledgement independently of reset. The inspected Library screenshots show the current purple band/CTA. Current globals.css tokens match PR347 reference commit 169f542. See proposal for scope.

## Decisions and Tradeoffs

Keep the button full width and min-h-11, with 8px vertical cream padding surrounding a full-width min-h-7 inner span. Use sage-100, hover sage-200 and pressed sage-300 against charcoal. Inner content uses text-[0.8125rem] leading-[1.125rem] font-medium and a nonshrinking 16px icon; relative units support growth. The button grows with its content. Use sage-700/800/900 with white for the CTA and charcoal focus outlines. No palette or shared-component edits.

## First Observable Slice

At synthetic ready Home, the first visit opens the same DemoDialog with approved subscription copy; dismissing exposes the softer band; keyboard or pointer reopens it and returns focus. Unit tests cover EN/FR copy and existing state behavior. Playwright exercises the real DOM/CSS at loopback with existing schema-compliant route fixtures, measuring actual inner surfaces, CTA contrast and targets.

## User Experience

Retain existing lifecycle logic and DemoDialog untouched. Validate normal/hover/pressed contrast, 44px targets, phone/iPad EN/FR screens, 320px expanded text, close/reopen, first visit and reset-boundary preservation. Browser screenshots must show Home and the context modal. No live data, AI requests, deployment or merge.

## Self Review

The delta replaces the purple/white requirement without altering preserved scenarios. Visual strip height is distinct from target height; all text can wrap. Exact English copy and aligned French are bounded to demoHosting.body. State, APIs, global palette and archived history are outside the diff. No consequential design questions remain. Existing user approval authorizes this bounded implementation after this review.
