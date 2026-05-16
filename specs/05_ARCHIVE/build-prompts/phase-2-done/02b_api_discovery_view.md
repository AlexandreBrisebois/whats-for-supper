# Prompt 02b: Optimization - Recipe Match View (SQL)

**Context:** The current matchmaking logic remains in C# (`DiscoveryService.IsMatchAsync`). To prepare for the Phase 4 Weekly Planner and improve query performance, we need to move the "50% consensus" calculation into the database.

**Goal:** Implement a PostgreSQL view `vw_recipe_matches` and map it to an EF Core Keyless Entity.

**Instructions:**

1. **Database Migration:**
   - Create a new migration: `dotnet ef migrations add AddRecipeMatchView`.
   - In the `Up` method, use `migrationBuilder.Sql()` to create the view:
     ```sql
     CREATE VIEW vw_recipe_matches AS
     SELECT 
         recipe_id,
         COUNT(*) as like_count
     FROM recipe_votes
     WHERE vote = 1 -- Like
     GROUP BY recipe_id
     HAVING COUNT(*) >= (SELECT COUNT(*) * 0.5 FROM family_members);
     ```
   - Ensure the `Down` method contains `DROP VIEW vw_recipe_matches;`.

2. **Model Implementation:**
   - Create `api/src/RecipeApi/Models/RecipeMatch.cs`:
     - `public Guid RecipeId { get; set; }`
     - `public int LikeCount { get; set; }`

3. **DbContext Configuration:**
   - Update `api/src/RecipeApi/Data/RecipeDbContext.cs`:
     - Add `public DbSet<RecipeMatch> RecipeMatches { get; set; }`.
     - In `OnModelCreating`, configure `RecipeMatches` as a **Keyless Entity** and map it to the view:
       ```csharp
       modelBuilder.Entity<RecipeMatch>()
           .HasNoKey()
           .ToView("vw_recipe_matches")
           .Property(v => v.RecipeId).HasColumnName("recipe_id");
       ```

4. **Service Refactoring:**
   - Update `api/src/RecipeApi/Services/DiscoveryService.cs`:
     - Refactor `IsMatchAsync` to use the new `RecipeMatches` DbSet:
       ```csharp
       public async Task<bool> IsMatchAsync(Guid recipeId)
           => await _dbContext.RecipeMatches.AnyAsync(m => m.RecipeId == recipeId);
       ```

5. **Verification (TDD):**
   - Run `dotnet test api/src/RecipeApi.Tests --filter FullyQualifiedName~DiscoveryServiceTests`.
   - All matchmaking tests MUST pass using the new view-backed logic.
