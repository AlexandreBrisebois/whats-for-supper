# Design

## Context and Existing Ownership

`recipes/page.tsx` owns mounted search context, request generations and result presentation. `searchPromotionStore` owns a numeric freshness signal delivered by `useScheduleStream` (including `week_updated`). The existing effect gates refresh on response path `browse`, leaving ranked or not-yet-loaded results hidden indefinitely after invalidation.

## Decisions and Tradeoffs

Track the last handled promotion generation in a ref initialized to the current version at mount. Schedule a refresh only for a newer observed version; mark it handled when the timer executes, preserving cleanup/re-scheduling safety. Reuse `runSearch`, current filters/preferences/planner context and existing generation/version guards. Avoid dependencies on response path. Capture mount Similar context separately from subsequent requested Similar state: publishing a new Similar target at request start prevents invalidation from reverting an in-flight target, and avoids a second initial effect resetting its active filters. Add an explicit current-request error state and Retry using the same request owner; successful empty remains distinct.

## First Observable Slice

Typed search → freshness-store invalidation → generated-client search wrapper call with retained context → current cards. Observe this red in the page test before the effect change. Extend to Similar, pending first request, failure/retry, repeated signals and stale responses. Browser acceptance sends a real `week_updated` payload through the installed SSE listener and observes the POST/search/UI sequence with boundary HTTP fixtures.

## State, Concurrency and Recovery

Keep old cards unavailable immediately when their promotion version differs. Replacement success/error must match both request generation and promotion version. Refresh starts clear pending query debounce to prevent the previous timer issuing a duplicate request. Unmount invalidates request generations and clears timers. Store invalidation during a pending request must schedule a replacement even when data is null. No network cancellation or new event-delivery guarantee.

## User Experience

Retain visible query and applied filters/preferences/planner target; keep loading during refresh. Failure shows concise alert and Retry using existing visual tokens. Retried success restores cards; ordinary successful empty keeps existing recovery navigation. No additional user setting or choice.
