# Implementation Plan: Stabilization & Unified Routing

This plan stabilizes the Authentication, Routing, and Recipe Synthesis vertical slices. It moves the system to a "One Domain / Zero Proxy" model with a two-stage security gate.

## Parallelization Strategy

To ensure zero conflict and high success:
1.  **Phase 1 is the Core Blocker**: It must be executed and committed first.
2.  **After Phase 1**, **Phase 2 (Auth)** and **Phase 4 (Feature)** can be executed in **parallel** in separate sessions.
3.  **Phase 3** must follow Phase 2.

---

## Phase 1: Infrastructure & Unified Routing [BLOCKER]
**Goal**: Enable Traefik-aware routing and "Hybrid Direct Call" API access.

### Build Prompt (Phase 1):
```text
Stabilize API Routing and Infrastructure. 
1. Update 'api/src/RecipeApi/Program.cs' to include 'app.UseForwardedHeaders()' and configure it for Traefik.
2. Update 'pwa/src/lib/api/api-client.ts' to use a Hybrid Base URL: '/api' in production (relative) and 'http://localhost:9001/api' in development (absolute). Ensure it correctly detects the environment.
3. Update Traefik labels in 'docker/docker-compose.prod.yml':
   - API Router: Host(`wfs.srvrlss.dev`) && PathPrefix(`/api`)
   - PWA Router: Host(`wfs.srvrlss.dev`)
4. Verify that 'task prod:config' generates valid routing and that local dev through port 3000 still works with the new absolute API path.
```

---

## Phase 2: Server-Side Auth & The Hearth Gate
**Goal**: Transition to Server Action-based cookie management and HMAC validation.

### Build Prompt (Phase 2):
```text
Stabilize Hearth Authentication.
1. Create 'pwa/src/lib/auth.ts' containing Server Actions for 'validateHearthSecret' (HMAC check), 'setHearthCookie', and 'clearAuth'.
2. Use the 'HEARTH_SECRET' environment variable. Ensure cookies are set with 'HttpOnly', 'Secure' (in prod), and 'SameSite=Lax'.
3. Update 'pwa/middleware.ts' to validate the 'h_access' cookie. If validation fails, explicitly delete the cookie using 'response.cookies.delete' and redirect to '/welcome'.
4. Refactor '/welcome' and '/join' pages to use these Server Actions instead of client-side 'fetch' calls.
```

---

## Phase 3: The Member Gate & Onboarding
**Goal**: Enforce the Family Member context as the second stage of the gate.

### Build Prompt (Phase 3):
```text
Implement the Member Context Gate.
1. Update 'pwa/middleware.ts' to perform a two-stage check:
   - Stage 1: 'h_access' valid? (If no -> /welcome)
   - Stage 2: 'family_member_id' cookie present? (If no -> /onboarding)
2. Ensure '/onboarding', '/invite', and '/join' are in 'PUBLIC_PATHS' in the middleware.
3. Update the Onboarding profile selection to set the 'family_member_id' cookie (Server Action).
4. Verify that reaching the home screen without a selected profile is now impossible.
```

---

## Phase 4: Capture Flow & Library Filtering [PARALLEL READY]
**Goal**: Finalize "Fire-and-Forget" UX and hide incomplete recipes.

### Build Prompt (Phase 4):
```text
Stabilize Recipe Synthesis UX.
1. Update 'pwa/src/components/capture/MinimalCapture.tsx' to use the new '/api' paths. Ensure it redirects immediately to Home/Settings after POST.
2. Update 'DiscoveryService.cs' and 'RecipeService.cs' to filter library results: only show recipes where 'IsSynthesized == true'.
3. Ensure the backend returns a 401/403 if 'X-Family-Member-Id' is missing for any write operations.
4. (Note: SSE feedback loop is deferred; rely on the 'IsSynthesized' filter for now).
```

---

## Phase 5: Production Polish
**Goal**: Finalize deployment configurations.

### Build Prompt (Phase 5):
```text
Finalize Production Deployment Config.
1. Update '.env.example' and 'docker/compose/production-overrides.yml' to reflect the unified 'wfs.srvrlss.dev' domain and relative API paths.
2. Add a 'task check:auth' to the Taskfile to verify that the PWA and API can both successfully validate a test HMAC token using the same 'HEARTH_SECRET'.
3. Verify TLS termination settings in Traefik to ensure 'Secure' cookies are forwarded correctly to the internal HTTP services.
```

---

## Verification Plan

### Automated Tests
- `task test` to ensure existing E2E mocks aren't broken by the base URL change.
- `task agent:drift` to confirm OpenAPI parity.

### Manual Verification
- Deploy to a local compose environment and verify `wfs.srvrlss.dev/api/health` returns 200.
- Delete the `h_access` cookie and confirm immediate redirect to `/welcome`.
