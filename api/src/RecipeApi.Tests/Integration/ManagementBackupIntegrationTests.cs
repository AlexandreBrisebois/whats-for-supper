using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>
/// Integration tests for ManagementService.BackupAsync():
///   1. Ready recipes (Name + ImageCount > 0) are always backed up, even with no metadata/notes/rating.
///   2. Unready recipes with no payload continue to be skipped.
/// </summary>
public class ManagementBackupIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    private ManagementService _management = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        _management = _scope.ServiceProvider.GetRequiredService<ManagementService>();
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task HistoryRestore_RebuildsAffinityFromCurrentVotesAndCookedEvents()
    {
        var recipe = new Recipe { Name = "Restored supper", IsReady = true, CuisineType = "Italian", ImageCount = 1 };
        _db.Recipes.Add(recipe);
        _db.CalendarEvents.Add(new CalendarEvent { RecipeId = recipe.Id, Date = new(2026, 10, 1), Status = CalendarEventStatus.Cooked });
        _db.RecipeSearchAffinityFacts.Add(new RecipeSearchAffinityFact { RecipeId = recipe.Id, Affinity = 8, LiveVoteContribution = 7 });
        await _db.SaveChangesAsync();
        await _management.BackupAsync();
        await _management.RestoreAsync();
        var fact = await _db.RecipeSearchAffinityFacts.SingleAsync(x => x.RecipeId == recipe.Id);
        Assert.Equal(1, fact.Affinity);
        Assert.Equal(0, fact.LiveVoteContribution);
        Assert.Equal(new DateOnly(2026, 10, 1), fact.LastCookedOn);
    }

    [Fact]
    public async Task WeeklyInterest_BackupExplicitEmptyDoesNotResurrectRemovedHistory()
    {
        var recipe = new Recipe { Name = "History supper", ImageCount = 1 };
        _db.Recipes.Add(recipe);
        _db.WeeklyHouseholdInterests.Add(new WeeklyHouseholdInterest
        {
            RecipeId = recipe.Id, WeekStartDate = new(2026, 10, 5), PositiveCount = 2,
            CloseId = Guid.NewGuid(), CapturedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();
        await _management.BackupAsync();
        var path = Path.Combine(_scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root, "weekly-household-interest.json");
        Assert.True(File.Exists(path));
        var snapshot = await File.ReadAllTextAsync(path);
        Assert.DoesNotContain("familyMember", snapshot, StringComparison.OrdinalIgnoreCase);
        _db.WeeklyHouseholdInterests.RemoveRange(_db.WeeklyHouseholdInterests);
        await _db.SaveChangesAsync();
        await _management.RestoreAsync();
        Assert.Equal(2, Assert.Single(_db.WeeklyHouseholdInterests).PositiveCount);
        _db.WeeklyHouseholdInterests.RemoveRange(_db.WeeklyHouseholdInterests);
        await _db.SaveChangesAsync();
        await _management.BackupAsync();
        _db.WeeklyHouseholdInterests.Add(new WeeklyHouseholdInterest { RecipeId = recipe.Id, WeekStartDate = new(2026, 10, 5), PositiveCount = 9 });
        await _db.SaveChangesAsync();
        await _management.RestoreAsync();
        Assert.Empty(_db.WeeklyHouseholdInterests);
        await _management.RestoreAsync();
        Assert.Empty(_db.WeeklyHouseholdInterests);
    }

    [Fact]
    public async Task BackupAsync_IncludesReadyRecipe_EvenWithNoMetadataOrRating()
    {
        var recipe = new Recipe
        {
            Name = "Pasta",
            ImageCount = 1,
            RawMetadata = null,
            Notes = null,
            Rating = RecipeRating.Unknown,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        await _management.BackupAsync();
        
        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        Assert.True(await store.InfoExistsAsync(recipe.Id), $"recipe.info should have been written for a ready recipe, but was not found in store for {recipe.Id}");
    }

    [Fact]
    public async Task BackupAsync_SkipsUnreadyRecipe_WithNoPayload()
    {
        var recipe = new Recipe
        {
            Name = null,
            ImageCount = 0,
            RawMetadata = null,
            Notes = null,
            Rating = RecipeRating.Unknown,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        await _management.BackupAsync();

        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        Assert.False(await store.InfoExistsAsync(recipe.Id), $"recipe.info should NOT have been written for an unready recipe with no payload, but was found in store for {recipe.Id}");
    }

    [Fact]
    public async Task HistoryBackup_PreservesUnavailableRecipeDependency_AndRotationIntent_OnRepeatedRestore()
    {
        var recipe = new Recipe { Name = "Unavailable supper", DeletedAt = DateTimeOffset.UtcNow,
            RotationHumanOff = true, RotationSource = "Human", CookedSuppressed = true, SupperSuitable = false };
        _db.Recipes.Add(recipe);
        _db.WeeklyHouseholdInterests.Add(new WeeklyHouseholdInterest
        { RecipeId = recipe.Id, WeekStartDate = new(2026, 10, 5), PositiveCount = 2, Selected = true });
        await _db.SaveChangesAsync();
        await _management.BackupAsync();
        _db.WeeklyHouseholdInterests.RemoveRange(_db.WeeklyHouseholdInterests);
        _db.Recipes.Remove(recipe);
        await _db.SaveChangesAsync();
        _db.ChangeTracker.Clear();
        await _management.RestoreAsync();
        await _management.RestoreAsync();
        var restored = await _db.Recipes.IgnoreQueryFilters().SingleAsync(r => r.Id == recipe.Id);
        Assert.NotNull(restored.DeletedAt);
        Assert.False(restored.IsReady);
        Assert.True(restored.RotationHumanOff);
        Assert.Equal("Human", restored.RotationSource);
        Assert.True(restored.CookedSuppressed);
        Assert.False(restored.SupperSuitable);
        Assert.Equal(2, (await _db.WeeklyHouseholdInterests.SingleAsync()).PositiveCount);
    }

    [Theory]
    [InlineData("custom", "Emma’s birthday supper")]
    [InlineData("order_in", "Luigi’s")]
    [InlineData("eating_out", "Try the new café")]
    [InlineData(null, null)]
    public async Task NonCookingCalendarBackup_RestoresCustomAndLegacyPlans(string? kind, string? note)
    {
        var entry = new CalendarEvent
        {
            Id = Guid.NewGuid(), Date = new DateOnly(2026, 10, 12), Status = CalendarEventStatus.Skipped,
            NonCookingKind = kind, NonCookingLabel = note
        };
        _db.CalendarEvents.Add(entry);
        await _db.SaveChangesAsync();
        await _management.BackupAsync();
        var path = Path.Combine(_scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root, "calendar-events.json");
        if (kind == null)
            await File.WriteAllTextAsync(path, System.Text.Json.JsonSerializer.Serialize(new[] { new { id = entry.Id, date = "2026-10-12", status = 3, recipeId = (Guid?)null } }));
        _db.CalendarEvents.Remove(entry);
        await _db.SaveChangesAsync();
        _db.ChangeTracker.Clear();
        await _management.RestoreAsync();
        var restored = _db.CalendarEvents.Single(e => e.Id == entry.Id);
        Assert.Equal(CalendarEventStatus.Skipped, restored.Status);
        Assert.Null(restored.RecipeId);
        Assert.Equal(entry.NonCookingKind, restored.NonCookingKind);
        Assert.Equal(entry.NonCookingLabel, restored.NonCookingLabel);
    }

    [Fact]
    public async Task BackupAndRestore_WritesPureSchemaOrgWithoutCanonicalBackupJson_AndMergesStructuredRecipes()
    {
        var recipeId = Guid.NewGuid();
        var missingMemberId = Guid.NewGuid();
        const string raw = """{"@context":"https://schema.org/","@type":"Recipe","name":"Backup Stew","recipeYield":"6 portions","recipeIngredient":["500 g beef","2 carrots"],"recipeInstructions":[{"@type":"HowToSection","itemListElement":[{"@type":"HowToStep","text":"Braise beef and carrots."}]}]}""";
        var (content, evidence) = StructuredRecipeContentStore.FromSchemaOrg(recipeId, raw, null, null, Guid.NewGuid(), "source");
        var webJson = new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web);

        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Backup Stew",
            AddedBy = missingMemberId,
            ImageCount = 1,
            IsReady = true,
            Servings = 6,
            RawMetadata = raw,
            CanonicalContent = System.Text.Json.JsonSerializer.Serialize(content, webJson),
            FoodMappingEvidence = evidence,
            Ingredients = """["500 g beef","2 carrots"]""",
            Notes = "Original backup note",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();

        await _management.BackupAsync();

        var dataRoot = _scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root;
        Assert.False(File.Exists(Path.Combine(dataRoot, "canonical-backup.json")));

        var store = _scope.ServiceProvider.GetRequiredService<IRecipeStore>();
        var backedUpJson = await store.ReadRecipeJsonAsync(recipeId);
        Assert.NotNull(backedUpJson);
        using (var doc = System.Text.Json.JsonDocument.Parse(backedUpJson))
        {
            Assert.Equal("https://schema.org/", doc.RootElement.GetProperty("@context").GetString());
            Assert.Equal("Recipe", doc.RootElement.GetProperty("@type").GetString());
            Assert.False(doc.RootElement.TryGetProperty("format", out _));
            Assert.False(doc.RootElement.TryGetProperty("backupContentVersion", out _));
        }

        // DisasterRecoveryAsync must recover AddedBy from recipe.info when recipe.json is pure Schema.org Recipe
        var drResult = await _management.DisasterRecoveryAsync();
        Assert.True(drResult.MembersAdded >= 1);

        // Mutate existing structured recipe in DB, then RestoreAsync must merge-update without conflict errors
        var existing = await _db.Recipes.SingleAsync(r => r.Id == recipeId);
        existing.Notes = "Mutated in DB";
        await _db.SaveChangesAsync();
        _db.ChangeTracker.Clear();

        var restoreResult = await _management.RestoreAsync();
        Assert.Equal(0, restoreResult.Errors);
        var merged = await _db.Recipes.AsNoTracking().SingleAsync(r => r.Id == recipeId);
        Assert.Equal("Original backup note", merged.Notes);
        Assert.NotNull(merged.CanonicalContent);
        Assert.Equal(6, merged.Servings);
    }

    [Fact]
    public async Task RestoreAsync_RejectsRetiredWrapperEnvelopesAsLoadErrors_WhileLoadingValidSchemaOrgAndUnversionedLegacyRecipes()
    {
        var store = _scope.ServiceProvider.GetRequiredService<IRecipeStore>();
        var webJson = new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web);

        // 1. Retired backupContentVersion: 1 wrapper
        var v1Id = Guid.Parse("00000001-0000-0000-0000-000000000001");
        await store.WriteInfoAsync(new RecipeInfo { Id = v1Id, Name = "Retired V1", IsReady = true });
        await store.WriteRecipeJsonAsync(v1Id, """{"backupContentVersion":1,"rawMetadata":"{\"@context\":\"https://schema.org/\",\"@type\":\"Recipe\",\"recipeYield\":\"4 portions\",\"recipeIngredient\":[\"1 cup rice\"]}","ingredients":"[\"1 cup rice\"]","servings":4}""");

        // 2. Retired wfs-recipe v2 wrapper
        var v2Id = Guid.Parse("00000002-0000-0000-0000-000000000002");
        const string v2Raw = """{"@context":"https://schema.org/","@type":"Recipe","name":"Retired V2","recipeYield":"4 portions","recipeIngredient":["400 g chicken"]}""";
        var (v2Content, _) = StructuredRecipeContentStore.FromSchemaOrg(v2Id, v2Raw, null, null, Guid.NewGuid(), "source");
        await store.WriteInfoAsync(new RecipeInfo { Id = v2Id, Name = "Retired V2", IsReady = true });
        var v2Envelope = new System.Text.Json.Nodes.JsonObject
        {
            ["format"] = "wfs-recipe",
            ["version"] = 2,
            ["recipeId"] = v2Id,
            ["contentSchemaVersion"] = 2,
            ["contentRevision"] = v2Content.ContentRevision,
            ["content"] = System.Text.Json.JsonSerializer.SerializeToNode(v2Content, webJson),
            ["rawMetadata"] = v2Raw
        }.ToJsonString();
        await store.WriteRecipeJsonAsync(v2Id, v2Envelope);

        // 3. Unknown wrapper envelope
        var unknownId = Guid.Parse("00000003-0000-0000-0000-000000000003");
        await store.WriteInfoAsync(new RecipeInfo { Id = unknownId, Name = "Unknown Wrapper", IsReady = true });
        await store.WriteRecipeJsonAsync(unknownId, """{"format":"custom-wrapper","version":9,"recipeIngredient":["1 cup milk"]}""");

        // 4. Subsequent valid top-level https://schema.org/Recipe document
        var validId = Guid.Parse("00000004-0000-0000-0000-000000000004");
        await store.WriteInfoAsync(new RecipeInfo { Id = validId, Name = "Valid Schema.org Soup", IsReady = true });
        await store.WriteRecipeJsonAsync(validId, """
            {
              "@context": "https://schema.org/",
              "@type": "Recipe",
              "name": "Valid Schema.org Soup",
              "recipeYield": "4 portions",
              "recipeIngredient": ["500 g carrots", "1 L broth"],
              "recipeInstructions": [{ "@type": "HowToSection", "itemListElement": [{ "@type": "HowToStep", "text": "Simmer until tender." }] }]
            }
            """);

        // 5. Unversioned legacy ingredients array (no wrapper keys)
        var legacyArrayId = Guid.Parse("00000005-0000-0000-0000-000000000005");
        await store.WriteInfoAsync(new RecipeInfo { Id = legacyArrayId, Name = "Legacy Array", IsReady = true });
        await store.WriteRecipeJsonAsync(legacyArrayId, """{"ingredients":["2 cups flour","1 tsp salt"]}""");

        // 6. Unversioned legacy serialized ingredients JSON-array string (no wrapper keys)
        var legacyStringId = Guid.Parse("00000006-0000-0000-0000-000000000006");
        await store.WriteInfoAsync(new RecipeInfo { Id = legacyStringId, Name = "Legacy Serialized", IsReady = true });
        await store.WriteRecipeJsonAsync(legacyStringId, """{"ingredients":"[\"1 cup sugar\"]"}""");

        var restoreResult = await _management.RestoreAsync();
        Assert.Equal(3, restoreResult.Errors);

        _db.ChangeTracker.Clear();
        Assert.Null(await _db.Recipes.IgnoreQueryFilters().SingleOrDefaultAsync(r => r.Id == v1Id));
        Assert.Null(await _db.Recipes.IgnoreQueryFilters().SingleOrDefaultAsync(r => r.Id == v2Id));
        Assert.Null(await _db.Recipes.IgnoreQueryFilters().SingleOrDefaultAsync(r => r.Id == unknownId));

        var valid = await _db.Recipes.AsNoTracking().SingleAsync(r => r.Id == validId);
        Assert.NotNull(valid.CanonicalContent);
        Assert.Equal(4, valid.Servings);
        Assert.Contains("500 g carrots", valid.Ingredients);

        var legacyArray = await _db.Recipes.AsNoTracking().SingleAsync(r => r.Id == legacyArrayId);
        Assert.Contains("2 cups flour", legacyArray.Ingredients);

        var legacyString = await _db.Recipes.AsNoTracking().SingleAsync(r => r.Id == legacyStringId);
        Assert.Contains("1 cup sugar", legacyString.Ingredients);
    }
}
