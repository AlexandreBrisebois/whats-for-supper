# ADR 022: Centralized API Response Wrapping

## Status
Accepted

## Context
Previously, API controllers were manually wrapping successful responses in a `{ data: ... }` envelope using anonymous objects. This led to:
1.  Redundant code in every controller action.
2.  Inconsistencies when wrapping was forgotten.
3.  Difficulty in maintaining a strict schema for OpenAPI generation.

## Decision
We have centralized the wrapping logic into a global Action Filter: `SuccessWrappingFilter`.

- **Mechanism**: The filter intercepts successful results (200 OK) and wraps the value in a consistent `data` envelope.
- **Exclusion**: A new `[SkipWrapping]` attribute was introduced for endpoints that must return raw objects or follow a different spec (e.g., `Management`, `Health`, and legacy `List` endpoints).
- **Heuristic**: The filter automatically skips objects whose type names end in `Response` or `ResponseDto` (except for `WorkflowTriggerResponseDto` which is explicitly required by the spec to be wrapped).

## Consequences
- **Positive**: Simplified controller logic, guaranteed consistency across the API, and better alignment with the "Standardized API Identity" (ADR 008).
- **Negative**: Requires developers to use `[SkipWrapping]` when adding new endpoints that don't fit the envelope pattern.
