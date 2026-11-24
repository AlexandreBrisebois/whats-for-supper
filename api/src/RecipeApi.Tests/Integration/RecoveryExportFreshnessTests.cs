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

    [Theory]
    [InlineData(4)]
    [InlineData(3)]
    public async Task ServingsExportRestore_RetainsAuthoritativeCountAndSchemaOrgYield(int count)
    {
        var recipe = new Recipe { Name = "Radiatore", IsSynthesized = true, IsReady = true, Servings = count, Ingredients = "[\"510 g beef\",\"340 g pasta\"]", RawMetadata = "{\"recipeYield\":\"4 portions\"}" };
        Db.Recipes.Add(recipe); await Db.SaveChangesAsync();
        for (var attempt = 0; attempt < 2; attempt++) {
            await Service.BackupAsync();
            var json = JsonDocument.Parse((await Store.ReadRecipeJsonAsync(recipe.Id))!).RootElement;
            Assert.Equal("https://schema.org/", json.GetProperty("@context").GetString());
            Assert.Equal("Recipe", json.GetProperty("@type").GetString());
            Assert.Equal($"{count} portions", json.GetProperty("recipeYield").GetString());
            var infoPath = Path.Combine(_scope.ServiceProvider.GetRequiredService<RecipesRootResolver>().Root, recipe.Id.ToString(), "recipe.info");
            var info = JsonDocument.Parse(await File.ReadAllTextAsync(infoPath)).RootElement;
            Assert.False(info.TryGetProperty("servings", out _)); Assert.False(info.TryGetProperty("recipeYield", out _));
            recipe.Servings = 7; await Db.SaveChangesAsync();
            await Service.RestoreAsync();
            Assert.Equal(count, recipe.Servings);
            Assert.Equal(new[] { "510 g beef", "340 g pasta" }, RecipeService.DeserializeIngredients(recipe.Ingredients));
        }
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
            Assert.Equal("https://schema.org/", json.RootElement.GetProperty("@context").GetString());
            Assert.Equal("Recipe", json.RootElement.GetProperty("@type").GetString());
            Assert.Equal("New", json.RootElement.GetProperty("name").GetString());
            Assert.Equal("new", json.RootElement.GetProperty("recipeIngredient")[0].GetString());
        }
        recipe.Ingredients = null;
        recipe.RawMetadata = null;
        await Db.SaveChangesAsync();
        await Service.BackupAsync();
        using var cleared = JsonDocument.Parse((await Store.ReadRecipeJsonAsync(recipe.Id))!);
        Assert.Equal("https://schema.org/", cleared.RootElement.GetProperty("@context").GetString());
        Assert.Equal("Recipe", cleared.RootElement.GetProperty("@type").GetString());
        Assert.Empty(cleared.RootElement.GetProperty("recipeIngredient").EnumerateArray());
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
            var saved = await Db.Recipes.SingleAsync(r => r.Id == recipe.Id);
            using var doc = JsonDocument.Parse(saved.RawMetadata!);
            Assert.Equal("https://schema.org/", doc.RootElement.GetProperty("@context").GetString());
            Assert.Equal("Recipe", doc.RootElement.GetProperty("@type").GetString());
            Assert.False(doc.RootElement.TryGetProperty("rawMetadata", out _));
            Assert.False(doc.RootElement.TryGetProperty("backupContentVersion", out _));
        }
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
