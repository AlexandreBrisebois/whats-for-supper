# Design

## Context and Existing Ownership

RecipeService.CaptureUrl saves recipe.info and Recipe before TriggerAsync, whose exception is caught. CaptureFailureService selects paused capture workflows with failed tasks and already provides list/retry/clear. WorkflowOrchestrator owns YAML validation and persisted task construction.

## Decisions and Tradeoffs

Persist a paused url-import workflow containing one failed initialization marker alongside the Recipe. Initialize that workflow ID from YAML, replacing its marker atomically. Reuse current failure DTO and controls with saved-but-not-started friendly guidance. This avoids an outbox/service/schema and requires one internal marker convention and bounded orchestrator initialization method. Existing TriggerAsync callers retain their behavior; extract only shared graph construction if needed.

## First Observable Slice

POST capture-url with real recipe storage and real orchestrator whose YAML source is unavailable; reread recipe and failures; supply valid YAML; POST retry; reread one normal task graph and unchanged recipe/metadata. No model execution is required. Qualify PostgreSQL and disk separately from in-memory feedback.

## State, Concurrency and Recovery

Initialization takes a PostgreSQL workflow-row lock, rereads marker state, and replaces only a still-paused initialization marker. Committed or concurrent success returns existing graph without replay. Clear takes the same lock before deciding eligibility, so it cannot clear a stale marker while initialization commits. Database initialization failure rolls back and retains the marker. Unknown replies are reconciled by later reads of the same ID.

## Persistence and Side Effects

Recipe and marker use one database SaveChanges boundary. recipe.info remains a separate preceding disk write; no universal store atomicity is claimed. A crash after database save leaves a recoverable failed record. Existing historical orphan recipes are not backfilled.

## Compatibility, Rollout and Reversal

No endpoint/schema change. Parent coordinates OpenAPI generation and method-sensitive Settings mocks/browser acceptance. URL initialization records require the new retry behavior; rollback while markers remain would not initialize them. Photo/PDF and ordinary failed acquisition retries remain unchanged.
