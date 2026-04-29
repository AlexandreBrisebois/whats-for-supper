---
id: ADR-031
title: Block Service Worker in Playwright E2E Tests
status: Accepted
date: 2026-04-29
---

## Context

The PWA registers a service worker (`public/sw.js`) that intercepts all `fetch` requests and serves from cache when available. Playwright's `page.route()` API intercepts requests at the browser network layer — but **after** the service worker intercepts them. This meant all `page.route()` mock handlers were silently ignored: the service worker handled requests directly, either from cache or by fetching from the real backend. No `[MOCK]` logs appeared; the `loadData` catch-block fallback silently provided empty schedule data, producing a blank grocery checklist.

## Decision

Add `serviceWorkers: 'block'` to the `use` block of `playwright.config.ts`. This instructs Playwright's Chromium context to prevent service worker registration, so all fetch requests reach the browser's network layer and are interceptable by `page.route()`.

## Consequences

- **Positive**: All `page.route()` intercepts work as intended. Tests are fully deterministic and backend-independent.
- **Positive**: Eliminates a whole class of silent mock bypass bugs.
- **Negative**: Service worker caching behavior is not exercised in E2E tests. If the SW cache strategy is critical to verify (e.g., offline mode), a separate dedicated test project with `serviceWorkers: 'allow'` should be created.
- **Neutral**: The real request URL observed in mocks changed from `http://127.0.0.1:5001/api/schedule` (SW bypassing Next.js rewrites) to `http://127.0.0.1:3000/backend/api/schedule` (correct browser → Next.js → rewrite path). Existing regex patterns (`/\/(?:backend\/)?api\/schedule.*/`) already handle both forms.
