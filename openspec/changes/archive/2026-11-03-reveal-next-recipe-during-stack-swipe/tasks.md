# Tasks

## 1. Capture the blank backing regression before editing

- [x] 1.1 Update the existing real-route multi-card Playwright test before production edits: at rest and mid-drag, assert the next recipe image and name are visibly rendered behind the moving front, while backing cards remain noninteractive and their bottom peeks stay within the existing bound. Include actual seeded-preview reproduction as read-only evidence, plus long and short fixture names. Run red on current `invisible` backing content; retain the valid no-row, tap, swipe and depth assertions.

## 2. Restore backing visuals within the same geometry

- [x] 2.1 Remove only the back-content visibility hiding in `RecipeStackCard`; retain absolute front-matched outer bounds, clipping, `aria-hidden`, pointer-event/focus protection, issue status, loaded time formatting and current animation/gesture ownership. Run focused unit/component and browser tests green. Do not add a new hero fallback or change `StackActionBar`.

## 3. Accept real mid-swipe behavior

- [x] 3.1 Run browser acceptance through Explore and Search with at least two loaded recipes: before/during/after left and right drags, rapid consecutive swipes, long backing title, loaded and missing hero, short phone, normal phone, tablet, 200% text, reduced motion and Search boundary/continuation. Assert visible identity from rendered pixels/computed visibility, no blank shell caused by hidden content, no protrusion/dock overlap, correct order and no accidental detail. Retain tap-to-details/keyboard focus return and list behavior. Record screenshot evidence and physical-device limits.

## 4. Verify scope

- [x] 4.1 Review the change-owned diff, strict OpenSpec validation, scoped `task prepare`, `task verify:plan` and `task verify` on stable content, with actual record path and identity. Refresh only isolated `wfs-unify-preview` after acceptance, preserving recipes and services. Keep the pending placement/action-spacing changes separate. Do not commit, push, sync or archive this new delta without a later request.
