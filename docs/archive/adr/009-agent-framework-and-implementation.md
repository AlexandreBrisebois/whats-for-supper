# ADR 009: Agent Framework & Implementation Strategy

## Status: Proposed

## Context

The "What's For Supper" AI Agents spec (`ai-agents.spec.md`) describes three core agents:
1. **SuggestMealsAgent** — Weekly meal planning with family preferences + constraints
2. **SearchRecipesAgent** — Natural language recipe search with pgvector + re-ranking
3. **CoordinateFamilyAgent** — Shopping list generation and task coordination

However, the specification is ambiguous about:
- **Framework choice**: LangChain.js vs. Semantic Kernel vs. custom implementation
- **Implementation language**: .NET 10 (ecosystem consistency) vs. Node.js (Frontend alignment) vs. Python (AI tooling)
- **Deployment model**: Standalone services vs. embedded in Recipe API vs. Next.js API routes
- **Development timeline**: Phase 5 (late) vs. earlier for search functionality

This ADR resolves these tensions and provides a clear implementation path.

## Decision

### 1. Implementation Language & Environment: .NET 10

**Rationale:**
- **Ecosystem consistency**: Recipe API and Import Worker are already .NET 10 + Native AOT. Centralizing on .NET 10 allows:
  - Shared domain models (e.g., `Recipe`, `FamilyMember`) without serialization boundaries
  - Code reuse for PostgreSQL access, logging, configuration
  - Consistent deployment (chiseled containers, Native AOT, NAS resource budgets)
- **Resource efficiency**: Native AOT agents are as performant as any compiled solution on NAS hardware
- **Development velocity**: One team, one language, one deployment pipeline

**Alternatives rejected:**
- **Node.js/.js**: Aligns with frontend but duplicates backend logic; higher memory footprint
- **Python**: More AI libraries, but heavier runtime; not consistent with NAS efficiency targets
- **LangChain.js abstraction**: Adds unnecessary indirection; binding agents to a specific framework limits optimization

### 2. Framework & Libraries: Built on Standard Libraries (Not LangChain)

**Rationale:**
- **Abstraction-focused, not framework-locked**: Use semantic abstractions (prompts, embeddings, re-ranking) but implement agents using:
  - Standard HTTP clients for Ollama communication
  - PostgreSQL queries for vector search
  - Custom prompt templates (not LangChain chain syntax)
- **Why not LangChain.js initially**:
  - Adds a layer of abstraction that complicates debugging on resource-constrained NAS
  - Semantic Kernel (Microsoft) is better aligned with .NET ecosystem if abstraction becomes critical
  - Most agent logic is **not** LLM-centric (see below); it's database + search logic
- **Abstraction point**: Define a clean `IAgentService` interface. If we need to swap Ollama for cloud models later, the interface isolates that change.

### 3. Agent Architecture: Stateless Query Services (Not "Background Services")

**Key insight**: Agents in Phase 5 are **not background workers** (like Import Worker). They are **synchronous query services** triggered by user actions.

| Agent | Trigger | Input | Output | Latency |
|-------|---------|-------|--------|---------|
| **SuggestMealsAgent** | User clicks "Suggest meals" | None (context from DB) | 5–7 recipe IDs + reasoning | < 5s |
| **SearchRecipesAgent** | User submits natural language query | Query string (e.g., "quick pasta") | Ranked recipe list | < 3s |
| **CoordinateFamilyAgent** | Trigger: recipe added to planner or timer | None (context from DB) | Aggregated shopping list JSON | < 2s |

**Implementation approach**:
1. Each agent is a **service class** in the Recipe API (.NET 10)
2. Agents are exposed via **API endpoints** (`POST /api/agents/suggest`, etc.)
3. No separate agent service needed; agents live in the Recipe API codebase
4. Scaling: If agent latency becomes a bottleneck later, refactor to a dedicated microservice

### 4. Deployment & Scaling

**Phase 5 (Initial)**:
- Agents deployed as part of the Recipe API container
- Single instance, shared Ollama connection
- PostgreSQL for vector store and caching

**Phase 5+ (If needed)**:
- Extract agents to a dedicated `.NET 10 agent service`
- Scale horizontally behind a load balancer
- Caching layer (Redis) for repeated queries
- No code changes; just redistribution of the same binaries

### 5. Ollama as the Local AI Backbone

**Per specs**:
- Ollama provides embeddings (`mistral-embed` or similar)
- Ollama provides re-ranking models (`mistral`, `neural-chat`)
- Gemini API is the fallback for embeddings if Ollama is unavailable

**No LLM orchestration framework needed** because:
- Agents are not chains of LLM calls; they are database queries + one embedding call
- SuggestMealsAgent: Embed family preference → Vector search → Return results
- SearchRecipesAgent: Embed query → Vector search → Rank with Ollama → Return
- CoordinateFamilyAgent: Aggregate database rows → Return

### 6. Development Sequencing

| Phase | Agent | Complexity | Notes |
|-------|-------|-----------|-------|
| **4 (Planner)** | SearchRecipesAgent | Low | Hybrid pgvector + SQL query; critical for Phase 3 discovery, but moved to Phase 4 for planner search bar |
| **5 (Agents)** | SuggestMealsAgent | Medium | Requires family preferences, constraints, ranking |
| **5 (Agents)** | CoordinateFamilyAgent | Low | Simple aggregation; no LLM needed |

**Recommendation**: Consider shipping SearchRecipesAgent in Phase 4 as a "nice-to-have" for planner search, even though agents are officially Phase 5.

## Consequences

### Positive
- **Single tech stack**: All backend services (.NET 10) reduces cognitive overhead
- **Shared infrastructure**: Leverage Recipe API's PostgreSQL, logging, configuration
- **Efficient**: Native AOT agents have minimal memory/CPU footprint
- **Simple deployment**: One Docker Compose service for API+Agents initially; easy to split later

### Negative
- **Not ML-native**: If future phases need sophisticated orchestration (multi-step chains, tool use), we'd need to adopt Semantic Kernel or similar
- **Limited to Ollama + Gemini**: No other LLM providers without code changes (but this is not a gap; Ollama + Gemini cover the use cases)

## Migration & Alternatives

### If Ollama Becomes Unavailable
Switch to cloud embeddings:
- Gemini Embedding API (already integrated for fallback)
- OpenAI Embeddings API
- No code changes to agent logic; only Ollama HTTP client → cloud API swap

### If Semantic Kernel Becomes Necessary
Adopt Microsoft.SemanticKernel package for advanced orchestration:
- Agents remain .NET 10
- Refactor HTTP calls to Ollama into SK plugins
- No architectural change; just a library adoption

## Participants
- **Architect Alex** — Decision owner, infrastructure lead
- **AI Integration Lead** — Agent implementation lead (TBD)

---

## Implementation Checklist (Phase 5)

- [ ] Create `RecipeApi/Services/Agents/` directory structure
- [ ] Implement `SuggestMealsAgent.cs` with embedding + vector search + ranking
- [ ] Implement `SearchRecipesAgent.cs` with hybrid pgvector + SQL + re-ranking
- [ ] Implement `CoordinateFamilyAgent.cs` with ingredient aggregation
- [ ] Create API endpoints: `POST /api/agents/suggest`, `POST /api/agents/search`, `GET /api/agents/shopping-list`
- [ ] Add agent tests (unit + integration with Testcontainers)
- [ ] Update Docker Compose & operations guide
- [ ] Benchmark agent latency on NAS hardware; optimize if needed
