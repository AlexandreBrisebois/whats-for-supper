# Session 4: Persistent Caching

**Artifact:** Components using the `'use cache'` directive.

**Context needed:**
- `pwa/src/components/discovery/DiscoveryStack.tsx` (or equivalent)
- `pwa/src/components/recipes/CategoryList.tsx`
- [Next.js 'use cache' docs](https://nextjs.org/docs/app/api-reference/directives/use-cache)

**What to build:**
- Apply the `'use cache'` directive to expensive data-heavy components.
- Configure `cacheLife` for categories (static) and recommendations (dynamic).

**Success:**
- The Discovery page loads recommendations almost instantly across different family sessions.
- Rare data (Categories) is cached aggressively.

---

## Prompt

```
Task: Implement persistent component caching using the 'use cache' directive.

We want to optimize the Discovery experience by caching the rendered output of expensive components.

Requirements:
1. Open `pwa/src/components/discovery/DiscoveryStack.tsx`. Add `'use cache'` to the component.
2. Set `cacheLife('hours')` for recommendations.
3. Open `pwa/src/components/recipes/CategoryList.tsx`. Add `'use cache'`.
4. Set `cacheLife('days')` for categories as they rarely change.
5. Ensure these components still handle errors gracefully if the cache is empty or the backend is down.

Deliverables:
1. Updated Discovery and Category components with `'use cache'`.

Testing:
- Refresh the Discovery page. The first load should take standard time.
- Subsequent refreshes should be significantly faster (near-zero delay for the cached sections).
```

---

## What to Expect

After this session:
- ✅ AI-driven recommendations are served from the persistent cache.
- ✅ Server compute cost is reduced for expensive renders.

## Next Steps

1. Verify speed gains in the browser.
2. Commit: `git commit -m "caching: implement 'use cache' for discovery and categories"`
3. Move to Session 5: UX & Activity
