# Phase 4: Provider Adapters & Normalization (Mocks focus)

You are a senior .NET 10 developer. Your task is to implement the **Provider Adapters** for the Custom Model Router.

## Objective
Create a set of adapters that normalize communications with different AI providers (Azure, OpenAI, Gemini, Ollama, Anthropic). Since we are prioritizing **MOCK-driven development**, you will build the adapters and their supporting infrastructure using mocked backend clients.

## Design Constraints
- **Namespace**: `RecipeApi.Infrastructure.ModelRouter.Providers`.
- **Abstractions**: Implement `IChatClient` (and `IEmbeddingGenerator` where applicable).
- **Normalization**: Each adapter must map provider-specific response fields (e.g., `finish_reason`) to a stable internal schema.
- **Circuit Breaker**: Prepare the structure for a circuit breaker (Phase 5), but focus on the functional mapping here.

## What to Implement

### 1. Adapter Base / Utils
- **`BaseProviderAdapter`**: Common logic for error handling and request transformation.
- **Ollama Normalization**: Special handling for Ollama's non-standard `finish_reason` (mapping things like "load" to "stop").

### 2. Concrete Adapters
Implement adapters for:
- **`AzureOpenAIAdapter`**
- **`OpenAIAdapter`**
- **`GeminiAdapter`**
- **`OllamaAdapter`**
- **`AnthropicAdapter`**

Each adapter should:
1. Accept a `ProviderDescriptor` and `ModelDescriptor` in its constructor.
2. Delegate the actual HTTP/SDK call to an internal client (mockable).
3. Transform `Microsoft.Extensions.AI.ChatOptions` to the provider-native format.
4. Transform the provider-native response back to `ChatResponse`.

## TDD Requirements
Create `RecipeApi.Tests.Infrastructure.ModelRouter.ProviderTests`:
1. **Test**: `OllamaAdapter` correctly replaces "load" with "stop" in the `ChatResponse.FinishReason`.
2. **Test**: `GeminiAdapter` correctly maps its specific safety refusal signals.
3. **Test**: `AzureOpenAIAdapter` handles deployment-name vs model-name resolution correctly.
4. **Test**: All adapters return a consistent error object when the mock client simulates a timeout.

## Instructions
1. Focus on the **Ollama** and **OpenAI** adapters first as they are current priorities.
2. Use `Moq` or a similar library (or manual mocks) to simulate the underlying provider SDKs.
3. Ensure no real API calls are made during the execution of these tests.
