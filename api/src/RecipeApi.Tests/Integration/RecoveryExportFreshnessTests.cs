using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class RecoveryExportFreshnessTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext Db => _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
    private ManagementService Service => _scope.ServiceProvider.GetRequiredService<ManagementService>();
    private IRecipeStore Store => _scope.ServiceProvider.GetRequiredService<IRecipeStore>();
    private string Root => _scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["Tests:LocalRecipeStore"] = "true" });
        _scope = _factory.Services.CreateScope();
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task RepeatedExport_RefreshesMembersAndRemovesDeletedMembership()
    {
        await Service.BackupAsync();
        var member = await Db.FamilyMembers.SingleAsync();
        member.Name = "Updated name";
        member.BrowseViewMode = "list";
        member.PreferredLanguage = "fr";
        await Db.SaveChangesAsync();
        await Service.BackupAsync();
        using (var json = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(Root, "family-members.json"))))
        {
            var saved = Assert.Single(json.RootElement.EnumerateArray());
            Assert.Equal("Updated name", saved.GetProperty("name").GetString());
            Assert.Equal("list", saved.GetProperty("browseViewMode").GetString());
            Assert.Equal("fr", saved.GetProperty("preferredLanguage").GetString());
        }
        Db.FamilyMembers.Remove(member);
        await Db.SaveChangesAsync();
        await Service.BackupAsync();
        using var empty = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(Root, "family-members.json")));
        Assert.Empty(empty.RootElement.EnumerateArray());
    }

    [Fact]
    public async Task RepeatedExport_RefreshesAndClearsContentWithoutChangingMedia()
    {
        var recipe = new Recipe { Name = "Soup", IsSynthesized = true, Ingredients = "[\"old\"]", RawMetadata = "{\"name\":\"Old\"}" };
        Db.Recipes.Add(recipe);
        await Db.SaveChangesAsync();
        await Store.SaveHeroImageAsync(recipe.Id, new MemoryStream([7, 8, 9]));
        await Service.BackupAsync();
        recipe.Ingredients = "[\"new\"]";
        recipe.RawMetadata = "{\"name\":\"New\"}";
        await Db.SaveChangesAsync();
        await Service.BackupAsync();
        using (var json = JsonDocument.Parse((await Store.ReadRecipeJsonAsync(recipe.Id))!))
        {
            Assert.Equal(recipe.Ingredients, json.RootElement.GetProperty("ingredients").GetString());
            Assert.Equal(recipe.RawMetadata, json.RootElement.GetProperty("rawMetadata").GetString());
        }
        recipe.Ingredients = null;
        recipe.RawMetadata = null;
        await Db.SaveChangesAsync();
        await Service.BackupAsync();
        using var cleared = JsonDocument.Parse((await Store.ReadRecipeJsonAsync(recipe.Id))!);
        Assert.Equal(JsonValueKind.Null, cleared.RootElement.GetProperty("ingredients").ValueKind);
        Assert.Equal(JsonValueKind.Null, cleared.RootElement.GetProperty("rawMetadata").ValueKind);
        var hero = await Store.ReadHeroImageAsync(recipe.Id);
        await using var stream = hero!.Value.Stream;
        using var bytes = new MemoryStream();
        await stream.CopyToAsync(bytes);
        Assert.Equal(new byte[] { 7, 8, 9 }, bytes.ToArray());
    }

    [Fact]
    public async Task RepeatedExport_ReplacesClearedPlanningTablesWithEmptyArrays()
    {
        Db.WeeklyPlans.Add(new WeeklyPlan { WeekStartDate = new(2026, 10, 12) });
        Db.CalendarEvents.Add(new CalendarEvent { Date = new(2026, 10, 12), Status = CalendarEventStatus.Skipped });
        await Db.SaveChangesAsync();
        await Service.BackupAsync();
        Db.WeeklyPlans.RemoveRange(Db.WeeklyPlans);
        Db.CalendarEvents.RemoveRange(Db.CalendarEvents);
        await Db.SaveChangesAsync();
        await Service.BackupAsync();
        foreach (var name in new[] { "weekly-plans.json", "calendar-events.json" })
        {
            using var json = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(Root, name)));
            Assert.Empty(json.RootElement.EnumerateArray());
        }
    }

    [Theory]
    [InlineData("en-US")]
    [InlineData("fr-FR")]
    public async Task CategoryRoundTrip_PreservesQuotedMultilineFieldsAndConfidence(string culture)
    {
        var previous = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo(culture);
            var category = new IngredientCategory
            {
                NormalizedKey = "pepper, \"sweet\"\nred", GrocerySection = "Produce",
                Confidence = 0.875, Source = "manual\r\nfamily", CreatedAt = DateTimeOffset.UtcNow
            };
            Db.IngredientCategories.Add(category);
            await Db.SaveChangesAsync();
            await Service.BackupAsync();
            Db.IngredientCategories.Remove(category);
            await Db.SaveChangesAsync();
            await Service.RestoreAsync();
            var restored = Assert.Single(await Db.IngredientCategories.ToListAsync());
            Assert.Equal(category.NormalizedKey, restored.NormalizedKey);
            Assert.Equal(category.Source, restored.Source);
            Assert.Equal(category.Confidence, restored.Confidence);
        }
        finally { CultureInfo.CurrentCulture = previous; }
    }

    [Fact]
    public async Task CurrentContentRoundTrip_DoesNotNestRawMetadataOnRepeatedRestore()
    {
        const string metadata = "{\"recipeInstructions\":[\"Simmer gently\"]}";
        var recipe = new Recipe { Name = "Soup", IsSynthesized = true, IsReady = true, RawMetadata = metadata, Ingredients = "[\"water\"]" };
        Db.Recipes.Add(recipe);
        await Db.SaveChangesAsync();
        for (var attempt = 0; attempt < 2; attempt++)
        {
            await Service.BackupAsync();
            await Service.RestoreAsync();
            Assert.Equal(metadata, (await Db.Recipes.SingleAsync(r => r.Id == recipe.Id)).RawMetadata);
        }
    }

    [Fact]
    public async Task ExportedContent_RemainsReadableByDiskSyncWorkflow()
    {
        const string metadata = "{\"recipeInstructions\":[\"Simmer gently\"]}";
        var recipe = new Recipe { Name = "Soup", IsSynthesized = true, IsReady = true, RawMetadata = metadata, Ingredients = "[\"water\"]" };
        Db.Recipes.Add(recipe);
        await Db.SaveChangesAsync();
        await Service.BackupAsync();
        var processor = new SyncRecipeProcessor(Db,
            new RecipeRepository(_scope.ServiceProvider.GetRequiredService<IStorageProvider>()),
            _scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>(),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<SyncRecipeProcessor>.Instance);
        await processor.ExecuteAsync(new WorkflowTask { Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id }) }, CancellationToken.None);
        Assert.Equal(metadata, recipe.RawMetadata);
        Assert.Equal("[\"water\"]", recipe.Ingredients);
    }

    [Theory]
    [InlineData("2", "null")]
    [InlineData("1", "42")]
    public async Task InvalidContentEnvelope_IsSkippedWithoutOverwritingRecipe(string version, string raw)
    {
        var recipe = new Recipe { Name = "Retained", IsSynthesized = true, Notes = "Keep me" };
        Db.Recipes.Add(recipe);
        await Db.SaveChangesAsync();
        await Store.WriteRecipeJsonAsync(recipe.Id,
            $"{{\"backupContentVersion\":{version},\"rawMetadata\":{raw},\"name\":\"Invalid\"}}");
        var result = await Service.RestoreAsync();
        Assert.Equal(1, result.Errors);
        Assert.Equal("Retained", (await Db.Recipes.SingleAsync(r => r.Id == recipe.Id)).Name);
        Assert.Equal("Keep me", recipe.Notes);
    }
}
