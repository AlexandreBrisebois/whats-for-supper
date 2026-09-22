# Discovery card order — specification review

Reviewed 2026-09-21. This is a specification-only scope correction; it does not approve implementation.

## Findings and disposition

| Severity | Prior concern | Consequence | Revision |
|---|---|---|---|
| High | The prior first slice introduced voting context and an API envelope before correcting the reported user-facing defect. | The most visible regression—recently cooked recipes appearing first—would remain while unrelated contract work landed. | The active slice now changes only the page's response-to-card mapping and vote targets. |
| High | Card orientation, voting-window lifecycle, capacity, eligibility, ranking and SSE recovery were previously grouped. | A failure would not identify the responsible policy and would require coordinated edits across unrelated seams. | Each concern has a separate successor spec with one tracer bullet. |
| Medium | Existing tests could establish that recipes exist in the DOM without proving which overlapping card receives a vote. | A reversed stack can pass superficial rendering coverage. | Require a six-recipe fixture, explicit displayed-front ID/name and first/second POST-ID assertions. |

## Review outcome

The revised active package has one observable behaviour: preserve server order through the card stack so the server's first item is front and voted. It has no new API contract, data policy or calendar decision. The successor manifest preserves the deferred requirements without treating them as one implementation task.

Implementation checks are not run and no runtime behaviour is claimed.
