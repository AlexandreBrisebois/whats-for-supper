# SEARCH-01 — Conversational hybrid search: requirements
> Status: **Implemented capability baseline**.

## Outcome and boundary
`/recipes` accepts debounced natural-language text and returns ready, non-deleted recipes. SEARCH-02 owns browse/continuations; SEARCH-03 filters; SEARCH-04 planner and similarity context.

### SEARCH-01-AC1
Non-blank text is sent to `POST /api/recipes/search`; Enter submits immediately and the page renders Top Pick, alternatives, or empty state.
### SEARCH-01-AC2
When enabled and healthy, the service combines lexical and vector candidates. `resultPath` identifies `hybrid`, `semantic-only`, `lexical-only`, `fallback-lexical`, or `similar`; semantic timeout/provider failure falls back to lexical results.
### SEARCH-01-AC3
The service restricts to `DeletedAt == null` and `IsReady`, applies server-owned ranking, and returns `topPick`, `results`, `appliedFilters`, `searchMode`, `resultPath`, and optional opaque `nextCursor`; results include reason labels.
### SEARCH-01-AC4
Request generation and Search-promotion version reject late/invalidated responses. An initial request failure is currently rendered as an empty lexical-only response, not a distinct error.

## Limitations and non-goals
- The response does not echo query text.
- No initial-search retry/error affordance exists.
- Client member headers are sent, but this controller/service path does not establish household authorization; do not infer isolation from this packet.
- No SSE is consumed here; promotion invalidation is an adjacent capability boundary.
