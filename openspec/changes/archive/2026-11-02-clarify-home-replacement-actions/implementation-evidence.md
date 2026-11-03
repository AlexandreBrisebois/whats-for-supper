# Implementation evidence

Branch `work`, checkout `/Users/alex/Documents/Codex/2026-11-02/task/whats-for-supper`.

## Behavior and test order

- The planned meal's existing `pick_else` path still opens `QuickFindModal` and its Home disposition step. Its tile is now Suggestions with an accurate five-recipe description. Search is a distinct action, validates the captured day and source recipe, and enters unified Recipes without a plan mutation. Calendar failure retains the sheet and an in-sheet retry; a stale target closes the choice and requests a fresh Home read.
- `npm run test:unit -- src/components/home/HomeCommandCenter.test.tsx src/components/home/SkipRecoveryDialog.test.tsx`: intended red before production edits, 3 failed / 57 passed. The new Search handler and choice were absent. Subsequent green: 61 passed, then 63 passed after Capture placement.
- The Home Search Playwright regression was added after the first production edit, so the strict browser-before-UI chronology of task 1.1 was not met. Its behavior passed in both languages, and task 1.1 remains unchecked. The Capture unit and browser order tests were added before moving the tile; intended red was 2 unit failures / 56 passes and 1 browser failure. They passed after the move.

## Acceptance observed

- `npm run test:e2e -- e2e/home-recipe.spec.ts --grep 'planned Change plan choices'`: 2 passed (EN/FR), checking Suggestions deck, Search target parameters and no schedule mutation on entry.
- `npm run test:e2e -- e2e/home-recipe.spec.ts e2e/action-pivot.spec.ts`: 59 passed before the Capture slice.
- `npm run test:e2e -- e2e/home-recipe.spec.ts e2e/home-goto.spec.ts e2e/action-pivot.spec.ts e2e/unified-recipes.spec.ts`: 154 passed, 1 skipped. This includes occupied-slot recovery, cancellation, failure and unknown-outcome paths through Recipes.
- `npm run test:e2e -- e2e/home-recipe.spec.ts --grep 'Capture and recovery reflow'`: final rendered run 2 passed (EN/FR) after improving menu description contrast. The fixture exercises 393×852, 320×640, 667×375, 820×1180 and 1180×820 CSS px, plus 200% root text at 320×640. It checks the single Capture link and label, choice reachability and scrolling. The test writes screenshots and geometry to ignored `pwa/test-results/home-capture-*` and `home-choices-*` files for rendered review.
- Observed Capture bounding boxes: 393×852 EN top 12, bottom 108, left 16, right 377; 320×640 FR top 12, bottom 92, left 16, right 304; 667×375 EN top 16, bottom 108, left 141.5, right 525.5; 820×1180 EN top 16, bottom 124, left 218, right 602. Complete tile is initially visible at 393×852. At short landscape and 200% text, scrolling is required. Rendered phone screenshots were inspected in both languages; three choices remain readable and independently reachable.
- `npm run typecheck`: passed after Search implementation and again after the callback refactor.

## Repository gate and scope review

- Reviewed selected Home diff and original overlapping Browse changes in `HomeCommandCenter`, locales, the Home browser file and the shared recovery flow document. The Home change adds no API or backend path. `task verify:plan -- <13 selected Home paths>` selected application plus documentation checks; `task prepare -- <same paths>` formatted only selected PWA application files, excluding 72 other dirty paths.
- First `task verify -- <same paths>` stopped after 1,408 passing unit tests because new Vitest files under installed `pwa/node_modules/.vitest-cache` changed the full runtime fingerprint. The automated record is `.task/agent-finish/runs/8b8867da51c14f9090d488240fe7d12e.json`; impact/API/contracts were not run in that attempt. No source path changed during it.
- Retried the same gate after that cache was populated. Record `.task/agent-finish/runs/bfa0dce2956841019537e5c07b4a6521.json`, tested identity `f6931f56f8dec6365828ac253019467f479310a5e3f4ccd8206a8b9ca88cb568`: documentation, OpenSpec, lint (one pre-existing Recipes warning and one Home callback warning), format, types, 1,408 unit tests, impact browser 709 passed/47 skipped, API 1,268 passed/173 skipped, and static contract checks passed; content identity passed. Live endpoint and database checks were not applicable for this client-only change. An isolated Home callback refactor removed its lint warning after this gate; focused Home unit tests (63) and typecheck passed. The separately authorized stack/time planning artifacts were completed after this record, so a final combined stable-content gate is required.

No API, persistence or production behavior was changed. The separate stack-card design investigation is proposal-only.
