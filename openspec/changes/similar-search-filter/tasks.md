# Tasks

Planning only. All implementation remains unstarted; the temporary static fixture validates layout feasibility, not product behavior.

## 1. Compact visible control row with preserved Search semantics

**Outcome and scenarios:** Keep compact Search controls and Similar on one line; applied count; explicit Similar removal and distinct row Clear/sheet Clear Filters behavior.
**Owners and boundaries:** RecipesExperience row/count/search owner, localized compact/accessible labels; existing RecipeFiltersSheet draft/Apply behavior. Existing POST search/GET Explore and planner context remain unchanged; no contract/client migration.
**Dependencies and prerequisites:** Released ownership of overlapping Recipes/Planner files and existing Search fixtures.
**Acceptance boundary:** Real component/search-wrapper state and method-sensitive mock search/Explore responses, stale generations and continuations. No production calls.

- [ ] 1.1 Add regression cases in `pwa/src/app/(app)/recipes/page.test.tsx` and retain `RecipeFiltersSheet.test.tsx` preservation cases. Run `task test:unit -- 'src/app/(app)/recipes/page.test.tsx' src/components/recipes/RecipeFiltersSheet.test.tsx` before logic and record intended red for a compact visible Similar row, count once, immediate chip removal, full accessible Clear name, retained scope, unchanged sheet Apply/cancel/Clear Filters semantics and stale-response isolation.
- [ ] 1.2 Implement only the compact row/count and dedicated English/French labels; keep Similar outside Filters and retain existing immediate handlers. Run the same tests green. Verify row Clear clears Similar/text/non-scope intent while preserving Discovery/Go-To, and sheet Clear Filters retains Similar/text. Preserve request shape, ranking, Retry/invalidation/continuation and scoped Explore fallback; no Similar draft state is introduced.
- [ ] 1.3 Extend `pwa/e2e/unified-recipes.spec.ts` and `recipes.spec.ts`; run `task test:e2e -- unified-recipes.spec.ts recipes.spec.ts --workers=1`. Check stack/list, loading/empty/error, explicit removal, Apply/cancel, exact request counts and stale results. Record bilingual copy/semantics evidence in this slice.

## 2. Accessible overflow at narrow widths and enlarged text

**Outcome and scenarios:** Keep overflowing Search controls reachable without shrinking labels; large count/French/200% text; keyboard trailing Clear and absent controls.
**Owners and boundaries:** Existing Search row layout/focus, passive overflow cue and localized description. No product search-state changes.
**Dependencies and prerequisites:** Slice 1; actual app font/fallback, 320/360/390 CSS px and short-height browser fixtures.
**Acceptance boundary:** Rendered product DOM, bounding boxes, scroll extents, focus visibility and touch/keyboard reachability. Temporary fixture evidence in design is feasibility only.

- [ ] 2.1 Add intended-red rendered acceptance in `unified-recipes.spec.ts` for English/French at 320/360/390 px, 100%/200% text and 1/12/123 badge examples. Assert one control row, minimum 48×48 px targets, whole untruncated labels, no body overflow and full trailing-control reachability. Run `task test:e2e -- unified-recipes.spec.ts --workers=1` before layout changes and retain behavioral red.
- [ ] 2.2 Implement intrinsic-width nowrap controls, bounded horizontal row scrolling and a boundary-aware passive overflow cue/accessibility description. Keep focus outline space and reveal the focused button when tabbing. Run 2.1 green with normal app font and fallback; confirm no hidden permanently clipped action, no extra row or text-size reduction, and no search request/state change from scrolling.
- [ ] 2.3 Record settled English/French narrow/large-text screenshots and focus/geometry evidence. Test swipe/trackpad and keyboard traversal to fully visible Clear then back to Filters, both scroll-edge cues, and control removal/resizing while scrolled. A mobile/device keyboard claim requires a separate actual observation; do not infer it from geometry.

## 3. Find Similar entry focus across callers

**Outcome and scenarios:** Enter Find Similar without requesting text input; direct Similar route and later explicit typing.
**Owners and boundaries:** Recipes disclosure/detail-return focus and Planner Similar navigation.
**Dependencies and prerequisites:** Slice 1; connected focus targets, controlled animation frames and delayed results.
**Acceptance boundary:** Actual browser/DOM focus; device/emulator observation for software keyboard claims.

- [ ] 3.1 Add unit regressions for local Find Similar, Planner-style/direct Similar route entry, detail return and explicit Search reopen; run `task test:unit -- 'src/app/(app)/recipes/page.test.tsx'` before focus changes and record intended autofocus red.
- [ ] 3.2 Distinguish navigation/typing intent in existing focus owners; run 3.1 green. Similar settles on a visible named non-input target; explicit Search/input activation focuses normally. Preserve detail draft guards and planner date/reference/scope context.
- [ ] 3.3 Run `task test:e2e -- recipe-detail-layout.spec.ts unified-recipes.spec.ts --workers=1` with updated cross-caller cases. Assert active element after asynchronous settling and visible focus even with row overflow. Observe Find Similar keyboard behavior on mobile/device separately or report that acceptance blocked.

## 4. Final Integration and Verification

- [ ] 4.1 Reconcile scenario evidence, scope review and applicable preparation, then `task verify -- <complete reviewed task-owned paths>` and `openspec validate similar-search-filter --strict`. Record actual results and record_path; missing product/device acceptance remains incomplete. Planning validation is not implementation approval.
