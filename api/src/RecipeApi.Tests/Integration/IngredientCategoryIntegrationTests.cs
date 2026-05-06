using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class IngredientCategoryIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client = _factory.CreateClient();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task Patch_ValidSection_Returns204AndPersistsHumanSource()
    {
        var response = await _client.PatchAsJsonAsync(
            "/api/ingredients/potato/category",
            new { grocerySection = "Produce" });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var row = await _db.IngredientCategories
            .SingleAsync(r => r.NormalizedKey == "potato");
        Assert.Equal("Produce", row.GrocerySection);
        Assert.Equal("human", row.Source);
    }

    [Fact]
    public async Task Patch_InvalidSection_Returns400()
    {
        var response = await _client.PatchAsJsonAsync(
            "/api/ingredients/salt/category",
            new { grocerySection = "NotARealSection" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
