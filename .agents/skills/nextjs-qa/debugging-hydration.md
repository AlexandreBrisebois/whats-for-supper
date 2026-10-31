# Hydration mismatch and interaction readiness

Separate a React hydration mismatch (server HTML differs from the initial client
render) from an interaction that runs before application handlers/state are ready.
Inspect the console/trace and affected render or state path before choosing a fix.

## Mismatched output

Make server and initial-client output deterministic first. Compare locale/timezone,
invalid HTML nesting, initial data and persisted state. `Date.now()` and random
values are nondeterministic even though they are available on the server; `window`
and `localStorage` require a browser. A Client Component can still be prerendered.

Use an effect only when post-hydration browser synchronization is intended, with a
stable initial render. Disable prerendering only for a justified browser-only
component: `next/dynamic` with `ssr: false` must be declared in a Client Component,
not a Server Component. Neither is a blanket cure for mismatched data or markup.
Consult the installed Next.js lazy-loading guide for the affected boundary.

## Interaction readiness

A visible/enabled button does not establish that React handlers are attached or
that the required store is initialized. Use the relevant tested application
readiness condition before the action where needed, then assert its observable
result. An SSR-visible label alone may precede readiness. Avoid sleeps, arbitrary
hydration markers and blanket `act` wrappers; diagnose the actual unfinished work.
Use the async-test guidance in [nextjs-dev](../nextjs-dev/SKILL.md) when relevant.
