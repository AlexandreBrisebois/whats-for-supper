# Design

## Context and Existing Ownership

Source inspection on 27 October 2026 establishes the current implementation, not runtime usability acceptance:

- `TonightMenuCard.tsx` owns `TonightCardBase`, fixed/clamped card sizing, absolute front/back faces and a whole-card click handler. Cook and Change Plan exist only on the reverse. The reverse uses translucent white, ingredient chips and small uppercase text.
- `TonightPivotCard.tsx` reuses the shell and sizing, selects ready/pending/checking/no-GOTO branches, and currently places filled GOTO setup before Quick Find and Order In. Some copy is hard-coded English.
- `HomeCommandCenter.tsx` owns branch selection and callbacks into Today, Quick Find, cooking and recovery. Non-Mystery non-cooking plans already use a compact sage Planner handoff; they do not need this pivot redesign.
- `todayStore.ts`, GOTO stores/services and accepted Tonight/recovery requirements own freshness, assignment optimism and persistence. This design consumes them without adding state policy.
- `globals.css` owns tokens, Outfit/Inter, surfaces and safe-area utilities. `docs/visual-language-reference.md` supplies the intended visual roles and existing contrast calculations. The shared button primitive's current variants do not all meet this treatment; do not change it globally to service these two cards.
- `HomeSizing.test.tsx` currently asserts clamp classes; those are stale expectations once content-driven sizing is implemented. `HomeDuration.test.tsx`, `TonightPivotCard.test.tsx` and `home-recipe.spec.ts` cover relevant behavior. Some E2E recovery tests flip first and use `dispatchEvent`; update affected entry sequences to real clicks while preserving downstream assertions.

## Decisions and Tradeoffs

1. **Retain the visual family.** Keep cream canvas, white rounded cards, Outfit recipe titles, Inter context, existing Lucide icons and food imagery. Use one restrained outer shadow and remove competing image shadows. Keep sage's existing roles; Quick Find may retain its existing indigo role. No new palette or icon vocabulary.
2. **Fix pairs locally.** Use charcoal/charcoal-600 for essential/supporting copy. Cook and Make this tonight keep ochre with charcoal text and an ochre-800 edge where a boundary identifies the control. Change plan uses a readable charcoal outline. Order In uses a readable outlined treatment and the existing ShoppingBag vocabulary, visibly available. Verify actual composites; do not infer them from a token name.
3. **Proposed type targets.** Keep recipe titles near 28–30 px with enough line height for wrapping; use 14/21 supporting copy and 16/24 semibold action labels. Use sentence case, with an explicit exception for the current READY IN / PRÊT EN wrappers and formatted units. Keep context headings semantically ordered independently of visual size.
4. **Use content-driven layout in both cards.** Replace fixed/clamped outer height and absolute face layout with ordinary document flow. Give imagery its own responsive aspect ratio so it cannot consume the room needed by text/actions. Stack actions on narrow widths or when labels need room; never reduce type to preserve two columns. Continue using existing Home bottom inset rather than inventing another navigation offset.
5. **Replace flipping with inline disclosure.** Keep one semantic View ingredients button (`aria-expanded`, `aria-controls`), changing to Hide ingredients when open. Description and ingredients expand in the same card; primary actions stay visible in its normal flow. This avoids managing two interactive 3D faces and allows natural text growth. Use current motion primitives only if helpful; reduced motion has no transform dependency. Collapse on recipe identity changes, retain visibility for detail hydration of the same identity. Collapse returns/retains focus at the disclosure control; hidden details are removed from interaction.
6. **Move, do not duplicate, planned actions.** Preserve `cook-mode-btn` and `skip-tonight-btn` with a single occurrence each; preserve their recipe-specific callbacks and existing test IDs elsewhere. No ancestor click handler should intercept action or disclosure taps. Existing recovery remains responsible for pending/partial-failure behavior.
7. **Prioritize the current task.** Ready GOTO: context → image/name → Make this tonight → Quick Find/Order In. No ready GOTO: state → Quick Find → Order In → setup when no active GOTO. Checking/preparing feedback is distinct and does not show confirmation. Preserve saved Mystery label/note context instead of using ordinary-empty wording. Do not introduce a separate conceptual suggestion card.
8. **Localize only affected copy.** Reuse existing locale keys where meaning is equivalent; add keys for missing pivot state/disclosure copy. Proposed EN/FR starting copy: “Nothing planned for tonight” / “Rien de prévu pour ce soir”; “Your family's GOTO” / “Le GOTO de votre famille”; “View ingredients” / “Voir les ingrédients”; “Hide ingredients” / “Masquer les ingrédients”. Review in context with existing terminology. These examples are not exact-copy acceptance requirements; meaning and localization are. Do not replace Quick Find with language promising a cooking-duration filter.

## First Observable Slice

Session 1 presents a long named planned recipe and an empty/ready-GOTO pivot at `/home`, with readable existing actions and content that survives narrow widths and larger text. The real internal path is Home rendering → the actual card → shared shell, formatter, locale and CSS. Component tests alone do not establish layout; Playwright must exercise the actual rendered components and attach screenshots/geometry results. Use existing schema-compliant fixtures at the API boundary. No backend change is needed for this slice, and no live service or database guarantee follows from it.

Session 2 then carries a front-facing Cook/Change plan click through actual Home orchestration to cooking or recovery and validates explicit details disclosure. Session 3 carries each pivot choice through that same real UI to its existing handoff/mutation boundary. Each session completes its own browser acceptance before the next begins.

## State, Concurrency and Recovery

Only disclosure visibility is new transient UI state. Recipe identity changes reset it, and same-recipe detail hydration must not show another identity's content. No new server-confirmed/saving badge is derived from the presence of a recipe; ordinary assignment remains optimistic. Do not add “Saved” or a check mark that promises persistence.

Opening ingredients, cooking, recovery or Quick Find must not itself complete cooking or alter the plan. Existing authoritative calendar checks, Mystery preservation, non-cooking handoff, recovery cancel/pending guards, stage-specific retry and late-response handling remain with their owners. Retain replacement recovery coverage when changing its entry affordance; do not broaden this work into concurrency fixes.

## User Experience

Primary checks map to the six requirements in the delta:

| Session | Observable acceptance | Required rendered review |
|---|---|---|
| 1 — Readability and space | Readable Tonight card content; Keep Tonight content reachable as space changes | Both cards, long titles, absent image/details, enabled secondary controls, checking/preparing text and actual contrast pairs |
| 2 — Planned meal | Offer planned Tonight actions before opening details; Disclose Tonight ingredients explicitly | Initial Cook/Change plan, expand/collapse, missing ingredients, changed recipe, keyboard focus, reduced motion, recovery cancel |
| 3 — Pivot | Prioritize immediate Tonight choices over GOTO setup; Explain the Tonight choice without claiming a saved outcome | Ready, unavailable/failed read, pending/checking represented props, ordinary empty and Mystery; Profile/Quick Find/Order In handoffs |

For each session use EN and FR at 320 px, iPhone 390×844, Pixel 412×915, and iPad 820×1180/1180×820. Check affected content at 200% text enlargement (enlarge text in the fixture without changing the global zoom policy), 48×48 CSS px targets, no horizontal overflow, no overlapping labels, and all controls reachable through vertical scrolling above navigation. Retain screenshots after fonts settle. Keyboard checks cover affected controls with real Tab/Enter/Space and visible focus. Measure normal/hover/focus/pressed styles where they change; no screenshot alone establishes semantic or interaction acceptance.

Refresh the visual reference's affected examples as each treatment lands: distinguish implemented source from schematic examples and remove stale flip/action-placement claims. Do not redraw unrelated boards or describe source changes as runtime qualification.

## Risks and Deferrable Questions

- A taller expanded card may require more scrolling. Keep actions ahead of the disclosure/details and validate reachability; do not restore a fixed-height trap to avoid scrolling.
- Hard-coded labels and flip-based selectors can leave stale tests. Update expectations to the approved behavior, retain duration/failure assertions and use ordinary Playwright clicks, not forced dispatch to bypass hit testing.
- The service normally returns only ready active GOTOs. Pending/checking prop coverage is component evidence; do not manufacture a new endpoint behavior to demonstrate it.
- Exact shadow strength and image aspect ratio can be tuned during rendered review within this layout and action hierarchy. There are no unresolved product-policy choices required for implementation.
