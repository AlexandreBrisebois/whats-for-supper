# Model routing — Design

**Derived from:** [requirements.md](requirements.md), MR-R1–MR-R8.
**Status:** Synchronized proposal; increment 1 only is execution-detailed.

## Approach and alternatives

Use an internal workload-bound `IChatClient` facade and immutable configuration. Keep Microsoft.Extensions.AI as the application-facing chat abstraction. Retain the current Gemini OpenAI-compatible transport for increment 1; qualify it against installed packages rather than introducing an unrelated SDK migration.

Explicit ordered targets meet the approved behavior with deterministic diagnostics. Weighted scoring would need cost/quality evidence and introduce policy the user did not select. A combined chat/embedding router would cross the search vector compatibility boundary without serving the selected outcome. A native Gemini SDK migration is unnecessary unless targeted qualification demonstrates the current transport cannot preserve required behavior; stop and revise the design in that case.

## Integration map

Paths below are repository-relative. Proposed paths are not claims of existing implementation.

| Existing owner | Planned change / boundary |
|---|---|
| `api/src/RecipeApi/Program.cs` | Replace single chat registration with routing registration and workload-bound factories; retain outer demo guard |
| `api/src/RecipeApi/Services/Agents/RecipeAgent.cs` | Bind each existing processor registration to its workload; retain prompts, options and persistence |
| `api/src/RecipeApi/Services/Agents/WebAcquisitionAgent.cs` | Bind WebAcquisition; URL fetch is outside inference retry |
| `api/src/RecipeApi/Services/Processors/CategorizeIngredientsProcessor.cs` | Bind CategorizeIngredients; preserve soft failure |
| `api/src/RecipeApi/Services/Processors/CategorizeRecipeProcessor.cs` | Bind CategorizeRecipe; preserve soft failure |
| `api/src/RecipeApi/Services/Processors/ClassifyRecipeVegetarianProcessor.cs` | Bind ClassifyRecipeVegetarian; preserve downstream validation |
| `api/src/RecipeApi/Services/DemoModeChatClient.cs` | Outermost guard for every bound chat facade |
| `api/src/RecipeApi/Services/Ai/AiExceptionHandler.cs` | Recognize typed route exhaustion before legacy raw exception mapping |
| `api/src/RecipeApi/Services/WorkflowWorker.cs` | Recognize typed transient/rate-limit exhaustion without parsing provider text; preserve unrelated error behavior |
| `api/appsettings.json`, `docker/.env.example`, `release-template/synology/.env.example` | Document opt-in routing and secret injection; keep existing deployments working |
| `api/src/RecipeApi/Services/GeminiEmbeddingProvider.cs`, `Services/Agents/RecipeHeroAgent.cs` under the same project | Preservation checks only; no routing migration |
| `specs/openapi.yaml`, PWA, database | No interface or persistence changes proposed |

Proposed implementation folder: `api/src/RecipeApi/Infrastructure/ModelRouting/`.
Proposed tests: `api/src/RecipeApi.Tests/Infrastructure/ModelRouting/`, plus affected existing Services and Integration suites.

## Configuration (MR-R1–MR-R4)

Proposed root: `ModelRouting`. Immutable startup snapshot; no mutable global current workload.

- `Targets`: entries with unique `Id`, `Provider` (`Gemini` in increment 1), `ModelId`, `Endpoint`, `ApiKeyConfigurationKey`, `Capabilities` (`Text`, `Vision`, `StructuredOutput`) and `AttemptTimeoutSeconds`.
- `Workloads`: map of the seven exact processor names in MR-R1 to an ordered array of target IDs.
- `OverallTimeoutSeconds`: finite total deadline per chat invocation.

Proposed defaults: attempt timeout 150 seconds, overall timeout 300 seconds. These are configurable engineering defaults, not provider latency guarantees. A legacy synthesized single target retains the current 300-second network timeout, capped by the overall deadline. Validate endpoint syntax and HTTPS for Gemini; custom endpoints are trusted operator configuration, never request input. Reject unknown capability names and incompatible route definitions where statically determinable. Evaluate actual message/option requirements again before dispatch.

Example target relationship (illustrative IDs, no production model recommendation): `gemini-primary` and `gemini-secondary` both reference the operator's chosen model; their secret references are `ModelRoutingSecrets:Primary` and `ModelRoutingSecrets:Secondary`. Environment equivalents use `ModelRoutingSecrets__Primary` and `ModelRoutingSecrets__Secondary`. Both can appear in every workload route or in selected workload routes. No keys appear in checked-in examples.

No root section means legacy adaptation of GEMINI_MODEL_ID, GEMINI_ENDPOINT and GEMINI_API_KEY. Present but incomplete configuration is invalid rather than a request for default merging. Preserve GEMINI_MAX_OUTPUT_TOKENS at its current consumer. Credential absence is target unavailability, distinct from malformed route configuration. Do not validate secrets by making startup network calls. Legacy embedding and hero clients continue reading their existing GEMINI settings.

## Binding and client lifetime (MR-R1, MR-R2, MR-R7)

Proposed `IWorkloadChatClientFactory.Create(workload)` returns a lightweight workload-bound facade over the shared router. Wire explicit factories for the three RecipeAgent registrations and each other chat processor in Program.cs. Callers continue consuming IChatClient. Do not infer workload from prompt text, ambient state or model names. Do not leave an unqualified DI registration that silently chooses a workload; tests identify any missed consumer.

A target-client registry owns one immutable SDK client per target identity, even when model IDs match. It owns disposal; disposing a facade must not dispose the shared registry. Secret resolution occurs through IConfiguration and is never attached to ChatResponse metadata. Clone options per attempt so provider/model overrides cannot mutate caller-owned options. The selected target owns the model; conflicting caller ModelId fails explicitly. Preserve output limits, temperature and image content. Materialize replayable messages once for this non-streaming scope.

No common adapter base class, strategy interface hierarchy, health service or future-provider stub is required. Isolate Gemini construction and error normalization behind the smallest seam needed for a fake transport and later provider implementations.

## Dispatch state machine (MR-R4–MR-R6)

1. Outer demo guard and caller-cancellation check.
2. Resolve workload and immutable ordered route; reject unsupported streaming/tools. Derive capabilities from actual messages/options. Start monotonic overall deadline.
3. Skip unavailable or incapable targets, retaining sanitized reasons. If none remain, throw typed terminal unavailable failure.
4. Clone options, resolve target client, and invoke with linked caller, attempt and overall cancellation. SDK automatic retries are zero. Cap the attempt by remaining overall time.
5. On complete success, return the provider response preserving usage and finish/refusal semantics, with safe routing metadata. A safety refusal is a terminal result, never a reason to seek a different provider.
6. On caller cancellation, propagate it. On overall deadline, stop with typed temporary deadline exhaustion. On attempt timeout or normalized fallback-eligible failure, record outcome and advance. Unknown/invalid/safety failures stop immediately.
7. At end of list, throw `RouteExhaustedException` (proposed name) with workload, attempted/skipped target IDs and normalized outcomes only. Do not retain raw exceptions or response bodies in the outward exception graph.

The bound is at most the eligible route length in transport dispatches per chat call, and at most the overall deadline excluding unavoidable local scheduling overhead. There is no same-call target revisit or background probe. Subsequent workflow retries begin a fresh route; health memory and cross-call cooldown are deferred.

Normalize credentials using structured provider error evidence, not a blanket assumption that every 400/403 means a bad key. Controlled transport fixtures must distinguish rejected keys from malformed requests and safety restrictions. HTTP 401/403 without a safety signal is a credential/authorization candidate; ambiguous outcomes fail closed. Missing keys and capability skips are never transient by themselves.

Exhaustion metadata includes `IsTransient` (any temporary attempted failure, including deadline exhaustion) and `HasRateLimit` (any attempted 429). All-auth exhaustion is terminal. A terminal invalid-request/refusal encountered after a temporary failure still stops terminally rather than becoming aggregate transient exhaustion. WorkflowWorker uses the typed flags only for this new failure family; maintain existing retry schedule and MaxRetries. Existing processor soft-failure boundaries still decide whether an exception reaches the worker. Test both propagated and absorbed exhaustion. Router cancellation classification must precede broad legacy AiExceptionHandler heuristics.

## Diagnostics, compatibility and validation (MR-R6–MR-R8)

Structured logs and one routing activity report workload, target/model/provider, attempt duration and normalized reason. Bounded metrics labels use configured workload/provider and outcome; no request text, keys, secret reference values, arbitrary errors or household identifiers. Safe terminal summaries integrate with existing workflow diagnostics without changing OpenAPI. Verify no raw credential-bearing transport error escapes through AiExceptionHandler logging.

Unit tests use controllable time and fake clients; adapter tests use controlled HTTP responses through the installed SDK. Integration tests exercise actual DI, processor effects and worker rescheduling against the repository test infrastructure. Assert demo dispatch count is zero, two-key credential separation, bounded attempts, cancellation, malformed output without replay, image eligibility, options preservation, and parallel workload isolation. Real database workflow transitions require their actual fixture, not only a mock worker assertion.

Live qualification is separate and opt-in: operator-selected Gemini model, two credentials, harmless text/image fixtures as applicable, a bounded call budget and sanitized evidence. Do not deliberately exhaust quota; simulate 429s in transport tests. A two-key live success does not prove quota independence. Failure to obtain live evidence is recorded as not-run/blocked, never replaced with mock success.

## Progressive extensions

Increment 2 adds OpenAI target construction and normalized error coverage. Increment 3 adds Claude after selecting an adapter compatible with the installed Microsoft.Extensions.AI version. Before either implementation, verify current official provider documentation and package APIs, detail its scoped tasks, and qualify required capabilities. Neither extension changes default workload enrollment. Mixed-provider fallback requires explicit route configuration and the same eligibility/privacy rules. Provider-specific options or newly unsupported semantics require a spec revision, not silent option dropping.
