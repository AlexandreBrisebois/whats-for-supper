---
name: openapi-expert
description: Maintain approved API contracts, generated clients, examples and stateful mocks across WFS seams.
---

# OpenAPI procedure

Follow [contract/testing](../../core/contract-testing.md) and the selected scope:
approved contract → tests → implementation. Use [API design principles](api-design-principles.md)
for surface design. A divergent DTO, test or log does not authorize a contract
rewrite. Resolve against approved intent; ask only for consequential changes not
covered by existing authorization. Review may end with findings only.

## Establish and synchronize the seam

1. Use [shared investigation](../../core/context-loading.md#investigation),
   `task agent:api` and `task agent:slice -- <route>` to locate the operation in
   `specs/openapi.yaml`, affected controller/DTO, client wrapper and mocks.
2. For an authorized API change, define paths, parameters, response schemas and
   schema-valid examples first. Preserve camelCase JSON and deterministic valid
   UUIDs. Include applicable empty collections and documented error responses.
3. Regenerate with `task gen:client`; its pipeline is
   `scripts/agent/kiota_client.py` and `pwa/scripts/fix-kiota-imports.js`.
   Inspect the affected route/models under `pwa/src/lib/api/generated/`; validate
   compilation with `task typecheck`. Do not hand-edit generated types.
4. Write affected seam regression tests before implementation. Synchronize backend
   DTOs, wrapper calls, builders and Playwright mocks with the approved contract.
   Follow [database](../database/SKILL.md) for persistence changes: storage shapes
   may differ from API DTOs and require explicit conversion/constraint checks.
5. Use `task agent:reconcile` and applicable drift checks, then the shared
   [execution harness](../../core/execution-harness.md) completion route.

## Check coverage

| Command | Observation |
|---|---|
| `task agent:api` / `task agent:slice -- <route>` | Static discovery and navigation |
| `task agent:reconcile` | Static comparison of contract, backend and mock surfaces |
| `task agent:drift:endpoints` | Live API OpenAPI endpoint comparison; requires configured API (default 127.0.0.1:5001) |
| `task agent:drift:schemas` | Static DTO/schema comparison |
| `task agent:drift:mocks` | Static hardcoded-ID/GUID pattern audit; not schema validation |
| `task agent:drift` | Aggregate checks; inspect each result and unavailable service limitations |
| `task test:api`, `task test:unit`, `task test:e2e:ci` | Applicable backend, PWA unit and production-build Playwright behavior |

A skipped live probe or green aggregate log cannot establish live parity. Record
actual subcheck results and blocked dependencies; do not rewrite the contract to
clear drift automatically. Tooling behavior and completion changes have their
shared owner, not a separate model-tier policy here.

## Mock and client behavior

Use `pwa/e2e/mock-api.ts`, `pwa/src/testing/builders.ts` and `pwa/src/testing/mock-ids.ts` and their schema-compliant builders.
Preserve method dispatch, route precedence (Playwright last-registered matching
route first), mutation state, retry transitions and observable side effects.
A typed success response alone does not model an operation that changes subsequent
reads. Backend factories likewise retain workflow persistence needed by tests.
Use deterministic `MOCK_IDS` and valid media fixtures; cover populated/empty and
applicable error states. There is no requirement to start a nonexistent mock-server
script: the PWA uses Playwright route mocks.

Existing centralized client setup is `pwa/src/lib/api/api-client.ts`; affected
wrappers such as `recipes.ts` and `schedule.ts` isolate SDK calls. Prefer targeted
route/model inspection over loading the entire generated SDK.
