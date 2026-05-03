# Prompt 08: API Vector Search Agent & Endpoint (Backend)

**Context:** The PWA now has a "Search" tab intended for an agentic, natural-language search experience. We need the backend capability to perform vector-based semantic searches on recipes using `pgvector` and an AI agent (SearchRecipesAgent).

**Goal:** Implement a natural-language recipe search endpoint that returns semantically relevant matches, identifying a "Top Pick" based on query alignment.

**Instructions:**

1. **Database Schema (pgvector):**
   - Ensure the `recipes` table has a `vector_embedding` column (`vector(1536)` for Gemini or similar).
   - Create a migration to add an HNSW index for efficient vector similarity search.

2. **SearchRecipesAgent Implementation:**
   - Create `api/src/RecipeApi/Services/SearchRecipesAgent.cs`.
   - The agent should:
     - Take a natural language string (e.g., "something spicy with chicken for kids").
     - Use an embedding model (Gemini/Ollama) to generate a vector for the query.
     - Perform a cosine similarity search against the `recipes` table.
     - **Nuance**: If the query contains specific constraints (time, difficulty), the agent should attempt to filter the results before or after vector matching.

3. **API Endpoint:**
   - Add `GET /api/recipes/search?q={query}` to `RecipeController.cs`.
   - Response Structure:
     ```json
     {
       "topPick": { ...recipe data... },
       "results": [ ...other matches... ]
     }
     ```
   - Ensure the "Top Pick" is the highest-scoring vector match that meets any explicit constraints.

4. **Integration with Discovery Signal:**
   - Add `GET /api/discovery/status` which returns `{ hasPendingCards: true/false }`.
   - Logic: Return true if there are any recipes in categories where the user hasn't voted yet.

5. **Verification:**
   - Use `curl` or a test script to verify that "spicy" returns relevant results even if the word "spicy" isn't in the title (semantic matching).
