# Discovery card order — requirements

Status: reframed proposal; specification only. This package is the first tracer-bullet vertical slice. Implementation is not selected.

## Outcome

Discovery must present the API's first recipe as the first card a member sees and votes on. Today the page takes the last four recipes and treats the final response item as front; that reverses the server's order and pushes recently cooked recipes ahead of the older recipe the server placed first.

This slice fixes presentation only. The current server order remains authoritative; no new rotation policy is introduced.

## Scope

Keep the existing Discovery API, recipe DTO, generated client, store and vote endpoint. Change the Discovery page's visible-window, stack-index and control-button conventions so index zero is front everywhere. Add focused page and E2E coverage that identifies the visible front recipe and the submitted vote ID.

## Non-goals

Do not change the server query or its vote-count/last-cooked ordering, calendar eligibility, categories, vote writes, global purge, voting-week lifecycle/context, consensus, target capacity, SSE reconciliation, request races, database schema/views, Search, or visual redesign.

## Acceptance

### DCO-R1 — First response item is front

1. Given at least six recipes in server response order, only the first four are rendered in the stack. recipes[0] is visibly front and receives the front-card interaction layer.
2. The rendered stack uses the direct response index for stack position; it does not reverse, take the final four, or derive front from the response length.
3. The Like and Dislike buttons submit recipes[0].id. After that recipe is optimistically removed, they submit the original second response ID.
4. Swipe callbacks on the front card submit its own ID. A test must prove the front card's displayed ID/name and POST ID match; DOM presence or array order alone is insufficient.
5. Existing card visual treatment, labels, animations, pending-card indicator, category loading and ordinary empty/refresh state remain unchanged.

### DCO-R2 — Server order remains the authority

1. This slice does not reverse, sort, score or otherwise modify the response in the PWA.
2. A fixture whose first response recipe is older and whose final recipe is recently cooked proves the older first response recipe is front. The test documents the regression without reimplementing the server ranking formula.
3. The API's existing order is tested only as an input contract here. Revising the ordering policy belongs to the later discovery-rotation-order specification.

## Successor boundary

Voting context, a singular voting window, consensus target binding, target capacity, calendar eligibility, server rotation and live reconciliation remain deferred. Their single-purpose tracer bullets and dependencies are proposed in [design](design.md#successor-vertical-specifications).
