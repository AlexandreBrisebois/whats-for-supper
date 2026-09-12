# ADR 043: iPad Command Center Dashboard Pattern

## Status
Accepted (2026-05-15)

## Context
iPad and Desktop users experienced high cognitive load and friction when planning meals, as the application required frequent tab-switching between the "Planner" and "Grocery List" views. The mobile-first tabbed interface, while efficient for phones, wasted significant horizontal screen real-estate on larger viewports and obscured the immediate relationship between planning decisions and their impact on the shopping list.

## Decision
We will implement a permanent "Command Center" dashboard layout for viewports matching `min-width: 1024px`. 

Key architectural decisions:
1. **Side-by-Side Grid**: The main content area will transition from a single-column `max-w-sm` container to a two-column responsive grid (`grid-cols-[1fr_420px]`).
2. **Component Embedding**: The `GroceryList` component will support an `isEmbedded` mode to render without fixed-positioning modal overlays, allowing it to be pinned in the right column.
3. **Internal Scrolling**: To maintain the "Command Center" feeling where the weekly plan remains visible, the Grocery List container will utilize internal scrolling (`overflow-y-auto`) and height constraints (`h-[calc(100vh-offset)]`) to stay above the bottom navigation bar.
4. **Adaptive Compaction**: Viewport-specific prop drilling (`isWide`) will be used to aggressively compact Planner cards (reduced padding, smaller typography) on wide screens to ensure the full 7-day week fits "above the fold" on standard tablet landscape views.

## Consequences
- **Positive**: Eliminates tab-switching friction for power users on tablets.
- **Positive**: Instant visual feedback for planning decisions (adding a recipe shows its impact on the grocery list immediately).
- **Positive**: Maintains mobile parity by reusing the exact same components and logic.
- **Neutral**: Requires maintenance of conditional layout logic and responsive prop drilling.
- **Neutral**: Increases complexity of the Planner page container.
- **Negative**: Adds a specific maintenance burden for internal scrolling calculations relative to the global header and navigation bar.
