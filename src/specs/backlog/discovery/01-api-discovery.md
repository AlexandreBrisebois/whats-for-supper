# Discovery Prompt: Recipe API Architecture & Identity

## Background
You are a Senior Software Architect. You are in the "Discovery & Design" phase for the **Recipe API** of "What's For Supper". Your goal is to finalize the technical specifications before implementation begins.

## Objective
Review the following documents and define the missing architectural details:
- [recipe-api.spec.md](file:///Users/alex/Code/whats-for-supper/src/specs/recipe-api.spec.md)
- [002-recipe-api-architecture.md](file:///Users/alex/Code/whats-for-supper/src/specs/decisions/002-recipe-api-architecture.md)
- [005-recipe-metadata-schema.md](file:///Users/alex/Code/whats-for-supper/src/specs/decisions/005-recipe-metadata-schema.md)

## Missing Definitions to Resolve
1. **Identity Handshake**: Define exactly how the PWA communicates the `addedBy` family member ID to the API. Should we use a custom Header (e.g., `X-Family-Member-Id`) or a simple token-less session?
2. **Error Handling & Redis Reliability**: Define the behavior if Redis is unavailable during an upload. Should the API fail the request, or store the `recipe.info` and retry the notification via a background task?
3. **API Documentation**: Propose a strategy for API discovery (e.g., Swagger/OpenAPI) that works with .NET 10 Native AOT.

## Deliverable
Do NOT write code. Instead, produce:
1. An **Update** to `recipe-api.spec.md` with the finalized Identity protocol and Error handling logic.
2. A **New ADR** (`008-api-identity-and-reliability.md`) justifying these decisions.
