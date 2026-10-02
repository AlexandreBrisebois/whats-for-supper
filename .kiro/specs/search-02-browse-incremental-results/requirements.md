# SEARCH-02 — Browse and incremental results: requirements
> Status: **Implemented capability baseline**.

## Outcome and boundary
With no text, usable concepts, or similar target, `/recipes` uses browse. SEARCH-01 owns ranked retrieval; SEARCH-03 filters; SEARCH-04 context.
### SEARCH-02-AC1
Initial empty-query browse requests limit 12 and returns `resultPath: "browse"`, an optional server-vetted Top Pick, alternatives and an opaque cursor. Review filters suppress Top Pick.
### SEARCH-02-AC2
An intersection observer (400 px margin) requests a cursor once per generation. Browse continuation uses 24 and ranked continuation 12; appended IDs are deduplicated while cards and Top Pick remain visible.
### SEARCH-02-AC3
A 409 leaves cards visible and offers Restart search; other continuation errors offer Load more. Tokens are process-local, fingerprint-bound, bounded, and expire after ten minutes.
### SEARCH-02-AC4
Surprise Me is local-only and enabled only for a promotion-eligible, import-issue-free alternative; it returns the former pick to alternatives.

## Limitations
- Tokens do not survive API process restart and are not durable/shareable.
- Repeated Surprise Me can select a previously seen pick.
- No manual continuation fallback exists without `IntersectionObserver`.
