using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class RecipeShareCanonicalTests
{
    [Fact]
    public async Task OrdinaryShareImport_PublishesCanonicalTextWithoutInventingQuantityOrBasis()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var client = factory.CreateClient();
        var id = Guid.NewGuid();
        var bundle = new
        {
            version = "1.0",
            recipe = new { name = "Shared pasta", ingredients = new[] { "200 g pasta", "salt to taste" },
                instructions = new[] { new { name = "Cook", itemListElement = new[] { new { text = "Cook 200 g pasta for 10 minutes." } } } },
                sourceUrl = "https://example.test/shared", isSynthesized = false },
            info = new { bundleSource = "wfs-share", recipeId = id, exportedAtUtc = DateTimeOffset.UtcNow },
            originals = Array.Empty<object>()
        };
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/recipes/import-bundle") { Content = JsonContent.Create(bundle) };
        request.Headers.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        var canonical = StructuredRecipeContentStore.Read(saved);
        Assert.NotNull(canonical);
        Assert.Null(canonical.Servings);
        Assert.Equal(2, canonical.IngredientLines.Count);
        Assert.Equal("pasta", canonical.IngredientLines[0].Description);
        Assert.NotNull(canonical.IngredientLines[0].Amount);
        Assert.Equal("200", canonical.IngredientLines[0].Amount!.Value!.N);
        Assert.Equal("1", canonical.IngredientLines[0].Amount!.Value!.D);
        Assert.Equal("g", canonical.IngredientLines[0].Unit?.Text);
        Assert.Equal("salt to taste", canonical.IngredientLines[1].Description);
        Assert.Null(canonical.IngredientLines[1].Amount);
        Assert.Equal(2, canonical.IngredientLines.Select(x => x.Id).Distinct().Count());
        Assert.Equal("Cook 200 g pasta for 10 minutes.", Assert.Single(Assert.Single(canonical.InstructionSections).Steps).Text);
        Assert.True(saved.IsReady);
        Assert.Equal(factory.DefaultFamilyMemberId, saved.AddedBy);
        var diskJson = await scope.ServiceProvider.GetRequiredService<IRecipeStore>().ReadRecipeJsonAsync(id);
        Assert.NotNull(diskJson);
        using var diskDoc = System.Text.Json.JsonDocument.Parse(diskJson);
        Assert.Equal("https://schema.org/", diskDoc.RootElement.GetProperty("@context").GetString());
        Assert.Equal("Recipe", diskDoc.RootElement.GetProperty("@type").GetString());
        Assert.False(diskDoc.RootElement.TryGetProperty("format", out _));
    }
}
