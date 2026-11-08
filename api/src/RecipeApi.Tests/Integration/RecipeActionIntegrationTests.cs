using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
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
        _factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["Tests:LocalRecipeStore"] = "true" });
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
        var accepted = await _db.WorkflowInstances.AsNoTracking().SingleAsync(x => x.WorkflowId == "recipe-hero-regeneration");
        var publication = await _db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == accepted.Id);
        using (var saved = JsonDocument.Parse(publication.Payload))
        {
            using var intent = JsonDocument.Parse(saved.RootElement.GetProperty("candidate").GetProperty("followupIntent").GetString()!);
            Assert.Equal(recipeId.ToString(), intent.RootElement.GetProperty("parameters").GetProperty("recipeId").GetString());
        }
        _factory.WorkflowOrchestratorMock.Verify(o => o.InitializeRecipeFollowupAsync(accepted.Id, It.IsAny<CancellationToken>()), Times.Once);
        _factory.WorkflowOrchestratorMock.Verify(o => o.TriggerAsync(
            "recipe_ready",
            It.IsAny<Dictionary<string, string>>(),
            It.IsAny<DateTimeOffset?>()),
            Times.Never);
    }

    [Fact]
    public async Task UploadOriginal_PendingPublicationConflictsWithoutAppendingOrStartingHero()
    {
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe { Id = recipeId, ImageCount = 1 });
        _db.RecipeFilePublications.Add(new RecipeFilePublication
        {
            RecipeId = recipeId, OperationId = Guid.NewGuid(), InputHash = "pending",
            Payload = "{}", ResultHash = "pending"
        });
        await _db.SaveChangesAsync();
        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        await store.WriteInfoAsync(new RecipeInfo { Id = recipeId, ImageCount = 1 });
        using var content = new MultipartFormDataContent();
        var file = new ByteArrayContent([1, 2, 3]);
        file.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
        content.Add(file, "file", "photo.png");
        using var response = await _client.PostAsync($"/api/recipes/{recipeId}/originals", content);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("recipe_content_conflict", body.GetProperty("code").GetString());
        Assert.Equal(1, (await store.ReadInfoAsync(recipeId))!.ImageCount);
        Assert.Null(await store.ReadOriginalImageAsync(recipeId, 1));
        _factory.WorkflowOrchestratorMock.Verify(o => o.InitializeRecipeFollowupAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Empty(await _db.WorkflowInstances.ToListAsync());
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
        _factory.WorkflowOrchestratorMock.Verify(o => o.TriggerAsync(
            "recipe_ready",
            It.IsAny<Dictionary<string, string>>(),
            It.IsAny<DateTimeOffset?>()),
            Times.Never);
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
