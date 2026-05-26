# Design: Stack Browse Clarity and Backward Wrap Fix

## UX Implementation Contract
- Remove cuisine/meal badges from stack cards only.
- Preserve card tap → detail flow unchanged.
- Keep swipe indicators and depth indicator visible.
- Target calmer one-thumb motion by tuning existing physics only.

## State Ownership
- `browse-all-stack/page.tsx` owns `totalCount` for the active mode pagination total.
- Wrap logic uses active-mode `totalCount` as source-of-truth.
- `wrapRequestIdRef` guards against stale wrap responses.
- `wrapPrefetchCooldownRef` prevents immediate post-wrap prefetch churn.

## Navigation Algorithm Contract
1. On non-append fetch:
   - Call `/api/recipes/library-summary` (for library metrics only).
   - Fetch paged recipes with current filter for normal browsing.
2. On backward wrap from index `0`:
   - Compute `lastPage = ceil(totalCount / STACK_PAGE_SIZE)` for the active mode.
   - Snapshot `discoverableOnly` + `totalCount` at wrap start.
   - Fetch page `lastPage` with current `discoverableOnly` value.
   - If response is empty, retry previous pages (bounded) in same mode.
   - Merge first loaded page + fetched page, then set index to merged last item.
   - If mode changed during fetch, ignore stale response.
3. Normal filter toggles remain unchanged for regular forward/back browsing.

## Motion Tuning Contract
- `threshold`: `80 -> 70`
- `velocityThreshold`: `500 -> 450`
- `dragElastic`: `1 -> 0.2`
- Spring/transition values tightened for faster settle and less jitter.

## data-testid Contract
- Removed from stack card surface:
  - `recipe-stack-cuisine-badge`
  - `recipe-stack-meal-type-<type>`
- Preserved:
  - `stack-card-front`, `stack-card-back`, `stack-swipe-next-indicator`, `stack-swipe-back-indicator`

## Branch Manifest (Spec Reviewer)
| Branch | Blind Spot | Why It Matters | Decision |
|---|---|---|---|
| 1 | Semantic drift: filtered browsing vs backward wrap | Cross-mode jumps break user expectation | Keep wrap inside the active mode |
| 2 | Ownership seam: active `pagination.total` usage | Wrong page math causes incorrect wrap destination | Active-mode `pagination.total` is authoritative for backward wrap |
| 3 | Swipe smoothness risk | Jitter harms one-thumb confidence | Surgical physics tuning only, no gesture redesign |
| 4 | Test drift in backward-wrap E2E | Incorrect gesture can hide regression | Correct test to swipe right and assert mode-scoped last-card landing |

## Test Strategy
- Unit: `RecipeStackCard.test.tsx` and `browse-all-stack/page.test.tsx`.
- E2E: `browse-all-stack.spec.ts` fixed-date + corrected wrap-direction assertion + filtered-wrap-under-discovery scenario.
