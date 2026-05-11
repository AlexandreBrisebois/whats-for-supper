using System.Net;
using System.Text.Json;
using RecipeApi.Data;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace RecipeApi.Tests.Controllers;

public class RecipeRestoreTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client  = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task RestoreRecipe_WhenMissingFingerprint_ShouldSucceedAfterFix()
    {
        // Arrange: Seed a soft-deleted recipe
        var recipeId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.Recipes.Add(new RecipeApi.Models.Recipe
            {
                Id = recipeId,
                Name = "Deleted Recipe",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 1,
                DeletedAt = DateTimeOffset.UtcNow.AddMinutes(-10),
                DeletedBy = _factory.DefaultFamilyMemberId,
                CreatedAt = DateTimeOffset.UtcNow.AddHours(-1),
                UpdatedAt = DateTimeOffset.UtcNow.AddHours(-1)
            });
            await db.SaveChangesAsync();
        }

        // Act: Restore the recipe
        var response = await _client.PostAsync($"/api/recipes/{recipeId}/restore", null);

        // Assert: It should return 200 OK
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify that the search index workflow was triggered with a fingerprint
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var workflow = Assert.Single(db.WorkflowInstances.Where(i => i.WorkflowId == "index-recipe-search"));
            using var parameters = JsonDocument.Parse(workflow.Parameters);
            Assert.True(parameters.RootElement.TryGetProperty("fingerprint", out _), "Missing required 'fingerprint' parameter in restore trigger");
        }
    }
}
