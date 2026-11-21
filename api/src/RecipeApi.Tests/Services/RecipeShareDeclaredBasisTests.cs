using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class RecipeShareDeclaredBasisTests
{
    [Fact]
    public async Task OrdinaryShareImport_RetainsExplicitPositiveServingsWithoutGuessingIngredientFacts()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        await QualifyDeclaredBasisAsync(factory);
    }

    internal static async Task QualifyDeclaredBasisAsync(TestWebApplicationFactory factory)
    {
        using var client = factory.CreateAuthenticatedClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        var id = Guid.NewGuid();
        using var response = await client.PostAsJsonAsync("/api/recipes/import-bundle", new
        {
            version = "1.0",
            recipe = new { name = "Shared declared portions", servings = 4, ingredients = new[] { "200 g pasta" },
                instructions = new[] { new { name = "Cook", itemListElement = new[] { new { text = "Cook the pasta." } } } }, isSynthesized = false },
            info = new { bundleSource = "wfs-share", recipeId = id, exportedAtUtc = DateTimeOffset.UtcNow }, originals = Array.Empty<object>()
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var saved = await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        Assert.Equal(4, saved.Servings);
        var canonical = CanonicalRecipeContentStore.Read(saved);
        Assert.NotNull(canonical);
        Assert.Equal(4, canonical.Servings);
        var line = Assert.Single(canonical.IngredientLines);
        Assert.Equal("200 g pasta", line.Description);
        Assert.Null(line.Amount);
        Assert.Null(line.Unit);
        Assert.Equal("legacy_unknown", line.Provenance.Origin);
        Assert.Null(line.Provenance.SourceRef);
    }
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task OrdinaryShareImport_RejectsExplicitNonpositiveBasisBeforeAnyRecipeWrite(int servings)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        var id = Guid.NewGuid();
        using var response = await client.PostAsJsonAsync("/api/recipes/import-bundle", new
        {
            version = "1.0",
            recipe = new { name = "Invalid declared portions", servings, ingredients = new[] { "200 g pasta" },
                instructions = new[] { new { name = "Cook", itemListElement = new[] { new { text = "Cook the pasta." } } } }, isSynthesized = false },
            info = new { bundleSource = "wfs-share", recipeId = id, exportedAtUtc = DateTimeOffset.UtcNow }, originals = Array.Empty<object>()
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.False(await db.Recipes.AnyAsync(x => x.Id == id));
        Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.RecipeId == id));
        var repository = scope.ServiceProvider.GetRequiredService<RecipeRepository>();
        Assert.False(await repository.ExistsAsync(id, "recipe.info"));
        Assert.False(await repository.ExistsAsync(id, "recipe.json"));
    }

}
