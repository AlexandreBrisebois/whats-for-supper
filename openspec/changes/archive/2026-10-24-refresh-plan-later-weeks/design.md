# Design

## Context and Existing Ownership

MoveCrossWeekAsync already saves placement and recomputes both grocery lists; its caller publishes only the source. MoveTomorrowAsync already catches each postcommit recompute/publication and returns MoveScheduleResultDto. Planner handlePlanLater already rereads source; it currently discards the response.

## Decisions and Tradeoffs

Reuse the existing movement result and Tomorrow follow-up pattern only in the cross-week path. Return null for preserved no-op cases and retain their source snapshot/message behavior. Recompute and publish each actual affected week independently after SaveChanges; report incomplete follow-ups without converting committed state into a replayable error. No placement, concurrency or transaction redesign. The coordinator approved this bounded extension.

## First Observable Slice

Service regression calls Planner's push request, seeds distinct source/destination ingredients, verifies both snapshots and rereads both weeks. PostgreSQL/API with two SSE subscribers separately verifies real persistence/serialization. Planner regression confirms incomplete result triggers warning and one movement request. Real browser reconnect/update remains separate acceptance.

## Persistence and Side Effects

SaveChanges remains the existing durable boundary. Recompute and snapshot publication afterward cannot roll back movement. Both weeks are attempted despite one failure. The existing result carries affected Mondays and refreshComplete=false; there is no movement retry action. A source or target no-op retains prior response semantics.
