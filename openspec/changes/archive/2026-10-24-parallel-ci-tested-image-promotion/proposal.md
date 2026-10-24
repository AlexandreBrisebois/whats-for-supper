# Proposal

## Why
PWA E2E runs on one runner, and tagged releases repeat validation and rebuild smoke-tested containers. Main must stay green without packaging every source change.

## Outcome and Scope
Run affected capability suites concurrently, with conservative full coverage for shared or unknown PWA impact. Keep database smoke in ordinary CI. Package ARM64/AMD64 only for release tags, smoke-test exact images and publish without rebuilding. Reuse successful exact-commit source CI instead of rerunning it. Preserve unrelated work, release authorization, annotated tags and installation assets.

## What Changes
- Selected PWA capability suites share one production build and merged reporting.
- Database/schema/mapping and container infrastructure changes retain single-AMD smoke.
- Tags build and smoke production images on native AMD/ARM runners once, then publish retained images.
- Exact successful source CI skips repeated release source validation; absent success triggers full validation once.
- Narrow install-identity PR triggers and remove the completed manual PDF preview workflow, preserving tests/scripts.

## Capabilities
CI/release tooling only; `skip_specs: true` applies.

## Impact
GitHub workflows, Playwright selection/reporting, smoke runner, focused harness tests and CI documentation. Main bakes stable; non-main bakes beta. Images carry revision/channel labels; release versions live in registry tags and installation metadata.
