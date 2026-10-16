# Spec Delta

## ADDED Requirements

### Requirement: Attempt grocery check-map publication at supported saves

After a full grocery-state update or single-item toggle saves successfully and reaches publication, the server SHALL attempt `grocery_updated` with its week offset and resulting check map, forwarding an available request exclusion. Grocery recomputation SHALL attempt this event only when its check-state transition changed the map and a publisher is available. Publication SHALL NOT imply browser application.

#### Scenario: Grocery mutation reaches publication
- **WHEN** a full map update or single-item toggle completes its save and reaches publication
- **THEN** the event attempt carries the affected week and resulting complete check map with the supplied exclusion

#### Scenario: Recompute changes check state
- **WHEN** recomputation saves a changed check map and has a publisher
- **THEN** it attempts a grocery update for that week without a request exclusion

#### Scenario: Recompute has no check-state transition
- **WHEN** recomputation does not change its check map
- **THEN** it does not publish a grocery event from that recomputation path merely because grocery line items were recalculated

### Requirement: Replace received grocery checks only for the loaded week

A parsed `grocery_updated` event SHALL replace the loaded grocery check map with its supplied dictionary only when its week offset strictly equals the displayed week's loaded offset. A different or absent offset SHALL leave that map unchanged. This event SHALL NOT itself replace grocery line items, change the displayed week or use the snapshot additional-data wrapper.

#### Scenario: Matching week replaces checks
- **WHEN** a grocery event identifies the loaded week and supplies a valid check dictionary
- **THEN** that dictionary replaces the loaded check map, including removal of prior keys absent from the event, while line items remain unchanged

#### Scenario: Another or missing week
- **WHEN** a grocery event identifies another week or omits its week offset
- **THEN** the loaded check map remains unchanged through this handler

### Requirement: Forward ready hints beyond pending capture tracking

After parsing `recipe_ready` and completing any matching capture dispatch, the browser SHALL record the recipe identity in its session ready-hint set even when no pending capture matches. Repeated identities SHALL remain a single set membership. This hint SHALL NOT itself persist recipe readiness or replay missed notifications; capture presentation remains with “Inline transition to ready status upon completion” in recipe-capture.

#### Scenario: No capture is pending
- **WHEN** a parsed ready event has no matching pending capture and handler steps return
- **THEN** the session ready set contains its identity without adding a capture notification

#### Scenario: Ready identity repeats
- **WHEN** the same ready identity is handled again and handler steps return
- **THEN** it remains one set membership without establishing exactly-once transport

### Requirement: Preserve available lifecycle context at the capture handoff

When a parsed lifecycle event matches pending capture tracking, shared dispatch SHALL forward available event context to the existing capture notification consumer. Ready context includes identity, display name and image; failure context includes recipe and workflow identities, diagnostics and partial data. Capture SHALL retain ownership of “Persistent failure banner on workflow failure”; forwarding context SHALL NOT expose raw diagnostics as user guidance.

#### Scenario: Ready context reaches the journey
- **WHEN** a ready event matches pending capture tracking
- **THEN** dispatch removes that pending identity and appends ready context using event name, then pending name, then identity as nullish fallbacks, with the supplied image

#### Scenario: Failure context reaches the journey
- **WHEN** a failed event matches pending capture tracking
- **THEN** dispatch removes that pending identity and appends failure context with workflow identity, error, failed step and partial data, using partial name, pending name and identity as nullish name fallbacks

#### Scenario: Failure has no pending match
- **WHEN** a failed event has no matching pending capture
- **THEN** this handler adds no capture notification and does not mark the identity ready
