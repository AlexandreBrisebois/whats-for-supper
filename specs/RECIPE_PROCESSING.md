# Recipe Processing & Discovery Service Architecture

**Status**: ACTIVE  
**Last Updated**: 2026-04-21  
**Owner**: Alexandre Brisebois  

This document covers the recipe processing pipeline, difficulty inference logic, and discovery service behavior established in commit `fa73608`.

---

## 1. Recipe Processing Pipeline (Phase 1)

The `RecipeImportWorker` executes a multi-stage pipeline to transform user-uploaded recipes into discoverable, AI-enriched items.

### 1.1 Pipeline Stages

```
┌──────────────────────────────────────────────────────────────┐
│ Phase 0: User Captures Recipe (PWA)                          │
│  - Uploads image + metadata to /api/recipes                  │
│  - Backend stores image in volume, creates Recipe record     │
└─────────────────────┬──────────────────────────────────────┘
                      │ RecipeImportWorker (30-second poll)
┌─────────────────────▼──────────────────────────────────────┐
│ Stage 1: Extraction (RecipeExtractionAgent)                 │
│  - Parse image → extract ingredients, instructions          │
│  - Write recipe.json (Schema.org format) to disk             │
│  - Set import status = Extracted                             │
└─────────────────────┬──────────────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────────────┐
│ Stage 2: Hero Image (RecipeHeroAgent)                       │
│  - Generate optimized hero image (or resize original)        │
│  - Write hero.jpg to disk                                    │
│  - Set import status = HeroGenerated                         │
└─────────────────────┬──────────────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────────────┐
│ Stage 3: Sync to Database (SyncDiskToDb)                    │
│  - Read recipe.json from disk                               │
│  - Parse ingredients, infer difficulty                      │
│  - Update Recipe record with metadata                       │
│  - Set import status = Completed                            │
│  - Delete import record                                     │
└─────────────────────┬──────────────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────────────┐
│ Phase 1: Discovery (DiscoveryService)                        │
│  - Filter by IsDiscoverable = true                          │
│  - Match recipes to family members                          │
│  - /api/discovery serves matched recipes                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. RecipeImportWorker Design

### 2.1 Polling Strategy

**Decision**: 30-second poll interval for pending imports.

**Why**:
- Long enough to not hammer the database (10x per 5 minutes).
- Short enough to feel responsive to users (recipe shows up within ~30s).
- Tradeoff: Batch processing of multiple imports in a single poll cycle.

**Implementation** ([api/src/RecipeApi/Services/RecipeImportWorker.cs:16](../api/src/RecipeApi/Services/RecipeImportWorker.cs#L16)):
```csharp
private readonly TimeSpan _pollingInterval = TimeSpan.FromSeconds(30);
```

### 2.2 Error Handling & Resilience

**Decision**: Per-import try/catch with status tracking. Failed imports are marked `Failed` and never retried automatically.

**Why**:
- One bad image shouldn't block processing of other imports.
- Manual inspection of failed imports (via database) allows debugging.
- If extraction agent is down, the import stops gracefully (not a cascade failure).

**Implementation** ([api/src/RecipeApi/Services/RecipeImportWorker.cs:56-95](../api/src/RecipeApi/Services/RecipeImportWorker.cs#L56-L95)):
```csharp
foreach (var import in pendingImports)
{
    try
    {
        import.Status = RecipeImportStatus.Processing;
        await db.SaveChangesAsync(stoppingToken);

        // Run Agents
        await extractionAgent.ExtractRecipe(import.RecipeId);
        await heroAgent.CreateHeroImageAsync(import.RecipeId);
        await SyncDiskToDb(import.RecipeId, db, scope, stoppingToken);

        // Cleanup: Delete the import record on success
        db.RecipeImports.Remove(import);
        await db.SaveChangesAsync(stoppingToken);
    }
    catch (Exception ex)
    {
        // Mark as Failed, log error, continue processing other imports
        import.Status = RecipeImportStatus.Failed;
        import.ErrorMessage = ex.Message;
        await db.SaveChangesAsync(stoppingToken);
    }
}
```

---

## 3. Disk-to-Database Sync (SyncDiskToDb)

### 3.1 Metadata Sources & Precedence

The sync process reads from multiple sources with a defined precedence:

| Source | Format | When Used | Precedence |
|--------|--------|-----------|-----------|
| `recipe.json` | Schema.org (extracted by AI) | Primary data | 2nd for name/time |
| `recipe.info` | Custom JSON (manual edits or AI-generated) | Optional overrides | 1st (overrides recipe.json) |
| Database defaults | Null/empty strings | Missing data | Last resort |

**Precedence Order** ([api/src/RecipeApi/Services/RecipeImportWorker.cs:136-172](../api/src/RecipeApi/Services/RecipeImportWorker.cs#L136-L172)):

1. **recipe.info** (if exists) — User/AI-curated overrides
2. **recipe.json** — AI extraction output
3. **Database defaults** — If both above are missing

**Implementation**:
```csharp
// Step 1: Sync from recipe.json (AI metadata)
if (!string.IsNullOrWhiteSpace(recipeData.Name))
{
    recipe.Name = recipeData.Name;
}

// Step 2: Sync from recipe.info (Manual edits or AI refinements) — OVERRIDES recipe.json
if (File.Exists(recipeInfoPath))
{
    var recipeInfo = JsonSerializer.Deserialize<RecipeInfo>(recipeInfoJson);
    
    // Name in recipe.info takes precedence
    if (!string.IsNullOrWhiteSpace(recipeInfo?.Name))
    {
        recipe.Name = recipeInfo.Name;  // ← Overwrites recipe.json value
    }
    if (!string.IsNullOrWhiteSpace(recipeInfo?.Description))
    {
        recipe.Description = recipeInfo.Description;  // ← New field
    }
}
```

**Why**:
- Users or admins might manually fix extracted data.
- `recipe.info` acts as a "correction layer" without deleting the original extraction.
- Maintains audit trail (both files exist on disk).

### 3.2 Ingredient JSON Storage

**Decision**: Store raw JSON from `recipeIngredient` (Schema.org) or fallback to legacy `ingredients` field.

**Why**:
- Schema.org is the web standard; extraction agents produce it.
- Fallback handles legacy recipes or non-standard formats.
- Raw JSON allows future queries on ingredients (search, allergen filtering, etc.).

**Implementation** ([api/src/RecipeApi/Services/RecipeImportWorker.cs:121-133](../api/src/RecipeApi/Services/RecipeImportWorker.cs#L121-L133)):
```csharp
if (root.TryGetProperty("recipeIngredient", out var ingProp) && 
    ingProp.ValueKind == JsonValueKind.Array)
{
    recipe.Ingredients = ingProp.GetRawText();
}
else if (root.TryGetProperty("ingredients", out var legacyIngProp) && 
         legacyIngProp.ValueKind == JsonValueKind.Array)
{
    recipe.Ingredients = legacyIngProp.GetRawText();
}
else
{
    recipe.Ingredients = "[]";  // Empty array as default
}
```

---

## 4. DiscoveryService: Difficulty Inference

### 4.1 Inference Algorithm

**Decision**: Classify recipes into 3 difficulty tiers (Easy, Medium, Hard) based on ingredient count and prep time.

**Algorithm** ([api/src/RecipeApi/Services/DiscoveryService.cs:59-72](../api/src/RecipeApi/Services/DiscoveryService.cs#L59-L72)):

```
if (ingredients < 5 AND time < 20 min)  → Easy
if (ingredients > 12 OR time > 45 min)  → Hard
else                                     → Medium
```

**Thresholds**:
- **Easy**: ≤ 4 ingredients AND ≤ 19 minutes
- **Hard**: > 12 ingredients OR > 45 minutes
- **Medium**: Everything else (5–12 ingredients, 20–45 minutes)

**Implementation**:
```csharp
public string InferDifficulty(int ingredientCount, int prepTimeMinutes)
{
    if (ingredientCount < 5 && prepTimeMinutes < 20)
        return "Easy";
    if (ingredientCount > 12 || prepTimeMinutes > 45)
        return "Hard";
    return "Medium";
}
```

### 4.2 Why This Heuristic?

- **Simple**: No ML/AI required; deterministic and fast.
- **Intuitive**: More ingredients → more complex; longer prep → more involved.
- **Flexible**: Thresholds can be tuned without code changes (future: add ConfigurationService).
- **Future-proof**: Can be enhanced with user feedback ("Users say this is too easy") to refine weights.

### 4.3 ISO 8601 Duration Parsing

**Decision**: Parse `totalTime` using `System.Xml.XmlConvert.ToTimeSpan()`.

**Why**:
- Schema.org uses ISO 8601 durations (e.g., `PT30M`, `PT1H10M`).
- .NET standard library handles parsing; no external dependencies.
- Fallback to 0 minutes if parsing fails (graceful degradation).

**Implementation** ([api/src/RecipeApi/Services/DiscoveryService.cs:79-90](../api/src/RecipeApi/Services/DiscoveryService.cs#L79-L90)):
```csharp
private int ParseIso8601Duration(string? duration)
{
    if (string.IsNullOrEmpty(duration)) return 0;

    try
    {
        var timeSpan = System.Xml.XmlConvert.ToTimeSpan(duration);
        return (int)timeSpan.TotalMinutes;
    }
    catch
    {
        return 0;  // Fallback: treat missing/invalid duration as 0 min
    }
}
```

**Examples**:
- `PT30M` → 30 minutes
- `PT1H10M` → 70 minutes
- `null` or invalid → 0 minutes

---

## 5. Discovery Service: Voting & Matching

### 5.1 Vote Storage

**Decision**: Store votes as immutable records; updates replace the vote for the same user+recipe pair.

**Why**:
- Track user preferences over time (future analytics).
- Upsert pattern (replace vote if exists, insert if new) is simpler than merge logic.

**Implementation** ([api/src/RecipeApi/Services/DiscoveryService.cs:38-55](../api/src/RecipeApi/Services/DiscoveryService.cs#L38-L55)):
```csharp
public async Task SubmitVoteAsync(Guid recipeId, Guid familyMemberId, VoteType vote)
{
    var existingVote = await _dbContext.RecipeVotes
        .FirstOrDefaultAsync(v => v.RecipeId == recipeId && v.FamilyMemberId == familyMemberId);

    if (existingVote != null)
    {
        existingVote.Vote = vote;  // Update existing
        existingVote.VotedAt = DateTimeOffset.UtcNow;
    }
    else
    {
        _dbContext.RecipeVotes.Add(new RecipeVote { /* ... */ });
    }

    await _dbContext.SaveChangesAsync();
}
```

### 5.2 Recipe Filtering (Discovery Feed)

**Decision**: Filter recipes by:
1. `IsDiscoverable = true` (manually curated or auto-flagged)
2. No existing vote from this user (avoid re-showing voted recipes)
3. Optional category filter

**Why**:
- Prevents showing the same recipe twice (better UX).
- Allows "hiding" recipes from discovery without deleting them.
- Enables category-based browsing (future: "Show me pasta recipes").

**Implementation** ([api/src/RecipeApi/Services/DiscoveryService.cs:9-33](../api/src/RecipeApi/Services/DiscoveryService.cs#L9-L33)):
```csharp
public async Task<List<Recipe>> GetRecipesForDiscoveryAsync(Guid familyMemberId, string? category = null)
{
    var query = _dbContext.Recipes
        .Where(r => r.IsDiscoverable)
        .Where(r => !_dbContext.RecipeVotes.Any(v => 
            v.RecipeId == r.Id && v.FamilyMemberId == familyMemberId));

    if (!string.IsNullOrEmpty(category))
    {
        query = query.Where(r => r.Category == category);
    }

    return await query.ToListAsync();
}
```

---

## 6. Database Schema Migrations

### 6.1 Phase 1 Addition: RecipeNameAndTotalTime

**Decision**: Add `Name` and `TotalTime` columns to `Recipe` table.

**Why**:
- `Name` was missing; now recipes have human-readable titles.
- `TotalTime` is required for difficulty inference.
- These come from AI extraction (`recipe.json`).

**Migration** ([api/Migrations/20260421200251_AddRecipeNameAndTotalTime.cs](../api/Migrations/20260421200251_AddRecipeNameAndTotalTime.cs)):
```csharp
migrationBuilder.AddColumn<string>(
    name: "Name",
    table: "recipes",
    type: "text",
    nullable: true);

migrationBuilder.AddColumn<string>(
    name: "TotalTime",
    table: "recipes",
    type: "text",
    nullable: true);
```

---

## 7. RecipeImportWorker Lifecycle

### 7.1 Startup

The worker is registered as a `BackgroundService` in `Program.cs`:

```csharp
services.AddHostedService<RecipeImportWorker>();
```

**When it starts**:
- Application startup
- Immediately begins polling for pending imports

### 7.2 Shutdown

The worker responds to `CancellationToken` (graceful shutdown):

```csharp
while (!stoppingToken.IsCancellationRequested && 
       await timer.WaitForNextTickAsync(stoppingToken))
{
    await ProcessPendingImports(stoppingToken);
}
// Loop exits, worker stops
```

**When it stops**:
- Application shutdown (e.g., `docker stop`)
- Waits for current imports to finish (graceful shutdown, ~30s timeout)

---

## 8. Testing Strategy

### 8.1 Unit Tests

Test difficulty inference in isolation:
```csharp
[Fact]
public void InferDifficulty_SimpleDish_ReturnsEasy()
{
    var result = _service.InferDifficulty(3, 15);
    Assert.Equal("Easy", result);
}
```

### 8.2 Integration Tests

Test the full pipeline with a test database:
- Create a recipe import
- Verify worker processes it
- Check recipe metadata in database

(Example test patterns in `api/src/RecipeApi.Tests/`)

---

## 9. Future Enhancements

| Idea | Status | Notes |
|------|--------|-------|
| Difficulty tuning via config | Planned | Allow admins to adjust thresholds without redeploying |
| Ingredient-based search | Backlog | Use `Ingredients` JSON for allergen/dietary filtering |
| User feedback on difficulty | Backlog | Let users rate difficulty; refine algorithm weights |
| Batch import from CSV | Backlog | Upload multiple recipes at once |
| Async retries | Backlog | Retry failed imports after manual fix |

---

## 10. Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-04-21 | Alexandre Brisebois | Initial recipe processing & discovery design doc. 30-second polling, difficulty inference, metadata precedence, vote upsert. |

---

