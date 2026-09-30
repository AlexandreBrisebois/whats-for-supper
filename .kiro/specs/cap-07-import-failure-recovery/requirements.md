# CAP-07 — Import failure recovery requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **CAP-07-R1.** Settings/profile failed-capture UI obtains safe failed import rows from `GET /api/captures/failures` and renders a family-facing reason.
- **CAP-07-R2.** Retry uses `POST /api/captures/failures/{id}/retry`; clear uses `DELETE /api/captures/failures/{id}`. The service controls durable workflow/failure transitions and reports conflict/not-found outcomes.
- **CAP-07-R3.** Accepted retry/cleanup is distinct from later completion; the UI refreshes/reconciles authoritative failed rows and prevents repeated local work while a control is pending.

## Limits and boundaries

Technical diagnostics/workflow internals are not family UI. Recovery does not guarantee a failed source can become valid, and event delivery is not its persistence authority. CAP-06 owns import completion, PLAT-02 owns retry/workers, PLAT-01 owns SSE, and profile/settings owns the entry surface.
