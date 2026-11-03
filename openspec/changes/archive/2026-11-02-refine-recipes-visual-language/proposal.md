# Proposal

## Why

The unified Recipes flow works, but its canvas is inset from the app shell and its expanded Search field lost the visual hierarchy of the former Search page. On a phone this leaves a visible strip beside the content above the full-width dock; on iPad the grid widens but the page-wide side rails still differ from the reviewed app pages. The dock also uses a magnifier for the Recipes destination while the page's first control is Search.

## Outcome and Scope

Recipes SHALL use the full app-shell canvas like Home, Planner and Profile. On a 390–393 CSS px phone, the grid/content SHALL begin within one deliberate 16–20 CSS px gutter on each side, without compounded page and content padding; iPad content SHALL keep responsive gutters and bounded cards. The toolbar SHALL use its full available width before wrapping. Expanded Search SHALL regain an identifiable, localized input and filter/result hierarchy using the existing Solar Earth visual language. The Recipes dock entry SHALL use a recipe-book icon with its existing label. This change is visual and presentational: the approved unified Explore/Search behavior and its session, pagination, navigation, planning and recovery contracts remain intact.

The observed missing-hero case is a separate optional follow-up. Its source recipe has no hero file and currently returns 404; this proposal records a fallback recommendation but does not require media generation, change recipe storage, or include that item in required acceptance.

## What Changes

- Extend the Recipes background/canvas to the shell edges, remove compounded phone content insets, and keep intentional responsive gutters and bounded cards. Let the toolbar use available width before wrapping.
- Restore Search's magnifier, localized example placeholder, soft white/glass field, visible terracotta focus, applied-filter count cue and a modest Results heading. Preserve the compact ordinary cards and omit the retired spotlight and Surprise Me presentation.
- Replace the Recipes bottom-navigation magnifier with the existing Lucide `BookOpen` icon, retaining the Recipes label, destination and active-state semantics.
- Keep the existing terracotta marker when an active Search has hidden controls. Do not alter its condition or the Search disclosure behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: full-width Recipes canvas, responsive content bounds and Recipes destination icon.
- `recipe-search`: visual hierarchy and accessible state cues for expanded Search and ordinary results.

## Impact

The presentation owners are `pwa/src/app/(app)/layout.tsx`, `pwa/src/app/(app)/recipes/RecipesExperience.tsx` and `pwa/src/components/common/Navigation.tsx`, with existing EN/FR strings and Solar Earth tokens reused. No API, ranking, data model, persistence, generated client, dependency, or production configuration change is proposed. This change follows the completed `unify-recipe-browse-search` change without editing or archiving it. Visual references: `docs/visual-language-reference.md`, `.agents/skills/designer/visual-identity.md`, and the reviewed Home, Planner and Profile pages.
