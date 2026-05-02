# Prompt 09: PWA Agentic Search Integration (Frontend)

**Context:** The backend search endpoint `/api/recipes/search` is now available. We need to replace the mocked logic in the `/recipes` page with a real integration that communicates with the `SearchRecipesAgent`.

**Goal:** Connect the `/recipes` page to the agentic search backend and implement a high-fidelity "Top Pick" UI.

**Instructions:**

1. **API Client Update:**
   - Add `searchRecipes(query: string)` to `pwa/src/lib/api/recipes.ts`.
   - Ensure it handles the new response structure containing `topPick` and `results`.

2. **Search Logic in `/recipes/page.tsx`:**
   - Implement a "Debounced Search" effect: Wait 500ms after the user stops typing before triggering the API call.
   - Show a "Sparkle" loading state or a subtle pulse on the search bar while the agent is "thinking" (generating embeddings).

3. **"Top Pick" Hero Component:**
   - Refine the Hero card to use real data from the `topPick` response.
   - Add a "Semantic Match" reason if the backend provides one (optional but recommended for that "Agentic" feel).
   - Ensure the image uses the proxy URL: `${API_BASE_URL}/api/recipes/${id}/hero`.

4. **Result Grid:**
   - Render the `results` list below the Top Pick.
   - Use the "Solar Earth" card style established in `TonightMenuCard`.

5. **Visual Polish:**
   - Add a "No results found" state that suggests a different query or offers to "Capture a new recipe" as a fallback.
   - Ensure the "Magnifying Glass" icon remains classic as per the design decision.

6. **Verification:**
   - Run Playwright tests to ensure that typing a query populates the results and highlights the Top Pick correctly.
