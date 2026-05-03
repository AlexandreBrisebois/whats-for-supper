# Session 1: Caching Foundation

**Artifact:** Updated `next.config.js` and `server-client.ts`.

**Context needed:**
- `pwa/next.config.js`
- `pwa/src/lib/api/server-client.ts`
- [Next.js cacheComponents docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)

**What to build:**
- Enable `experimental.cacheComponents: true` in `next.config.js`.
- Prepare `server-client.ts` to support explicit caching patterns.

**Success:**
- Application builds without errors.
- `cacheComponents` flag is active.

---

## Prompt

```
Task: Enable Next.js 16 caching foundation and experimental flags.

You are an expert Next.js developer optimizing a PWA. We are starting the "Caching Phase" to improve performance and state preservation.

Requirements:
1. Modify `pwa/next.config.js` to enable `experimental: { cacheComponents: true }`.
2. Review `pwa/src/lib/api/server-client.ts` and ensure the Kiota `FetchRequestAdapter` is configured to correctly pass through the cache context.

Deliverables:
1. Updated `pwa/next.config.js`.
2. Updated `pwa/src/lib/api/server-client.ts` (if changes are needed for caching).

Testing:
- Run `npm run build` in the `pwa` directory to ensure the configuration is valid.
```

---

## What to Expect

After this session:
- ✅ Experimental caching features are enabled.
- ✅ The app is ready for granular data-fetching control.

## Next Steps

1. Verify build success.
2. Commit: `git commit -m "caching: enable cacheComponents foundation"`
3. Move to Session 2: Request Memoization
