# Design

## Context and Existing Ownership

This design supports the bounded [proposal](proposal.md). Design is included because composition and accessible interaction decisions span the page and two controls.

The exploration is source-based; no local app preview was present in the browser inventory and no rendered Profile inspection was performed. The historical `specs/mockups/solar_earth_profile.png` is not an accepted composition anchor for this proposal.

| Owner | Source-observed finding | Human consequence / proposed correction |
|---|---|---|
| `pwa/src/app/(app)/profile/page.tsx` | `max-w-sm`, `gap-12`, fixed radial gradient ending white, separate ochre blur, 1000 ms entrance; Continue-as has delayed animation | Page-specific decoration and staging compete with a brief identity task. Use the shared canvas, tighten relationships and show controls immediately. |
| `ProfileDropdown.tsx` | Correct selected-name emphasis; 10 px tracked uppercase Active Member; custom absolute menu, current check plus hard-coded English annotation; no expanded association or Escape handler | Preserve name emphasis and menu model; make the context readable and state/focus understandable. Bound menu height and keep every name reachable. |
| `LanguageSelection.tsx` | Large `p-8` glass card, tiny uppercase heading, active solid terracotta/white button, no pressed semantics | Preference occupies disproportionate attention. Use a quieter grouped surface, normal heading and tonal selection with check/pressed state. |
| App layout and shared CSS | `/profile` already receives `solar-earth-bg`; shared cream/glass, token variants and Outfit/Inter exist | Reuse those owners; remove only the extra Profile backgrounds. Glass and soft elevation remain valid where the composite is readable. |
| EN/FR `common.json` | Actual titles are Table's Set! / À table !; source fallback still says Who's Eating? | Preserve catalogue copy and align affected fallbacks. Do not mistake fallback text for rendered title. |
| Existing tests | Profile page unit test stubs both controls; language tests assert old fill classes; Profile E2E covers title and Continue-as only | Add meaningful interaction/state coverage. Replace obsolete class expectations while retaining persistence assertions. |

`member-context` owns identity selection, cookie/navigation requests and Continue-as. `member-preferences` owns locale resolution, browser choice and preference reconciliation. Their existing qualifications remain applicable: a navigation request is not proof of completed identity handoff; a language selected cue is not proof of remote persistence. `docs/flows/user-flows/profile-member-selection.md` contains historical assertions about layout remount/SSE and contrast; these are not adopted as runtime guarantees.

## Decisions and Tradeoffs

1. **Keep the dropdown.** An always-visible avatar grid would change the interaction and require new layout behaviour for large households. The existing compact named chooser is sufficient when its labels, current state, focus and scrolling work.
2. **Use a compact warm composition.** Keep a single centred reading column with a distinct header, member block/Continue-as and quieter language group. Retain the current generous rounded vocabulary and soft shadow rather than flattening everything or nesting multiple elevated cards. Settings stays in the header in normal layout flow, with a 48 px target and clear focus; avoid absolute positioning that can collide with wrapped title text.
3. **Retain colour roles without a quota.** Use charcoal for essential reading, terracotta-600/700 for action cues and blush terracotta-50/100 for tonal preference selection, subject to actual contrast. Continue-as remains a visible quiet secondary action. Ochre and sage remain part of the application; no need to force a new filled green/yellow control onto Profile. No global token or Button variant change is required.
4. **Keep native buttons and list semantics.** The member trigger exposes `aria-expanded` and `aria-controls`; the associated labelled list contains ordinary named buttons in normal Tab order. Use a current-state semantic such as `aria-current` on the matching choice with a localised accessible annotation and a visible check. Do not add `role=menu` without its full keyboard model. Escape inside the chooser closes and returns focus; toggle/outside dismissal retains its existing no-selection consequences. Selection still calls the existing callback.
5. **Make language a labelled button group.** Use the existing English/French buttons with `aria-pressed`, a redundant decorative check and selected tonal surface. Labels remain full words. Use a logical section heading below the page h1, replacing the isolated h3. Retain local/provider/store calls and failed-save policy. Do not add a success toast or change locale resolution to make tests pass.
6. **Remove decorative staging locally.** Remove page and Continue-as entrance delays. Make chooser transitions and loading respect reduced motion. Keep loading geometry stable with `profile.loading` available to assistive technology. No new animation library, global motion policy or root viewport change.

These are proposed design defaults for review, not inferred user approval of a rendered treatment. Specific spacing and existing shade combinations can be tuned within these choices after comparison.

## First Observable Slice

Start with a loaded returning member opening `/profile`: page → real ProfileDropdown → existing `useFamily` selection view and app shell → open choices → Escape or Continue-as. Show the chosen name and readable context, and prove dismissal does not call selection while Continue-as only requests Home. This slice touches frontend rendering and existing state/callback boundaries; no backend change is needed.

Follow with the language group using the actual LocaleProvider and family store at browser level, preserving the existing preference endpoint seam. Focused component tests establish callbacks and semantics; Playwright establishes page integration and layout with schema-compliant fixtures. Mocked browser acceptance does not qualify live cookie handoff or PostgreSQL persistence.

## User Experience

Proposed reading order (schematic, not a rendered mockup):

```text
Table's Set!                         Settings
Pick a family member to get started.

Active member
[ user cue  Alex                       v ]
           Continue as Alex

Language
[ check English ] [ French ]
                 ... bottom navigation
```

At narrow widths the header and language buttons may wrap/stack. Names and Continue-as wrap fully. Use readable 14 px or larger supporting labels, an Outfit title/member name and Inter control/body copy. Choose spacing by grouping rather than preserving the current 48 px page gaps and 32 px preference padding as fixed rules.

Test EN/FR at 320, 390 and 412 CSS px widths, iPad portrait/landscape, 200% text enlargement, long names and a household list taller than the viewport. The dropdown needs a constrained scroll region, with keyboard focus brought into view and clearance from navigation. Use existing safe-area handling; local padding can change without editing the shared navigation.

Loading remains a stable, described placeholder. No matching loaded member means a selection prompt and no Continue-as; Settings and language remain available. Existing family-load and preference failures remain owned by their current stores/flows. This presentation slice neither adds a new retry workflow nor claims to repair empty-family recovery or persistence races. Test that rejection is not newly represented as saved success.

Capture before/after views with identical member names, locale, list, state and viewport. Review separately: warmth/depth, title/name hierarchy, preference emphasis, enabled secondary actions, menu clarity and text expansion. Compare against the current visual-language reference's shared principles; Home's food photography and recipe-card proportions are not Profile requirements. Measure actual composite text/control/focus contrast. Passing tests and contrast ratios alone do not establish aesthetic quality or whole-app accessibility.

## Implemented local treatment

The labelled native-button list expands in document flow, with `min(60dvh,24rem)` vertical scrolling. This keeps long/200% text menus and following actions reachable through normal page scrolling instead of an absolute overlay covering fixed navigation. Escape returns focus to the trigger; native Tab order remains. Warm light surfaces use local soft shadows; the old `shadow-glass` class has no current definition. These are bounded layout choices within the accepted dropdown model, with no navigation/global token change.
