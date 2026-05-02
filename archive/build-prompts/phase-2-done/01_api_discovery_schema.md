# Prompt 01: API Discovery Schema & Migration (TDD)

**Context:** We are moving away from hardcoded mock data for the Discovery page. We need to evolve the API to support a curated "Inspiration Pool" where family members can vote on recipes.

**Goal:** Implement the database schema changes to support discoverable recipes and family-member voting.

**Instructions:**

1. **Test First (TDD):**
   - Create a new test file `api/src/RecipeApi.Tests/Models/RecipeDiscoveryTests.cs`.
   - Implement a test that verifies a `Recipe` can be marked as `IsDiscoverable` and assigned a `Category` and `Difficulty`.
   - Implement a test that verifies a `RecipeVote` can be persisted for a specific `RecipeId` and `FamilyMemberId`.

2. **Model Implementation:**
   - Update `api/src/RecipeApi/Models/Recipe.cs`:
     - Add `bool IsDiscoverable` (Default: `false`).
     - Add `string? Category` (e.g., "Meat", "Fish", "Pasta").
     - Add `string? Difficulty` (e.g., "Easy", "Medium", "Hard").
   - Create `api/src/RecipeApi/Models/RecipeVote.cs`:
     - `RecipeId` (Guid)
     - `FamilyMemberId` (Guid)
     - `Vote` (Enum: `Like` = 1, `Skip` = 2)
     - `VotedAt` (DateTimeOffset)

3. **DbContext Configuration:**
   - Update `api/src/RecipeApi/Data/RecipeDbContext.cs`:
     - Add `DbSet<RecipeVote> RecipeVotes`.
     - Configure the composite key for `RecipeVote` (RecipeId, FamilyMemberId).
     - Add indexes for performance on `IsDiscoverable` and `Category`.

4. **Migration:**
   - Generate a new EF Core migration: `dotnet ef migrations add AddDiscoveryAndVoting`.

5. **Verification:**
   - Run `dotnet test api/src/RecipeApi.Tests` to ensure all new tests pass.
   - Run `task build` to ensure project consistency.
