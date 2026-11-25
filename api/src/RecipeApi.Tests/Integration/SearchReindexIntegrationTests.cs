using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class SearchReindexIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task GetSearchStatus_ReturnsReadySearchableEnrichedActiveJobsAndDemoMode()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var enriched = new Recipe { Id = Guid.NewGuid(), IsReady = true, Name = "Enriched Pasta" };
            var lexicalOnly = new Recipe { Id = Guid.NewGuid(), IsReady = true, Name = "Lexical Soup" };
            var unindexed = new Recipe { Id = Guid.NewGuid(), IsReady = true, Name = "Pending Salad" };
            var unready = new Recipe { Id = Guid.NewGuid(), IsReady = false, Name = "Draft Pie" };
            var deleted = new Recipe { Id = Guid.NewGuid(), IsReady = true, DeletedAt = DateTimeOffset.UtcNow, Name = "Deleted Cake" };

            db.Recipes.AddRange(enriched, lexicalOnly, unindexed, unready, deleted);
            db.RecipeSearchDocuments.AddRange(
                new RecipeSearchDocument { RecipeId = enriched.Id, IndexStatus = "ready", EmbeddingStatus = "ready", DocumentText = "enriched", SearchMetadata = "{}" },
                new RecipeSearchDocument { RecipeId = lexicalOnly.Id, IndexStatus = "ready", EmbeddingStatus = "failed", DocumentText = "lexical", SearchMetadata = "{}" },
                new RecipeSearchDocument { RecipeId = unindexed.Id, IndexStatus = "pending", EmbeddingStatus = "pending", DocumentText = "", SearchMetadata = "{}" },
                new RecipeSearchDocument { RecipeId = unready.Id, IndexStatus = "ready", EmbeddingStatus = "ready", DocumentText = "draft", SearchMetadata = "{}" },
                new RecipeSearchDocument { RecipeId = deleted.Id, IndexStatus = "ready", EmbeddingStatus = "ready", DocumentText = "deleted", SearchMetadata = "{}" }
            );
            db.WorkflowInstances.AddRange(
                new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "index-recipe-search", Status = WorkflowStatus.Pending, Parameters = "{}" },
                new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "index-recipe-search", Status = WorkflowStatus.Completed, Parameters = "{}" }
            );
            await db.SaveChangesAsync();
        }

        var response = await _client.GetAsync("/api/management/search-status");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(3, doc.RootElement.GetProperty("totalReadyRecipes").GetInt32());
        Assert.Equal(2, doc.RootElement.GetProperty("searchableRecipes").GetInt32());
        Assert.Equal(1, doc.RootElement.GetProperty("enrichedRecipes").GetInt32());
        Assert.Equal(1, doc.RootElement.GetProperty("activeIndexingJobs").GetInt32());
        Assert.False(doc.RootElement.GetProperty("demoMode").GetBoolean());
    }

    [Fact]
    public async Task BackfillSearch_WithForceTrue_ForwardsForceParameterAndOmitsTaskId()
    {
        var response = await _client.PostAsJsonAsync("/api/management/backfill-search", new { force = true });

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("Search index backfill triggered in the background.", doc.RootElement.GetProperty("message").GetString());
        Assert.False(doc.RootElement.TryGetProperty("taskId", out _));

        _factory.WorkflowOrchestratorMock.Verify(
            o => o.TriggerAsync(
                "search-reconciliation",
                It.Is<Dictionary<string, string>>(p => p.ContainsKey("force") && p["force"] == "true"),
                null),
            Times.Once);
    }

    [Fact]
    public async Task ReindexRecipe_ReadyRecipe_QueuesOnceAndDeduplicatesActiveJob()
    {
        var recipeId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.Recipes.Add(new Recipe { Id = recipeId, IsReady = true, Name = "Lemon Garlic Pasta" });
            db.RecipeSearchDocuments.Add(new RecipeSearchDocument
            {
                RecipeId = recipeId,
                IndexStatus = "ready",
                EmbeddingStatus = "ready",
                DocumentText = "lemon garlic pasta",
                SearchMetadata = "{}"
            });
            await db.SaveChangesAsync();
        }

        var first = await _client.PostAsync($"/api/recipes/{recipeId}/reindex", null);
        Assert.Equal(HttpStatusCode.Accepted, first.StatusCode);
        using var firstDoc = JsonDocument.Parse(await first.Content.ReadAsStringAsync());
        Assert.True(firstDoc.RootElement.GetProperty("queued").GetBoolean());

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var sidecar = await db.RecipeSearchDocuments.FindAsync(recipeId);
            Assert.NotNull(sidecar);
            Assert.Equal("pending", sidecar!.IndexStatus);
            Assert.Equal("pending", sidecar.EmbeddingStatus);
        }

        _factory.WorkflowOrchestratorMock.Verify(
            o => o.TriggerAsync(
                "index-recipe-search",
                It.Is<Dictionary<string, string>>(p =>
                    p.ContainsKey("recipeId") && p["recipeId"] == recipeId.ToString() &&
                    p.ContainsKey("fingerprint") && !string.IsNullOrWhiteSpace(p["fingerprint"])),
                null),
            Times.Once);

        // Second call while active job exists must deduplicate and not trigger a duplicate job.
        var second = await _client.PostAsync($"/api/recipes/{recipeId}/reindex", null);
        Assert.Equal(HttpStatusCode.Accepted, second.StatusCode);
        using var secondDoc = JsonDocument.Parse(await second.Content.ReadAsStringAsync());
        Assert.False(secondDoc.RootElement.GetProperty("queued").GetBoolean());

        _factory.WorkflowOrchestratorMock.Verify(
            o => o.TriggerAsync("index-recipe-search", It.IsAny<Dictionary<string, string>>(), null),
            Times.Once);
    }

    [Fact]
    public async Task ReindexRecipe_MissingOrDeleted_Returns404()
    {
        var missing = await _client.PostAsync($"/api/recipes/{Guid.NewGuid()}/reindex", null);
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);

        var deletedId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.Recipes.Add(new Recipe { Id = deletedId, IsReady = true, DeletedAt = DateTimeOffset.UtcNow, Name = "Deleted" });
            await db.SaveChangesAsync();
        }

        var deleted = await _client.PostAsync($"/api/recipes/{deletedId}/reindex", null);
        Assert.Equal(HttpStatusCode.NotFound, deleted.StatusCode);
    }

    [Fact]
    public async Task ReindexRecipe_UnreadyRecipe_Returns409()
    {
        var unreadyId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.Recipes.Add(new Recipe { Id = unreadyId, IsReady = false, Name = "Importing" });
            await db.SaveChangesAsync();
        }

        var response = await _client.PostAsync($"/api/recipes/{unreadyId}/reindex", null);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }
}
