using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

[Collection("WorkflowRootResolver")]
public sealed class RecipeImportIndexingTests
{
    private static async Task<WorkflowOrchestrator> CreateOrchestratorAsync(RecipeDbContext db)
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "api", "src", "RecipeApi", "Workflows")))
            root = root.Parent;
        var storage = new InMemoryStorageProvider();
        foreach (var name in new[] { "recipe-import", "index-recipe-search" })
        {
            var yaml = await File.ReadAllTextAsync(Path.Combine(root!.FullName, "api", "src", "RecipeApi", "Workflows", name + ".yaml"));
            await storage.SaveAsync("workflows", name + ".yaml", yaml);
        }
        return new WorkflowOrchestrator(new WorkflowRepository(storage), db);
    }

    [Fact]
    public async Task Import_queues_indexing_only_after_readiness_and_import_report_completion()
    {
        await using var db = TestDbContextFactory.Create();
        var orchestrator = await CreateOrchestratorAsync(db);
        var recipeId = Guid.NewGuid();
        var instance = await orchestrator.TriggerAsync("recipe-import", new() { ["recipeId"] = recipeId.ToString() });
        var queue = Assert.Single(instance.Tasks, t => t.TaskName == "queue_search_index");
        Assert.Equal(TaskStatus.Waiting, queue.Status);
        Assert.Equal("QueueRecipeSearchIndex", queue.ProcessorName);
        Assert.Equal(["complete_import_report"], queue.DependsOn);
        Assert.Contains("recipe_ready", Assert.Single(instance.Tasks, t => t.TaskName == "complete_import_report").DependsOn);
        Assert.Contains("categorize_recipe", Assert.Single(instance.Tasks, t => t.TaskName == "recipe_ready").DependsOn);
        using var payload = JsonDocument.Parse(queue.Payload!);
        Assert.Equal(recipeId, payload.RootElement.GetProperty("recipeId").GetGuid());
        Assert.DoesNotContain(await db.WorkflowInstances.ToListAsync(), i => i.WorkflowId == "index-recipe-search");
    }

    [Fact]
    public async Task Queue_uses_completed_content_fingerprint_and_persists_independent_index_task()
    {
        await using var db = TestDbContextFactory.Create();
        var orchestrator = await CreateOrchestratorAsync(db);
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Spaghetti", Ingredients = """["pasta","tomatoes"]""", IsReady = true, IsDiscoverable = true };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var processor = new QueueRecipeSearchIndexProcessor(db, orchestrator);
        var task = new WorkflowTask { Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id }) };

        await processor.ExecuteAsync(task, CancellationToken.None);

        var child = await db.WorkflowInstances.Include(i => i.Tasks).SingleAsync();
        Assert.Equal("index-recipe-search", child.WorkflowId);
        var index = Assert.Single(child.Tasks);
        Assert.Equal("IndexRecipeSearch", index.ProcessorName);
        Assert.Equal(TaskStatus.Pending, index.Status);
        using var payload = JsonDocument.Parse(index.Payload!);
        Assert.Equal(recipe.Id, payload.RootElement.GetProperty("recipeId").GetGuid());
        Assert.Equal(SearchFingerprintService.ComputeSourceFingerprint(recipe), payload.RootElement.GetProperty("fingerprint").GetString());
        Assert.True((await db.Recipes.SingleAsync()).IsReady);
    }

    [Fact]
    public async Task Queue_rejects_recipe_that_has_not_finished_importing()
    {
        await using var db = TestDbContextFactory.Create();
        var orchestrator = await CreateOrchestratorAsync(db);
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Spaghetti", IsReady = false };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var processor = new QueueRecipeSearchIndexProcessor(db, orchestrator);
        var task = new WorkflowTask { Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id }) };

        await Assert.ThrowsAsync<InvalidOperationException>(() => processor.ExecuteAsync(task, CancellationToken.None));
        Assert.Empty(await db.WorkflowInstances.ToListAsync());
    }
}
