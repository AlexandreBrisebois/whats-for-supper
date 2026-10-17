# Design

## Context and Existing Ownership

Browse's wrapToLastPage joins first and last pages and sets hasMorePages false; its prefetch guard then prevents middle-page recovery. StackActionBar displays array position. Existing GET pagination/eligibility stays authoritative.

## Decisions and Tradeoffs

Use a page-indexed cache for stack mode, keeping the active page's local index and deriving its global ordinal. Fetch missing adjacent pages on navigation; preserve list mode's append path. Cache pages only for the current filter/presentation generation. Avoid fetching the entire library to wrap.

## First Observable Slice

Actual Browse page and generated GET request → deterministic paginated browser fixture → exact front ID/ordinal across 126/180 cycles and detail return. Existing API ordering remains unchanged. Unit tests exercise page/cache transitions and delayed/failing requests; browser tests exercise real navigation.

## State, Concurrency and Recovery

Generation changes on filter/presentation/unmount; discard stale success/error/finally handlers. This is necessary WFS-BL-011 overlap for coherent caching, not broader request-layer redesign. Pending navigation preserves its originating card; failed navigation exposes retry and does not pretend to land on the final recipe. Counts can change on later reload; no cross-request server snapshot is asserted.

## User Experience

Keep current identity and count visible during page retrieval, suppress duplicate navigation, provide an accessible error and Retry control. Detail close leaves page/index intact. Existing empty-page probing remains bounded.
