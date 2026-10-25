# Design

## Context and Existing Ownership

Discovery already switches synchronously on `session.phase === 'converged'` in `pwa/src/app/(app)/discovery/page.tsx`. Its static status region survives same-round updates. `CookedSuccessCard` in `HomeSections.tsx` owns the requested shell, check, typography and button presentation. Planner consumes `weekOffset` and `referenceWeekStartDate`, while `plannerStore.setActiveTab` selects the meal plan.

The later user request intentionally supersedes #322's historical logo/two-heading/no-CTA decision. Matches remain suggestions; planning lifecycle and assignment owners are unaffected.

## Decisions and Tradeoffs

Extract only a `SuccessCard` presentation: shell, decorative check, text and native action button. Supply heading level, text, action and existing test IDs through props. Keep Home's wrapper, resulting markup/classes/test IDs and optional dismiss callback intact. Discovery alone selects a dark small-text tone using the existing sage-900 token for the action; the green shell, white large headline/check, typography and spacing stay the same. This avoids duplicate visual ownership without creating a design framework.

Discovery supplies an h1 and selects the session week at render time. Its click handler uses `URLSearchParams` with `weekOffset=0` and the session's `weekStartDate`, selects `planner` through the existing store API, then pushes the route. No date arithmetic or new Planner state API is needed. Session validation already rejects owned snapshots without a nonempty absolute week.

## First Observable Slice

Hydrate a non-current converged session into the real Discovery store, render the shared card, activate its action, and observe the anchored route plus selected Planner tab. Unit coverage establishes copy, status semantics, stable identity and no automatic navigation. Browser coverage exercises the actual router, Planner store, schedule GET and meal-plan display with boundary-mocked APIs.

## State, Concurrency and Recovery

Retain the authoritative convergence branch ahead of loading and its ordinary status region (`role=status`, `aria-live=polite`). No timer, entry animation, modal, focus transfer, dismissal latch or vote change is introduced. Existing mid-drag unmount and pending-vote processing remain in place. Late SSE updates keep the same card mounted.

## User Experience

Use the existing green success presentation and one headline and matches action, leaving the localized description empty in English and French. Votes cast, recipes viewed and time to agreement are possible future description content; no metrics are implemented in this change. Let the flex layout consume the shell's usable space, whose bottom padding reserves navigation and safe-area insets; avoid subtracting an unrelated fixed viewport height. Retain scrolling for short/enlarged-text screens. Verify 320×740, 390×844, 768×1024 and 1280×900 with deterministic disposable fixtures, keyboard activation and reduced motion. Preserve all collecting/exhausted/loading behavior.
