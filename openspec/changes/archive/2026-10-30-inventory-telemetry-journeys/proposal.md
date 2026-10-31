# Proposal

## Why

Automatic screen/error observations cannot supply product intent, persistence or recovery semantics. A source-backed journey inventory identifies the smallest explicit events and trusted owners before feature instrumentation grows.

## Outcome and Scope

Maintain the [journey inventory](../../../../docs/telemetry/journey-inventory.md), validate one bounded experience group per session against canonical specs, source/tests and an available isolated UI, and extract one implementation proposal at a time. Existing inventory rows are source-backed seeds, not completed walkthroughs or approved emitter contracts.

This is documentation and investigation only. It changes no product requirements, instruments no feature, enables no collection, and modifies neither business APIs nor Sentrame. Local UI walkthroughs and synthetic fixtures must be explicitly selected; physical installed-phone qualification stays separate.

## What Changes

- Track entry, intent, persistence, presentation, cancellation, retries, recovery and the remaining evidence gaps for each experience.
- Identify baseline coverage versus custom browser/server observations and exact owning files, contract operations and tests.
- Record actual receiver support/gaps, privacy/volume expectations and qualification status.
- Keep later journey implementation proposals separate and narrowly scoped; planning readiness never marks implementation complete.

## Capabilities

### New Capabilities

None. `skip_specs: true`: the output documents existing behavior and proposed evidence; it introduces no runtime capability.

### Modified Capabilities

None. Canonical product specs remain the authority; observed contradictions become findings, not silent product changes.

## Impact

Only this change's artifacts, `docs/telemetry/` inventory/tracker and the [session prompt](../../../../.agents/prompts/telemetry-session.md). Read relevant owners under `openspec/specs/`, `docs/user-guide.md`, `docs/flows/`, PWA source/tests and API operation/persistence owners. Historical diagrams are navigation aids, not current guarantees. Receiver investigation reads `/Users/alex/Code/sentrame` without changing it.
