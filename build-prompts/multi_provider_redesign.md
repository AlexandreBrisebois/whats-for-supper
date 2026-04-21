# Multi-Provider AI Architecture Redesign Prompt

This prompt is designed to be handed to an AI assistant (like Antigravity or Claude) to complete the architectural refactoring of the Recipe API.

---

## Context
The current `.NET 10` Recipe API uses `Microsoft.Extensions.AI` (`IChatClient`) for agent logic. However, the registration in `Program.cs` is hardcoded to use an `OpenAIClient` pointing to a local Ollama instance. This has caused two major issues:
1. **Stability**: Ollama's non-standard `finish_reason` values (like "load") cause the strict OpenAI SDK to crash with an `ArgumentOutOfRangeException`.
2. **Inflexibility**: There is no easy way to switch between local Ollama, cloud OpenAI, or Gemini.

## The Task
Refactor the AI infrastructure to a "Multi-Provider" setup.

### 1. Configuration Setup
Update `appsettings.Development.json` to support multiple providers:
```json
"AgentSettings": {
  "Provider": "Ollama", 
  "ModelId": "gemma4:e4b",
  "Ollama": { "Endpoint": "http://localhost:11434/v1" },
  "OpenAI": { "ApiKey": "...", "ModelId": "gpt-4o" },
  "Gemini": { "ApiKey": "...", "ModelId": "gemini-1.5-flash" }
}
```

### 2. Infrastructure (Program.cs)
Implement a `OllamaCompatibilityPolicy` (PipelinePolicy) to sanitize the `finish_reason` in raw JSON responses from Ollama by replacing unknown values with `"stop"`.

Use a `switch` statement in `Program.cs` to register the `IChatClient` based on the configuration:
- **Ollama**: Use `OpenAIClient` + local endpoint + `OllamaCompatibilityPolicy`.
- **OpenAI**: Use `OpenAIClient` + official endpoint + ApiKey.
- **Gemini**: Use `OpenAIClient` + Gemini's OpenAI-compatible endpoint + ApiKey.

### 3. Agent Stability
Ensure the `RecipeHeroAgent` is optimized:
- Check for `.jpg`, `.png`, `.webp`, `.jpeg` before calling Gemini.
- Implement a **Soft Fail**: If Gemini is under high demand (Gemini 500), log a warning and let the import finish (syncing metadata) instead of throwing an exception.

---

## Technical Reference
Root Path: `/Users/alex/Code/whats-for-supper/api`
Key Files:
- `Program.cs` (Registration)
- `RecipeHeroAgent.cs` (Stability & Checks)
- `appsettings.Development.json` (Config)
