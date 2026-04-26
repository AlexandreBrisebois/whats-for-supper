# Session 2: Request Memoization

**Artifact:** Cached API functions in `src/lib/api/`.

**Context needed:**
- `pwa/src/lib/api/family.ts`
- `pwa/src/lib/api/planner.ts`
- `pwa/src/lib/api/recipes.ts`

**What to build:**
- Wrap core data-fetching and mapping functions in `React.cache`.
- Targets: `getFamilyMembers`, `getSchedule`, `getSmartDefaults`, `getRecommendations`.

**Success:**
- Multiple calls to these functions within a single server-side request result in only one network call.
- Data mapping logic is memoized.

---

## Prompt

```
Task: Implement Request Memoization using React.cache in the API layer.

You are optimizing the API layer of the Whats-for-Supper PWA. To prevent redundant API calls and mapping logic during a single request, we need to wrap our core functions in `React.cache`.

Requirements:
1. Import `cache` from 'react'.
2. Wrap `getFamilyMembers` in `pwa/src/lib/api/family.ts`.
3. Wrap `getSchedule` and `getSmartDefaults` in `pwa/src/lib/api/planner.ts`.
4. Wrap `getRecommendations` and `getRecipe` in `pwa/src/lib/api/recipes.ts`.

Deliverables:
1. Updated API service files with `React.cache` wrappers.

Testing:
- Add a `console.log` inside one of the mapping functions (e.g., `mapToRecipe`).
- Call that function twice in a Server Component.
- Verify the log only appears once in the terminal.
```

---

## What to Expect

After this session:
- ✅ Redundant API calls are eliminated for the current request.
- ✅ Data consistency is guaranteed across the component tree.

## Next Steps

1. Verify memoization works in a test Server Component.
2. Commit: `git commit -m "caching: implement request memoization in API layer"`
3. Move to Session 3: Server-First Identity
