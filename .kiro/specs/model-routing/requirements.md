# Model routing — Requirements

**Kind:** Feature specification; progressive delivery.
**Derivation:** Behavior-first, accelerated cadence.
**Source:** This document, based on the user decisions below and current repository source inspected on 2026-09-29.
**Status:** Reviewable proposal. User decisions are settled; implementation details and tasks remain proposed. No product implementation is authorized by this document.

## Outcome and decisions

Operators assign an ordered list of named inference targets to each chat workload. A target identifies a provider, model, and credential reference. Gemini comes first; OpenAI and Claude follow as separately selected increments.

User decisions:
- Explicit workload assignments, not automatic scoring.
- Increment 1 supports Gemini chat only, with working ordered fallback, including a second Gemini key for the same model.
- Targets and assignments are server configuration applied on restart. Secrets come from environment variables or secret configuration providers.
- Temporary failures and rejected credentials trigger fallback. Invalid requests and safety refusals do not.
- Embeddings and hero-image generation remain outside this change.

## Delivery scope

| Increment | Outcome | State |
|---|---|---|
| 1 | Gemini targets, workload routing, bounded fallback, safe migration and diagnostics | Detailed here; proposed for implementation selection |
| 2 | OpenAI chat targets using the same workload and fallback policy | Planned; provider qualification and detailed tasks required first |
| 3 | Claude chat targets using the same policy | Planned; adapter choice and detailed tasks required first |

Later increments are not completion conditions for increment 1. Their order reflects the roadmap, not a technical dependency between OpenAI and Claude.

Non-goals: weighted cost/quality scoring, automatic discovery or benchmarking, admin UI, hot reload, routing HTTP endpoints, embedding routing, image generation routing, streaming delivery, tool execution, distributed circuit breakers, tenant-specific policy, or database changes. Do not build placeholder adapters for later providers.

## Verified baseline

`api/src/RecipeApi/Program.cs` constructs one OpenAI-compatible Gemini chat client with SDK retries and wraps it in `DemoModeChatClient`. `RecipeAgent` handles ExtractRecipe, GenerateDescription and SynthesizeRecipe; WebAcquisition and three categorization/classification processors also consume chat. `RecipeHeroAgent` uses Google.GenAI independently. `GeminiEmbeddingProvider` implements the separate `IEmbeddingProvider` seam. `WorkflowWorker` already reschedules transient failures and staggers pending tasks on rate limits. Some categorization processors deliberately absorb failures.

## Requirements and observable acceptance

### MR-R1 — Deterministic workload routing

Each of ExtractRecipe, GenerateDescription, SynthesizeRecipe, WebAcquisition, CategorizeIngredients, CategorizeRecipe and ClassifyRecipeVegetarian has one resolved ordered target list. The first eligible target is selected; no random, score-based or implicit cross-workload fallback occurs. Unknown workloads fail before network dispatch. Concurrent calls cannot overwrite each other's workload or options.

### MR-R2 — Target and secret identity

Distinct target IDs may use the same Gemini model with different secret references. Each attempt uses only its selected target's credential. A test using two independently recorded fake transports must prove key A failure invokes key B, without changing the requested model or exposing either key. Multiple keys do not imply independent quotas or guaranteed recovery.

### MR-R3 — Configuration and compatibility

When routing configuration is absent, derive a single legacy Gemini target from existing GEMINI settings and map every supported workload to it. Existing endpoint/model defaults and output options remain compatible. Explicit routing configuration is authoritative: unknown provider, duplicate target ID, missing workload assignment, unknown target reference, duplicate target in a route, empty route, invalid endpoint or nonpositive timeout fails validation; never silently fall back to legacy settings.

Missing secrets make individual targets unavailable with sanitized diagnostics; they are skipped without a provider call. If all targets are unavailable, fail the AI invocation explicitly while leaving non-AI application behavior usable. Demo mode must not require usable AI credentials. Configuration and credential rotation take effect on restart.

### MR-R4 — Hard eligibility

All attempted targets must support the actual request, including image input where present and any requested structured output. Unsupported request features cause explicit failure if no eligible target remains. Never discard images, tools, output constraints or other options to make a route fit. Increment 1 rejects streaming and tool-bearing requests before dispatch; it does not silently downgrade them.

### MR-R5 — Ordered bounded fallback

A call tries each eligible target at most once, in configured order. HTTP 408, 429, 5xx, transport failure and router-owned attempt timeout allow the next target. Provider-confirmed credential rejection or authorization denial also allows the next target. Classification must distinguish authentication failure from safety refusal even when a status code alone is ambiguous. Invalid requests, safety refusals, unknown failure categories and malformed successful output stop without router fallback.

Caller cancellation prevents further attempts and propagates cancellation. One finite overall deadline bounds the call; exhausting it prevents another attempt. SDK retries are disabled for routed clients. Retry-After prevents redispatch to the same target within the call; another configured target may be tried without waiting. The router never claims that another key bypasses shared provider limits.

### MR-R6 — Workflow integration and preserved behavior

Only complete successful responses reach callers; the router never reruns a processor or persists recipe state. On exhaustion, report typed, sanitized failure metadata. All credential/configuration failures are terminal; exhaustion containing temporary failures remains eligible for existing workflow retry policy. Rate-limit exhaustion retains the existing stagger behavior. Invalid requests and refusals remain terminal at the router boundary. Preserve existing processor-specific soft failures, workflow persistence, prompts, language handling and downstream validation. Cancellation is never converted by the router into a retryable timeout.

### MR-R7 — Isolation and observability

Demo mode blocks dispatch before any target client sends a request. Emit workload, target ID, provider, model, attempt number, duration, normalized outcome and fallback/exhaustion reasons. Do not log keys, secret values, raw provider bodies, prompts, images or response text through the new routing path. Client ownership and disposal are explicit, with no per-call credential mutation on shared clients. Embedding and hero configuration/behavior are preserved.

### MR-R8 — Progressive provider delivery

Later providers reuse the same target, workload and normalized outcome semantics. Each provider increment must qualify text, images where required, output options, errors, cancellation, usage and credential isolation using controlled transport tests and a separately authorized live smoke test. Adding a provider does not automatically enroll it in any workload. Mock success is not provider qualification.

## Acceptance boundary and remaining decisions

Increment 1 is complete only when MR-R1 through MR-R7 are verified at the router and affected workflow/processor seams. MR-R8 governs later increments. Exact production model IDs, secret names and timeout tuning belong to deployment configuration, not hardcoded requirements. Operator-supplied credentials and approved live-call scope are required before live qualification; repository tests require neither.

No unresolved product decision blocks drafting increment 1. Design defaults below remain proposals for review. Implementation requires selection of a bounded task, not an inference from this spec's existence.
