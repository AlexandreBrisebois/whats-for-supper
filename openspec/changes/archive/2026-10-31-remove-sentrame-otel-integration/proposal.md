# Remove Sentrame and OpenTelemetry integration

## Why

The owner has retired the Sentrame integration and its dedicated telemetry logging. Current browser observers, Node providers and API exporters still implement that integration; leaving them disabled would retain its maintenance and activation surface.

## Outcome and Scope

After a separately approved implementation, WFS will contain no application-owned OTel providers/exporters or Sentrame observation producers, forwarding Actions, credentials/configuration plumbing, dedicated qualification fixtures or active setup roadmap. Ordinary application logs and business behavior remain. This proposal is review only, based on clean branch `review/solar-earth-continuation`, HEAD `e4cd725dfbd0092667d04ddaa4062dea3846b843`, inspected on 2026-10-31.

Preserve confirmed issue saves, launch-failure compensation, raw-response validity checks, recipe/cooking/navigation behavior, current gesture fixes, ordinary framework/Serilog/console errors and independent search diagnostics. Do not revert mixed commits. No retained-data deletion, credential revocation, deployment changes, Sentrame repository edits, staging or commits are authorized.

## What Changes

- **BREAKING for telemetry consumers:** retire all Sentrame opening/navigation/surface/content/error/issue observations and native Next/.NET spans; remove SDK queues, retries, projection, resource and flush/shutdown ownership.
- Remove the older API OTel operational log sink, logging console-export bridge and metric exporter/instrumentation too, completing the requested OTel cleanup. Preserve the underlying ordinary Serilog logs and independent .NET search meters.
- Remove direct integration dependencies and regenerate affected lockfiles without unrelated upgrades; retain unavoidable framework/AI dependency transitives with documented owners.
- Remove active opt-in/setup/Compose guidance and dedicated fixtures/tests/CI assignments; retain business assertions and unrelated tool telemetry opt-outs.
- Retire the six canonical telemetry capability contracts through explicit removal deltas and replace the export owner's contract with an explicit disabled/absent-integration guarantee. Keep historical archived changes and evidence unchanged.
- Deliver a current ordinary-logging inventory and require an actual residual review after implementation. This review does not authorize reducing those logs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `anonymous-pwa-telemetry`: remove opening collection requirements.
- `anonymous-navigation-observation`: remove document/screen/surface/content observation requirements.
- `anonymous-error-observation`: remove dedicated exception telemetry requirements.
- `native-technical-observation`: remove native trace export requirements.
- `recipe-issue-observation`: remove issue-response and persistence telemetry requirements; preserve business correctness outside this capability.
- `standard-telemetry-export`: remove standard delivery requirements and require integration absence, ordinary-log preservation and historical boundaries.

## Impact

See [design](design.md), [concrete inventory](removal-inventory.md), [remaining logging](logging-inventory.md) and [ordered implementation tasks](tasks.md). The REST contract `specs/openapi.yaml` has no telemetry operation or preference to remove: browser forwarding is via Next Server Actions. No database migration or generated Kiota contract change is proposed. Current Profile settings are language/browsing/preview choices, not a telemetry consent UI.
