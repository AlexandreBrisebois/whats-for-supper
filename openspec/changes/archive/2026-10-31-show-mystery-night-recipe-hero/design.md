# Design

## Context and Existing Ownership

`TonightPivotCard` already renders the ordinary ready suggestion with `TonightCardBase`, `TonightRecipeImage` and `aspect-[5/4]`. Its image URL is currently gated by `!nonCookingLabel`, and a separate large body heading renders Mystery identity. `HomeCommandCenter` supplies saved Mystery context and owns the existing explicit assignment/Quick Find/Order In callbacks. `TonightRecipeImage` owns missing/error fallback and resets by recipe/source key. The current canonical cookbook requirement includes saved non-cooking context in the icon scenario; the delta narrows that scenario for ready Mystery proposals.

## Decisions and Tradeoffs

For `nonCookingKind === 'mystery'` with its saved label and an actionable ready proposal, use that label in the ordinary header, permit the same explicit or standard hero URL as the ordinary ready pivot, and omit the duplicate body Mystery heading. Keep the existing shell, title, family-GOTO context, image geometry and actions. Avoid a new component, alternate compact card or shared image change.

The approved tradeoff is additional useful food photography and vertical scrolling in place of decorative Mystery content, while retaining Mystery identity. A smaller photo would lose the normal suggestion's visual consistency. No consequential design question remains. Non-ready/no-proposal Mystery keeps its existing presentation; ready proposals whose images fail keep the normal modest fallback with the Mystery header.

## First Observable Slice

Load Home with a saved recipe-free Mystery day plus a ready active GOTO. Verify the ordinary header precedes the 5:4 photograph and normal recipe title/actions, with no schedule mutation until explicit acceptance. This slice spans the actual Home/pivot/image composition and existing callbacks/stores; external API responses are mocked at the existing Playwright request boundary. No backend behavior changes or production qualification is required.

## State, Concurrency and Recovery

Do not alter readiness, active-read, assignment, date targeting, request handling or recovery. Rendering a ready proposal and opening/cancelling Quick Find leave the saved Mystery plan intact. Make this tonight remains the explicit existing acceptance action. Image failure must not hide actions or change readiness. Preserve source/recipe keyed fallback recovery.

## User Experience

Use the existing localized Mystery label (`Mystery night` / `Souper mystère`) in the normal quiet header style, above food photography. Keep full recipe title wrapping, accessible image description, normal font sizes and width cap, no added copy, unchanged button labels/order/styles, at least 48px controls and visible keyboard focus. Page flow handles phone/iPad and 200% text growth.

## Risks and Deferrable Questions

The supplied Library PNG could not be materialized into readable Mac bytes: supported preparation succeeded but the current transfer helper reported `download failed`, including one retry with a consumer-local destination. Pixel comparison is unavailable; source confirms the current gating and geometry. Rendered final composition still requires inspection. No new design tradeoff may be silently introduced.
