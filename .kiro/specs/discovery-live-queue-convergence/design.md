# Discovery live queue convergence — design

The server remains the source of aggregate Like counts. Discovery loads a category once, assigning each returned recipe a client-only `queueOrder` equal to its response index.

~~~text
GET /api/discovery -> [{ id, voteCount }, ...]
  -> store keeps [lockedFront, ...tail]
vote_updated { recipeId, voteCount }
  -> update loaded recipe count
  -> stable-sort tail by voteCount DESC, queueOrder ASC
  -> render first four; never refetch for the event
~~~

The API continues to broadcast absolute `voteCount`; no actor identity or vote kind is needed. The initial counts make comparisons against untouched recipes possible. The store updates only a loaded recipe and preserves index zero. If the event ID is absent because the local member already voted, it is ignored.

The discovery response continues to use the existing recipe representation with an optional `voteCount`, populated only by Discovery. This avoids a new endpoint while keeping other response behavior compatible. The generated client, wrapper, schema-compliant builders, API tests, store tests, SSE-hook tests, and Discovery E2E mocks must agree.

## Verification

Use six valid fixture recipes with distinct initial counts. Assert the API response count, stable full-tail reorder after an SSE event for the sixth recipe, locked index zero, deterministic ties, duplicate delivery, no-op after local removal, and no Discovery GET following the event.

