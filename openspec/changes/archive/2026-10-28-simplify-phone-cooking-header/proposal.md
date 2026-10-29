# Proposal

## Why

On phones, cooking stacks the photo/title, action buttons and a separate reading-status row before the instructions. Alex prefers the title treatment in `docs/screenshots/demo-cooks-mode.png` and wants the redundant status row removed to give both the food photo and recipe more room. Current source adds a rectangular title backing and reserves at least 44 CSS pixels for that row.

## Outcome and Scope

Simplify the stacked phone composition while retaining accessible recipe identity, reading position and every existing cooking action. At ordinary phone portrait sizes, both the photo and instruction viewport should gain height compared with matched current captures. Enlarged text and short landscape layouts must favour usable reflow over fixed height gains.

This is a phone/stacked-layout change. Preserve the tablet sidebar composition, cooking state, API contracts, member preferences, source consultation and completion behaviour. No global typography, media-viewer, Profile or recipe-parser redesign. No consequential product decisions remain open; the exact responsive allocation is a design tuning detail subject to the acceptance checks.

## What Changes

- Restore bold white recipe-title text directly over the phone photo, using a continuous dark gradient rather than a rectangular backing behind the title.
- Remove the phone reading-status row and its visible step counter/repeated preparation label. Keep the thin terracotta progress bar and its accessible position/count semantics.
- Put the focused-step Edit action alongside the presentation/Original controls below the phone image; show it only for an available focused instruction outside editing. All steps retains per-instruction editing.
- Keep preparation and unavailable-content explanations in the reading content, without a replacement status strip.
- Reallocate some recovered space to a modestly taller photo and the remainder to instructions; retain stationary photo, controls and footer while instructions scroll.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cooking`: phone composition, reading semantics without a visible status strip, and placement of focused-step editing.

## Impact

Primary owners are `pwa/src/components/planner/CooksMode.tsx`, its component tests and `pwa/e2e/cook-mode-steps.spec.ts`. Update affected recovery tests only where they assert superseded phone indicators. Reuse existing tokens, accessible control names, fixture photos and API mocks. No endpoint, schema, generated-client or database changes are planned. The existing canonical cooking spec explicitly requires a visible indicator separate from the action row; this change deliberately replaces that requirement for the stacked layout through its delta.
