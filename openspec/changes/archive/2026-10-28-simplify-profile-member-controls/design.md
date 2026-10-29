# Design

## Context and Existing Ownership

This design supports the [proposal](proposal.md) and resolves specification ordering and test integration for the bounded removal.

Source inspection establishes that `pwa/src/app/(app)/profile/page.tsx` owns both removable elements. `ProfileDropdown.tsx` already offers the current member and other members through the same `onSelect` callback. The page callback requests selection, marks onboarding complete and requests Home. The separate Continue-as button only requests Home. These are distinct existing behaviors; removing one does not alter the other.

EN/FR `common.json` owns the titles and the `profile.subtitle` and `profile.continueAs` strings. A targeted consumer search found the two removable keys only in the Profile page. `pwa/e2e/profile.spec.ts` also uses the old button as a readiness signal in language tests and includes it in geometry/focus checks. The user-flow document still describes member cards and the separate action; update the affected narrative to the actual dropdown flow without adding claims about live identity handoff or SSE.

## Decisions and Tradeoffs

- Delete the subtitle paragraph and conditional button block, plus the page's unused `Button`, `tWithVars` and `selectedMember` dependencies. Keep the title keys and fallback exactly as they are. Keep existing shared spacing; do not retain empty wrappers or add replacement copy/actions.
- Keep the real dropdown and callback intact. Selecting the current member still invokes selection and onboarding completion; avoiding those effects would be a separate behavior change.
- Remove only the two unused Profile keys in each locale, after rechecking consumers. Preserve chooser prompts, loading descriptions and titles.
- Replace browser readiness waits with the selected-name or chooser state actually needed by each scenario. Remove the deleted target from geometry/focus lists while preserving their assertions for remaining controls. Retain preference success/failure, local-only language, current/different-member navigation, dismissal, keyboard and long-name coverage.
- The predecessor's three visual requirements explicitly include Continue-as, but are absent from the main spec. This delta modifies their complete blocks and removes the main Continue-as requirement. Sync `align-profile-visual-language` first, then this change, during an authorized lifecycle operation. Leave predecessor artifacts and evidence intact as historical records; their old button-specific results cannot qualify this new composition. This proposal does not perform either sync or archive.

## First Observable Slice

Load `/profile` with an existing selected member: real page → real dropdown/store → displayed active name. Assert the exact title and absence of both redundant elements, then choose the current member and observe the existing selection/Home request. Use page unit coverage for callback consequences and mocked Playwright coverage for the integrated page/chooser/navigation path. Extend those same checks to French, loading and the existing unselected local fixture.

No backend or data changes are necessary. Existing schema-compliant `setupCommonRoutes`, builders and fixtures remain the mock owners. Existing reads (`GET /api/family`, `GET /api/family/me`) and preference updates (`PUT /api/family/{id}/preferences`, request `{ preferredLanguage: 'en' | 'fr' }`) keep their current contract shapes and handlers. Browser mocks establish the tested frontend behavior, not live cookie durability or PostgreSQL persistence.

## User Experience

Reading order becomes title/Settings, active-member dropdown, then language controls. Keep the localised active-member label, selection prompt and loading placeholder. Do not navigate automatically on load or dismissal. Exercise EN/FR, long names, narrow widths, 200% text, keyboard dismissal/selection and the remaining controls' reachability using the existing browser scenarios. Inspect the shortened layout for orphaned spacing; preserve the existing Solar Earth treatment.
