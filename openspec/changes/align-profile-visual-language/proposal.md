# Proposal

## Why

Profile should feel like the same warm, refined household space as the rest of Solar Earth while making the current member and next action immediately recognisable. Source inspection finds tiny tracked uppercase labels, equally emphatic language buttons, layered page-specific background decoration and delayed entrance motion; these are candidates for correction, not findings from a live usability study.

## Outcome and Scope

Align `/profile`, its member dropdown and language selector with the current visual language: cream canvas, readable typography, rounded warm surfaces, soft depth and clear action/state hierarchy. Keep the existing dropdown interaction and member/language ownership. Include local focus, menu dismissal, selected-state semantics, text growth and reduced-motion treatment needed to make these controls usable.

Exclude the `/profile/settings` contents, onboarding redesign, family-management features, identity handoff changes, locale persistence/race fixes, global navigation/theme/viewport changes and new dependencies. Settings stays reachable from Profile. No consequential product decision remains unresolved for this bounded proposal; exact token combinations remain subject to measured rendered review.

## What Changes

- Use the shared cream app canvas rather than Profile's additional fixed white-ended gradient and glow.
- Let the existing localised title and selected name anchor the page; replace 10 px tracked uppercase labels with readable sentence-case labels and a coherent heading outline.
- Retain rounded surfaces and soft elevation; reduce redundant framing, oversized preference padding and visual competition between member selection, Continue-as, language and Settings.
- Show the selected language with a tonal treatment and an explicit non-colour cue rather than two competing action-like buttons. Keep both choices visibly enabled.
- Preserve member selection and Continue-as consequences, while exposing the dropdown's expanded/current state and keyboard dismissal and keeping long menus reachable.
- Keep essential controls available without staged entrance delays; respect reduced motion, EN/FR expansion, narrow widths and bottom navigation clearance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `member-context`: add Profile composition, accessible member-menu interaction and responsive/motion requirements alongside existing identity behaviour.
- `member-preferences`: add readable Profile language presentation and selected-state semantics alongside existing locale resolution/persistence behaviour.

## Impact

Expected application owners: `pwa/src/app/(app)/profile/page.tsx`, `pwa/src/components/profile/ProfileDropdown.tsx`, `pwa/src/components/profile/LanguageSelection.tsx` and their focused tests, plus `pwa/e2e/profile.spec.ts`. Existing EN/FR `common.json` keys may need label casing, fallback alignment or a translated current-member annotation; no broad copy rewrite is planned.

Reuse `pwa/src/app/globals.css`, the shared Button and app-shell background/navigation as existing owners without changing their global behaviour. Design references: [visual language](../../../docs/visual-language-reference.md) and [North Star](../../../docs/creative-direction-north-star.md). Preserve the main [member-context](../../specs/member-context/spec.md) and [member-preferences](../../specs/member-preferences/spec.md) contracts.

No API, generated-client, database or mock-handler contract changes are proposed. The original proposal established planning only. Local implementation, rendered/browser acceptance and final repository verification are now recorded in [task evidence](tasks.md); live persistence and physical-device qualification remain not run.
