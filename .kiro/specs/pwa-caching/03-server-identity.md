# Session 3: Server-First Identity

**Artifact:** Updated root layout and server-side identity utility.

**Context needed:**
- `pwa/src/app/(app)/layout.tsx`
- `pwa/src/lib/api/server-client.ts`
- `pwa/src/components/identity/IdentityValidator.tsx`

**What to build:**
- Create a server-side identity fetcher that reads from cookies.
- Implement a redirect in the root layout if no identity is found.
- Replace the client-side "flash" of the `IdentityValidator`.

**Success:**
- Authenticated users land on the Home page without seeing a loading spinner or "Identity Validator" flicker.
- Unauthenticated users are redirected to `/identity` instantly.

---

## Prompt

```
Task: Implement Server-First Identity check to eliminate client-side flickers.

Currently, identity validation happens on the client, causing a flicker. We want to move this check to the server.

Requirements:
1. In `pwa/src/lib/api/server-client.ts`, implement a `getServerIdentity()` function. 
2. Use `cookies()` to read the `x-family-member-id`.
3. Wrap this function in `React.cache`.
4. In `pwa/src/app/(app)/layout.tsx`, call `getServerIdentity()`. 
5. If it returns null, use `redirect('/identity')`.
6. Ensure the `HomePage` and other server components can consume this cached identity without re-fetching.

Deliverables:
1. Updated `server-client.ts` with identity helper.
2. Updated root `(app)/layout.tsx` with redirection logic.

Testing:
- Clear your cookies and visit `/home`. You should be instantly redirected.
- Select an identity and visit `/home`. You should see the page immediately with no loading flicker.
```

---

## What to Expect

After this session:
- ✅ Identity is verified before the first byte is sent to the client.
- ✅ Hydration is smoother and faster.

## Next Steps

1. Verify redirection and landing experience.
2. Commit: `git commit -m "caching: implement server-side identity validation"`
3. Move to Session 4: Persistent Caching
