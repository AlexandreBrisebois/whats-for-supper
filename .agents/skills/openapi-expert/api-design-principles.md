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

Generation and compilation check client shape and usage; they do not prove runtime
behavior. Exercise affected stateful mocks and real application seams according to
shared acceptance policy, including observable effects on subsequent reads.
