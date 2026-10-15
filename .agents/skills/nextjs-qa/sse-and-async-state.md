# SSE and async React state

### The `pendingRef` anti-pattern
Do **not** coordinate SSE-driven side effects using a boolean "pending flag" ref that one async path sets and another async path reads. The two paths (SSE effect and `initialize()`) interleave non-deterministically in CI, causing the flag to be consumed by the wrong path or missed entirely.

### Correct pattern: `recipes.length` dep + version guard
When a `useEffect` must react to an SSE signal that may arrive before or after async data is ready:

1. Include the data-readiness signal (e.g., `recipes.length`) as a dep alongside the SSE version counter.
2. Guard against early firing with `if (!stackIsLoadedRef.current || recipes.length === 0) return`.
3. Track the last-handled version in a ref (`lastHandledFillTheGapVersionRef`) to prevent the effect from re-firing for the same SSE event when `recipes.length` changes later (e.g., user swipes).

```ts
useEffect(() => {
  if (fillTheGapVersion === 0) return;
  if (!stackIsLoadedRef.current || recipes.length === 0) return;
  if (fillTheGapVersion <= lastHandledVersionRef.current) return;
  lastHandledVersionRef.current = fillTheGapVersion;
  refetchCurrentCategory();
}, [fillTheGapVersion, refetchCurrentCategory, recipes.length]);
```

This eliminates the race entirely: when the stack loads the effect re-fires automatically, and the version guard prevents double-processing.

### SSE mock reconnection (BS-10)
`route.fulfill()` closes the HTTP connection. EventSource auto-reconnects (~3 s). Every reconnect replays the entire mock body, incrementing the SSE version counter again. The version guard above absorbs these duplicate events safely.
