using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class RecipePurgeIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    private const string ValidPin = "test-elevated-pin-1234";

    public async Task InitializeAsync()
    {
        Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", ValidPin);
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", null);
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    // Test 1: Purge removes the recipe row from DB
    [Fact]
    public async Task Purge_RemovesRecipeRow_FromDatabase()
    {
        var recipe = await SeedSoftDeletedRecipeAsync();

        var response = await SendPurgeAsync(recipe.Id, ValidPin);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var found = await db.Recipes.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.Id == recipe.Id);
        Assert.Null(found);
    }

    // Test 2: Purge returns HTTP 200 with { purged: true }
    [Fact]
    public async Task Purge_Returns200_WithPurgedTrue()
    {
        var recipe = await SeedSoftDeletedRecipeAsync();

        var response = await SendPurgeAsync(recipe.Id, ValidPin);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var purged = doc.RootElement.GetProperty("data").GetProperty("purged").GetBoolean();
        Assert.True(purged);
    }

    // Test 3: Purge returns HTTP 409 if recipe is NOT soft-deleted
    [Fact]
    public async Task Purge_Returns409_WhenRecipeIsNotInTrash()
    {
        var recipe = await SeedRecipeAsync();

        var response = await SendPurgeAsync(recipe.Id, ValidPin);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    // Test 4: Purge returns HTTP 403 if X-Elevated-Pin header is missing
    [Fact]
    public async Task Purge_Returns403_WhenPinHeaderMissing()
    {
        var recipe = await SeedSoftDeletedRecipeAsync();

        using var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/recipes/{recipe.Id}/purge");
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // Test 5: Purge returns HTTP 403 if X-Elevated-Pin header value is incorrect
    [Fact]
    public async Task Purge_Returns403_WhenPinIsWrong()
    {
        var recipe = await SeedSoftDeletedRecipeAsync();

        var response = await SendPurgeAsync(recipe.Id, "wrong-pin");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Purge_TrimsConfiguredPinAndHeaderValue()
    {
        Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", $" {ValidPin}\n");
        var recipe = await SeedSoftDeletedRecipeAsync();

        var response = await SendPurgeAsync(recipe.Id, $" {ValidPin} ");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Restore for cleanup
        Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", ValidPin);
    }

    // Test 6: Purge returns HTTP 503 if ELEVATED_ACTIONS_PIN is not configured
    [Fact]
    public async Task Purge_Returns503_WhenPinEnvVarNotConfigured()
    {
        Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", null);

        var recipe = await SeedSoftDeletedRecipeAsync();
        var response = await SendPurgeAsync(recipe.Id, ValidPin);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        Assert.Contains("PIN_NOT_CONFIGURED", json);

        // Restore for cleanup
        Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", ValidPin);
    }

    // Test 7: Purge removes recipe_search_documents row
    [Fact]
    public async Task Purge_RemovesSearchDocument_FromDatabase()
    {
        var recipe = await SeedSoftDeletedRecipeAsync();
        await SeedSearchDocumentAsync(recipe.Id);

        var response = await SendPurgeAsync(recipe.Id, ValidPin);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var doc = await db.RecipeSearchDocuments.IgnoreQueryFilters()
            .FirstOrDefaultAsync(d => d.RecipeId == recipe.Id);
        Assert.Null(doc);
    }

    // Test 8: Purge cancels pending workflow instances for the recipe
    [Fact]
    public async Task Purge_CancelsPendingWorkflowInstances_ForRecipe()
    {
        var recipe = await SeedSoftDeletedRecipeAsync();
        await SeedPendingIndexJobAsync(recipe.Id);

        var response = await SendPurgeAsync(recipe.Id, ValidPin);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var pendingJobs = await db.WorkflowInstances
            .Where(w => w.Parameters != null
                        && w.Parameters.Contains(recipe.Id.ToString())
                        && w.Status == WorkflowStatus.Pending)
            .ToListAsync();
        Assert.Empty(pendingJobs);
    }

    [Fact]
    public async Task Purge_RemovesRealisticTrashDependencies_AndRecipeDirectory()
    {
        var recipe = await SeedSoftDeletedRecipeAsync();
        var recipeDirectory = CreateRecipeDirectory(recipe.Id);
        await SeedSearchDocumentAsync(recipe.Id);
        await SeedRecipeVoteAsync(recipe.Id);
        await SeedCalendarEventAsync(recipe.Id, DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7)));

        var response = await SendPurgeAsync(recipe.Id, ValidPin);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.Null(await db.Recipes.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.Id == recipe.Id));
        Assert.False(Directory.Exists(recipeDirectory));
        Assert.False(await db.RecipeSearchDocuments.IgnoreQueryFilters().AnyAsync(d => d.RecipeId == recipe.Id));
        Assert.False(await db.RecipeVotes.AnyAsync(v => v.RecipeId == recipe.Id));
        Assert.False(await db.CalendarEvents.AnyAsync(e => e.RecipeId == recipe.Id));
    }

    private Task<HttpResponseMessage> SendPurgeAsync(Guid recipeId, string pin)
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/recipes/{recipeId}/purge");
        request.Headers.Add("X-Elevated-Pin", pin);
        return _client.SendAsync(request);
    }

    private async Task<Recipe> SeedRecipeAsync(string name = "Test Recipe")
    {
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = name,
            Description = "A test recipe",
            Ingredients = JsonSerializer.Serialize(new[] { "flour", "water" }),
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1),
        };

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        return recipe;
    }

    private async Task<Recipe> SeedSoftDeletedRecipeAsync(string name = "Deleted Recipe")
    {
        var recipe = await SeedRecipeAsync(name);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var entity = await db.Recipes.IgnoreQueryFilters().FirstAsync(r => r.Id == recipe.Id);
        entity.DeletedAt = DateTimeOffset.UtcNow;
        entity.DeletedBy = _factory.DefaultFamilyMemberId;
        await db.SaveChangesAsync();
        return entity;
    }

    private async Task SeedSearchDocumentAsync(Guid recipeId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.RecipeSearchDocuments.Add(new RecipeSearchDocument
        {
            RecipeId = recipeId,
            DocumentText = "test document",
            SearchMetadata = "{}",
            EmbeddingModel = "test-model",
            IndexStatus = "ready",
            SchemaVersion = 1,
        });
        await db.SaveChangesAsync();
    }

    private async Task SeedPendingIndexJobAsync(Guid recipeId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.WorkflowInstances.Add(new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = "SearchIndexWorkflow",
            Status = WorkflowStatus.Pending,
            Parameters = JsonSerializer.Serialize(new { RecipeId = recipeId }),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    private string CreateRecipeDirectory(Guid recipeId)
    {
        var recipesRoot = _factory.Services.GetRequiredService<RecipesRootResolver>().Root;
        var recipeDirectory = Path.Combine(recipesRoot, recipeId.ToString());
        Directory.CreateDirectory(recipeDirectory);
        File.WriteAllText(Path.Combine(recipeDirectory, "recipe.info.json"), "{}");
        return recipeDirectory;
    }

    private async Task SeedRecipeVoteAsync(Guid recipeId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.RecipeVotes.Add(new RecipeVote
        {
            RecipeId = recipeId,
            FamilyMemberId = _factory.DefaultFamilyMemberId,
            Vote = VoteType.Like,
            VotedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    private async Task SeedCalendarEventAsync(Guid recipeId, DateOnly date)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = date,
            MealSlot = 0,
            Status = CalendarEventStatus.Cooked,
        });
        await db.SaveChangesAsync();
    }
}
