# API design principles

For an approved API surface change, minimize what callers must know while keeping
operation semantics explicit. Preserve established compatibility and naming patterns.
A smaller endpoint count is not itself a simpler contract.

Choose resource updates or explicit action endpoints according to the behavior:
use an update shape when modifying resource state fits the contract, and an action
when a distinct domain operation needs its own inputs, outcomes or failure rules.
Neither PATCH nor an action endpoint is a universal default. Avoid opaque action
payloads that force consumers to reconstruct business policy.

Inspect the generated Kiota request builders and types for the affected operation.
Keep parameters, optionality, response shapes and documented errors usable by the
existing client wrappers. Define schema-valid examples, including relevant empty
and failure cases.

## Schema presence and null values

Use the declared dialect. For OpenAPI 3.1's JSON Schema semantics, `required`
controls property presence; an explicit null type or schema union controls null
acceptance. Legacy `nullable: true` alone does not widen a string/object schema.
Generated TypeScript optional/nullable members are client projections, not runtime
validators or proof of contract requiredness. Check the operation's schema, DTO
serialization and relevant wire assertions separately. Report existing dialect or
intent disagreements; they do not authorize a contract-wide migration.

## WFS wire boundaries

Inspect the affected controller, `Program.cs`, `SuccessWrappingFilter.cs` and
`ErrorHandlingMiddleware.cs` before deciding the response shape. Successful object
wrapping has exceptions; errors, empty responses, files/streams and multipart intake
need their operation-specific status, content type, headers and body definitions.
Do not replace approved errors with framework defaults or infer one universal
`data` envelope. `PdfCaptureOpenApi.cs` is an existing bounded publication transformer,
not a substitute for the hand-maintained contract.

Preserve operation security requirements and anonymous exceptions. OpenAPI security
array entries are alternatives; multiple schemes in one entry are jointly required.
Follow existing auth/cookie and member-context handling without treating identity
headers as credentials. For client error behavior, inspect generated mappings and
the affected wrapper; [Kiota errors](https://learn.microsoft.com/en-us/openapi/kiota/errors)
are operation-dependent. Generation does not prove auth enforcement or retry safety.

Generation and compilation check client shape and usage; they do not prove runtime
behavior. Exercise affected stateful mocks and real application seams according to
shared acceptance policy, including observable effects on subsequent reads.
