# Proposal

## Why

Main mixes EF Core RC2 with Preview 6 tests and a provider pinned to Preview 6, preventing a compatible restore. SDK, runtime images and npm versions also diverge across development and CI.

## Outcome and Scope

Restore, build, test and package one supported dependency cohort across API, tests, tools, PWA and containers. Preserve API contracts, database schema and household behavior. The owner explicitly approved bringing EF RC2 back to the latest provider-compatible RC1 as part of this coordinated upgrade. No deployment, release, feature work or changes to separate draft specs.

## What Changes

- Align all EF packages/tools to RC1 and Npgsql to RC1.1; update SDK/ASP.NET/runtime together to published compatible releases.
- Update direct npm and NuGet dependencies within verified peer/provider constraints, pin reproducible inputs and align Node development/container versions.
- Refresh generated clients only if their supported runtime requires it; retain the approved OpenAPI contract.
- Validate restore, types, unit/API/browser/PostgreSQL tests, endpoint/client parity and disposable container behavior.

## Capabilities

### New Capabilities

None; tooling and dependency maintenance only. `skip_specs: true` applies.

### Modified Capabilities

None. Existing behavior and API/schema requirements remain authoritative.

## Impact

API/test project manifests, SDK/tool manifests, PWA manifest/lock, CI SDK setup and Docker images; bounded compatibility fixes if verified necessary. No schema migrations or data resets.
