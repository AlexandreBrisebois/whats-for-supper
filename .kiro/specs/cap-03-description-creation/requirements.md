# CAP-03 — Description creation requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **CAP-03-R1.** A member can submit a recipe name and free-text description to create a pending recipe stub and start AI synthesis.
- **CAP-03-R2.** The API contract exposes the description create route as accepted workflow work; acceptance is not a ready recipe. Recipe readiness depends on subsequent synthesis state.
- **CAP-03-R3.** Workflow completion/failure is durable and relevant stream/capture notifications are handled by their owning stores/surfaces.

## Limits and boundaries

Description text is untrusted input and synthesis quality is not guaranteed. CAP-01/capture owns entry UI where shared, PLAT-02 owns workflow execution, CAP-07 owns failure recovery, and PLAT-01 owns stream delivery. No synchronous recipe result or client-side AI interpretation is claimed.
