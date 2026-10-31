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

## Resolve dialect and tooling

Read `specs/openapi.yaml` for the OpenAPI version and any schema-dialect overrides.
Resolve Kiota from `.config/dotnet-tools.json`, generated settings from
`pwa/src/lib/api/generated/kiota-lock.json`, and runtime dependencies from
`pwa/package.json`/`package-lock.json`. For ASP.NET publication, inspect the affected
project/lock files and `Program.cs`; SDK selection and tool runtime are separate.
These files declare inputs, not successful generation or installed runtime identity.
Use version-matched [OpenAPI specification](https://spec.openapis.org/oas/v3.1.0.html),
[JSON Schema semantics](https://json-schema.org/draft/2020-12/json-schema-validation)
and [Kiota guidance](https://learn.microsoft.com/en-us/openapi/kiota/using).
Read [API design principles](api-design-principles.md) for a schema or wire-shape
decision; do not import a newer dialect or generator recipe by default.

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
   The wrapper owns pinned clean-output generation, postprocessing and formatting;
   its check compares temporary generated output, excluding lock/log metadata.
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
Choose evidence for the affected operation, not merely a test with "contract" in
its name. Existing examples:

| Evidence | What it establishes when run successfully |
|---|---|
| `pwa/src/lib/api/recipe-import-report-contract.test.ts` | Selected schema/generated-text assertions, not network serialization or schema validation |
| `pwa/src/lib/api/grocery-extras.test.ts` | Wrapper arguments and version/week handling against replacement SDK methods |
| `api/src/RecipeApi.Tests/Infrastructure/SuccessWrappingFilterTests.cs` | Status-dependent wrapping behavior |
| `api/src/RecipeApi.Tests/Integration/PdfCaptureIntegrationTests.cs` | Selected multipart, response and published OpenAPI assertions through the test factory |

The factory has its own pipeline/replacements. These checks do not by themselves
qualify production publication; endpoint drift compares routes/methods, not full
response or security semantics. Inspect actual assertions and reported results.

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
When changing auth, headers or errors, follow the affected browser/server path
through `api-client.ts`, `server-client.ts` and `demo-session.ts` as applicable.
`demo-session.test.ts` asserts that a demo-generation 412 requires refresh without
replaying the old mutation; preserve the approved protocol rather than adding
generic retries. Backend lifetime guidance remains with
[dotnet-dev](../dotnet-dev/SKILL.md); shared verification commands stay in the harness.
