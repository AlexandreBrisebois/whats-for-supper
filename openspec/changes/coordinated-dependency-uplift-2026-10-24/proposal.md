# Proposal

## Why

The matching Npgsql EF RC2 provider is now published, so the API and test EF cohort can advance together. Published compatible PWA, Node and infrastructure patches are also available; the scheduled uplift must preserve current application behavior.

## Outcome and Scope

Update compatible dependencies and their lockfiles, retain the existing API contract and PostgreSQL major, and produce a validated draft dependency PR. Reuse existing EF PR #293 rather than competing with it. Leave Google.GenAI (#320), Microsoft.OpenApi (#294), OpenTelemetry exporters (#307/#308) and follow-redirects (#309) with their existing PR owners, including their related transitive graph. Motion #312, lucide-react #319 and documentation #317 are already merged; any further version changes start from current main.

No merge, deployment, release publication, access changes or unrelated features are authorized.

## What Changes

- Align all API/test EF references and shared overrides with Npgsql RC2 and the already pinned SDK/runtime/dotnet-ef RC2.
- Advance compatible unowned API/test and npm packages; regenerate locks with normal dependency resolution.
- Align Node, OpenSpec and infrastructure image references across local setup, CI, containers and installation templates.
- Record retained versions, peer constraints, test evidence and unresolved environment limitations.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is compatibility and tooling maintenance with no specification-level behavior change; `skip_specs: true` applies.

## Impact

API and test project manifests/locks, shared EF overrides, PWA manifests/locks and generated client when required by Kiota parity, tool pins, container and Compose image references, and dependency documentation. Any necessary logic migration must preserve existing approved behavior and first reproduce a real failure with a regression test.
