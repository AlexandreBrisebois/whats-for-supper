# ADR 042: Global UI Toast Pattern

## Status
Accepted

## Context
As the "What's For Supper" PWA evolves, many asynchronous actions (file uploads, hero regeneration, reimports) require user feedback. Previously, the PWA used specialized toasts like `LibraryToast` for specific domain events (recipe ready), but lacked a general-purpose notification system for common UI interactions.

## Decision
We implement a centralized `useUiStore` based toast system coupled with a global `ToastContainer`.

1.  **State Management**: `useUiStore` manages a `toasts` array. Each toast has a `type` (success, error, info, loading), a `message`, and a unique `id`.
2.  **Container Rendering**: A `ToastContainer` is mounted in the root `AppRouteLayout` to ensure notifications persist across page transitions and overlay other UI elements.
3.  **Aesthetics**: Toasts follow the "Solar Earth" aesthetic, using glassmorphism (`backdrop-blur-md`), rounded corners (`rounded-2xl`), and the project's color palette (`sage` for success, `terracotta` for errors, `ochre` for info/loading).
4.  **Auto-dismissal**: Toasts automatically dismiss after 5 seconds to prevent DOM clutter, managed via `useEffect` in the `ToastItem` component.

## Consequences
- **Positive**: Consistent user feedback across all feature areas.
- **Positive**: Simplified component logic; components only need to call `addToast()`.
- **Negative**: Adds a global state dependency for simple notifications.
- **Risk**: Overlapping with `LibraryToast`. `LibraryToast` should remain for background synthesis events, while `ToastContainer` handles immediate user-triggered action feedback.
