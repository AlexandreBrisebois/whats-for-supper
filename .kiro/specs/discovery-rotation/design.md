# Discovery card order — design

Status: reframed proposal; specification only.

## Tracer-bullet shape

~~~text
Discovery API response [oldest-ranked, ..., recently-cooked]
  -> existing API wrapper preserves array order
  -> Discovery page renders recipes.slice(0, 4)
  -> recipes[0] is front
  -> front-card swipe and Like/Dislike POST recipes[0].id
~~~

The API already orders Discovery recipes by Like count descending and then LastCookedDate ascending. The page currently reverses the effect of that order by rendering recipes.slice(-4) and calculating its front from the end of the array. This slice changes only that browser mapping: use the first four recipes, assign the direct index as the stack index, and route both buttons to index zero.

Do not add client ranking or touch the Zustand store's server array. The existing optimistic removal is sufficient: filtering the front recipe leaves the original second item at index zero. The existing card component keeps its layout, gesture handling and animation semantics; only the page supplies corrected front/stack props.

## Verification strategy

Use six schema-compliant fixture recipes in a known API order. The first is an older-ranked recipe and the sixth is recently cooked, so the regression is evident. Page tests assert the front card's stable test ID/name, its front state, the visible four IDs, and both button/swipe vote IDs before and after the first removal. A stateful Discovery E2E mock asserts the POST body/path uses the displayed front ID, then the second response ID.

Run focused PWA unit and Discovery E2E checks when implementation is selected. No API, contract or database check is required for this presentation-only slice beyond preserving the mocked response order.

## Successor vertical specifications

Each row is a proposed separate .kiro/specs/<slug>/ package with its own requirements, design, tasks, baseline and review. Each begins with the named tracer bullet and must not absorb another row without a spec revision.

| Order | Proposed spec | Single purpose | First tracer bullet | Depends on |
|---|---|---|---|---|
| 1 | discovery-rotation (this package) | Present server order faithfully. | A six-recipe response shows and votes for its first ID, not its last. | — |
| 2 | discovery-voting-context | Expose currently open voting weeks end-to-end. | An existing VotingOpen week appears as passive Discovery context while cards remain votable. | 1 |
| 3 | voting-window-invariant | Make exactly one explicitly opened week the voting window. | Opening a future week succeeds; opening another is rejected without altering votes or either purge. | 2 |
| 4 | consensus-target-binding | Send existing consensus/default processing to that explicit window. | A threshold-crossing vote for an explicitly opened future week produces the existing suggestion for that same week. | 3 |
| 5 | discovery-target-capacity | Express a full explicit target as authoritative Discovery capacity state. | Seven occupied eligible dinner slots yield TargetWeekFull and the page shows the completed-plan state. | 3 |
| 6 | discovery-calendar-eligibility | Exclude calendar-ineligible recipes from Discovery. | A recipe planned in the defined exclusion window disappears from Discovery and cannot be voted in the page. | 1 |
| 7 | discovery-rotation-order | Make server-side weekly recency ordering deterministic. | A fixed fixture returns the agreed vote/age/rating tuple order through HTTP. | 6 |
| 8 | discovery-live-reconciliation | Reconcile a loaded stack after one invalidation. | A vote_updated event triggers one guarded refetch and the page converges to server order. | 1, 7 |

Context, capacity and eligibility remain separate: they respectively describe voting-window state, available target slots and recipe visibility. None belongs in the card-order correction.
