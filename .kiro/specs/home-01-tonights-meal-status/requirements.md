# HOME-01 — Tonight's meal status: requirements

## Status

**Implemented capability baseline.** This packet is the canonical description of Home's current-date meal status; it does not authorize product changes.

## Current behavior

- **HOME-01-AC-01 — Current-date presentation.** `page.tsx` requests `/api/family` and `/api/schedule?weekOffset=0`, derives the server-local current date, and hides recipes whose status is cooked (`2`) or skipped (`3`). `TodayStoreInitializer` seeds `todayStore`; `HomeCommandCenter` renders an unplanned pivot, planned card, cooked acknowledgement, or terminal state.
- **HOME-01-AC-02 — Cooking handoff.** A planned card opens Cook's Mode. Marking cooked immediately changes `todayStore` then sends `POST /api/schedule/day/{date}/validate` with `{ status: 2 }`.
- **HOME-01-AC-03 — Shared updates.** `useScheduleStream` consumes `/api/stream`; `connected`, `slot_updated`, and `week_updated` reconcile the current-day store and week store.
- **HOME-01-AC-04 — Background reconciliation.** Mount starts a week-0 `sync()`. A recent optimistic assignment is retained for up to 20 seconds under the store's reconciliation guard.

## Limitations and boundaries

- SSR fetch failures yield null seed data without user-visible error. Assignment and validation are optimistic, fire-and-forget writes; failures are logged, not rolled back or surfaced.
- The stream has no feature-specific disconnect/retry UI. A two-second echo guard prevents a conflicting early assignment event from replacing the current card; it is not conflict resolution.
- HOME-02 owns empty-state GOTO/Quick Find, HOME-03 skip/recovery mutations, HOME-04 GOTO lifecycle, and the single-page recipe view recipe detail.
- Contract ownership: `GET /api/schedule`, `POST /api/schedule/day/{date}/validate`, and `GET /api/stream` in `specs/openapi.yaml`.
