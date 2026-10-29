# Proposal

## Why

WFS currently has no automatic telemetry error collection. Unexpected browser and Next server errors need safe central reporting; handled business failures require their own later journey owners.

## Outcome and Scope

Report one bounded observation per unexpected browser or Next server error occurrence, with no raw messages/stacks and optional current document context. Preserve standalone usefulness when presentation/correlation is unavailable. Do not alter application error handling or claim that all failures are captured.

This change excludes .NET logging reconfiguration, feature-specific handled failures, exhausted business retries, automatic fetch/console capture, diagnostic free text, technical trace export and business recovery events. Those require selected journey changes. Application code and collection remain unchanged during this planning work.

## What Changes

- Initialize safe browser error/rejection reporting in `instrumentation-client.ts` and integrate the existing route error boundary plus a root error boundary.
- Use `instrumentation.ts` / `onRequestError` for Next-captured server failures with server producer authority.
- Define reporting ownership, bounded overlap suppression, safe categories and separate error quotas.
- Preserve runtime opt-in, token secrecy, nonrecursive pipeline failure handling and ordinary UI recovery.
- Verify actual isolated WFS error receipt through protected Sentrame reads without borrowing another SDK sample's qualification.

## Capabilities

### New Capabilities

- `anonymous-error-observation`: Own minimized central unexpected browser and Next server error observations.

### Modified Capabilities

None. Existing error/retry behavior and business outcome contracts remain unchanged.

## Impact

Reuses the [opening transport](../centralize-pwa-opening-observation/design.md) and optional context from [navigation observation](../observe-pwa-navigation/design.md). Likely owners: PWA instrumentation entrypoints, `app/error.tsx`, a new `app/global-error.tsx`, telemetry adapters/tests and `docs/sentrame.md`. Inventory the existing .NET Serilog/OTel pipeline for later work; do not forward it into Sentrame or create another provider here. No business API/client/schema changes or receiver modifications. Sessions and dependencies are tracked in the [program tracker](../../../docs/telemetry/README.md).
