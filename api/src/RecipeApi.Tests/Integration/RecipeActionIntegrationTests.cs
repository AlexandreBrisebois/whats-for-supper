using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Workflow;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class RecipeActionIntegrationTests : IAsyncLifetime
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
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task UploadOriginal_IncrementsImageCount_AndTriggersRegeneration()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Original Recipe",
            ImageCount = 2,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();

        // Seed the IRecipeStore as well (since ImageService uses it to find the next index)
        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        await store.WriteInfoAsync(new RecipeInfo { Id = recipeId, ImageCount = 2 });

        // Create a dummy file for upload
        var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x01, 0x02, 0x03 });
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        content.Add(fileContent, "file", "photo.jpg");

        // Act
        var response = await _client.PostAsync($"/api/recipes/{recipeId}/originals", content);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = body.GetProperty("data");
        Assert.Equal(2, data.GetProperty("id").GetInt32()); // Next index for Count=2 is 2

        // Verify DB update
        var recipe = await _db.Recipes.FindAsync(recipeId);
        _db.Entry(recipe!).Reload();
        Assert.Equal(3, recipe!.ImageCount);

        // Verify Workflow Trigger
        _factory.WorkflowOrchestratorMock.Verify(o => o.TriggerAsync(
            "recipe-hero-regeneration",
            It.Is<Dictionary<string, string>>(d => d["recipeId"] == recipeId.ToString())),
            Times.Once);
    }

    [Fact]
    public async Task RegenerateHero_TriggersRegenerationWorkflow()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Regen Recipe",
            ImageCount = 1,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();

        // Act
        var response = await _client.PostAsync($"/api/recipes/{recipeId}/hero/regenerate", null);

        // Assert
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        // Verify Workflow Trigger
        _factory.WorkflowOrchestratorMock.Verify(o => o.TriggerAsync(
            "recipe-hero-regeneration",
            It.Is<Dictionary<string, string>>(d => d["recipeId"] == recipeId.ToString())),
            Times.Once);
    }

    [Fact]
    public async Task UploadOriginal_Returns404_ForMissingRecipe()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x01 });
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        content.Add(fileContent, "file", "photo.jpg");

        // Act
        var response = await _client.PostAsync($"/api/recipes/{recipeId}/originals", content);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
