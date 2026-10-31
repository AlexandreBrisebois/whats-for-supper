## 1. Planner recipe-change icon

- [x] 1.1 After separate implementation approval, replace only the `RefreshCw` import and recipe-row JSX use in `pwa/src/app/(app)/planner/page.tsx` with `ArrowRightLeft`. Verify the diff preserves size 18, button classes, labels, handlers and availability expressions. This is an icon-only correction with no production logic change; a new logic test and red/green cycle are not applicable.
- [x] 1.2 Verify the spec's assigned-row and availability scenarios with existing checks: `task test:unit -- 'src/app/(app)/planner/page.test.tsx'` and `task test:unit -- src/components/home/TonightMenuCard.test.tsx`. Inspect rendered home and Planner at narrow and wide viewports in English/French; confirm matching glyphs, unchanged 18px Planner icon and 36px target, localized accessible names, keyboard/focus operation and pivot opening for the selected row. Run `task test:e2e -- planner.spec.ts`. Confirm pending/empty/non-cooking availability and unrelated navigation/Save for Next Week icons remain unchanged. Record actual results and any blocked inspection; do not claim rendered acceptance from source inspection alone.

## 2. Final verification

- [ ] 2.1 Reconcile scenario evidence, run `task prepare --` with the complete reviewed task-owned changed paths, review the actual diff and run `task verify --` with that same complete path set (including these planning artifacts). Record check statuses and the returned `record_path`; retain any unmet acceptance as incomplete. No API/client/mock synchronization is required because their boundaries do not change.

## Evidence

- Approved implementation: 2026-10-31. The application diff replaces only the icon import and JSX name; size, target, conditions, labels, handlers and unrelated arrows are unchanged.
- Focused unit checks passed: Planner 77/77; TonightMenuCard 6/6. Planner browser suite passed 114/114 against local Next.js with mocked APIs (`/tmp/wfs-icon-planner-e2e.log`). Initial sandbox server startup was blocked by local listen permissions; the approved run outside the sandbox passed.
- Temporary browser inspection (removed afterward) confirmed identical SVG contents between home and Planner, 18px Planner glyph, 36px target, English/French accessible names, keyboard focus/Enter opening the pivot and unchanged Save for Next Week glyph at 390px and 1280px. Screenshots visually inspected under `/tmp/wfs-icon-{home,planner}-{en,fr}-{390,1280}.png`. The reused development session required a fresh French desktop run after an entrance animation remained transparent; that fresh inspection passed (`/tmp/wfs-icon-rendered-fr-wide.log`). No physical-device checks were performed.
- Scoped preparation passed; formatter reported the application file unchanged.
