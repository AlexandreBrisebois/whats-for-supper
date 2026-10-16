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

1. Locate the approved operation and affected controller/DTO, client wrapper and
   mocks using [shared investigation](../../core/context-loading.md#investigation).
   Use `task agent:api` or `task agent:slice -- <route>` when helpful for discovery.
2. For an authorized API change, define paths, parameters, response schemas and
   schema-valid examples first. Preserve camelCase JSON; use deterministic valid
   UUIDs in examples and test fixtures. Production identifier behavior follows the
   approved contract. Include applicable empty collections and documented errors.
3. Regenerate with `task gen:client`; its pipeline is
   `scripts/agent/kiota_client.py` and `pwa/scripts/fix-kiota-imports.js`.
   Inspect the affected route/models under `pwa/src/lib/api/generated/`; validate
   compilation with `task typecheck`. Do not hand-edit generated types.
4. Write affected seam regression tests before implementation. Synchronize backend
   DTOs, wrapper calls, builders and Playwright mocks with the approved contract.
   Follow [database](../database/SKILL.md) for persistence changes: storage shapes
   may differ from API DTOs and require explicit conversion/constraint checks.
5. Follow the shared [execution harness](../../core/execution-harness.md) for final
   verification. Use individual reconciliation or drift commands when helpful
   during development.

## Check coverage

Use the [execution harness](../../core/execution-harness.md#effects-blockers-and-supporting-commands)
for command coverage and prerequisites. Static discovery, DTO comparison and mock
pattern checks establish only the properties they inspect; live endpoint parity
and behavior tests require their own evidence. Record unavailable checks as blocked.

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
