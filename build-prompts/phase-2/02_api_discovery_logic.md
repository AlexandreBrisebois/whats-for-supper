# Prompt 02: API Discovery Services & Match Logic (TDD)

**Context:** The schema is ready. Now we need the logic to serve recipes for discovery (filtering out what the user has already seen) and to identify "Matches" (recipes with enough positive votes).

**Goal:** Implement the Discovery service, voting endpoints, and difficulty inference logic.

**Design Decision: Hybrid Discovery Architecture**
- **Discovery Stack (API):** We use direct EF Core queries on the `Recipes` table instead of a Database View. This allows for dynamic, user-specific filtering (e.g., "exclude recipes already voted on by the current family member") which is difficult to implement efficiently in static Postgres views.
- **Matchmaking (View):** We use a Database View (`vw_recipe_matches`) for consensus logic. Aggregating votes across the entire family to check the 50% threshold is a complex computation best handled by the database engine.

**Instructions:**

1. **Test First (TDD):**
   - Create `api/src/RecipeApi.Tests/Services/DiscoveryServiceTests.cs`.
   - Implement a test that verifies `GetRecipesForDiscoveryAsync` returns only recipes the member hasn't voted on yet.
   - Implement a test for **Match Logic**: 
     - A recipe should be identified as a "Match" when it has received a "Like" vote from **50% or more** of total active family members.
   - Implement a test for **Difficulty Inference**: 
     - If a recipe has < 5 ingredients and < 20 min prep time, it should be inferred as "Easy".
     - If a recipe has > 12 ingredients or > 45 min prep time, it should be inferred as "Hard".
     - Otherwise, "Medium".
   - Implement a test for **Category Listing**: `GetAvailableCategoriesAsync` should only return categories that have unvoted discoverable recipes for the current member.

2. **Discovery Service Implementation:**
   - Create `api/src/RecipeApi/Services/DiscoveryService.cs`.
   - `GetRecipesForDiscoveryAsync(Guid familyMemberId, string category)`:
     - Returns `IsDiscoverable` recipes in the specified category NOT yet voted on by `familyMemberId`.
   - `GetAvailableCategoriesAsync(Guid familyMemberId)`:
     - Returns distinct `Category` names from `IsDiscoverable` recipes where the member has not voted.
   - `SubmitVoteAsync(Guid recipeId, Guid familyMemberId, Vote vote)`

3. **Controller Updates:**
   - Update `api/src/RecipeApi/Controllers/DiscoveryController.cs`.
   - `GET /api/discovery/categories`: Calls service to list unvoted categories.
   - `GET /api/discovery?category={category}`: Returns discovery stack for the requested category.
   - `POST /api/discovery/{id}/vote`: Accepts a vote payload.

4. **Verification:**
   - Run `dotnet test api/src/RecipeApi.Tests` to verify the logic.
   - Verify the `X-Family-Member-Id` header is used to identify the voter.
