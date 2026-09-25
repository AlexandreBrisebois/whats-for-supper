using Microsoft.Extensions.AI;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services.Processors;

public class BackfillVegetarianClassificationProcessorTests
{
    [Fact]
    public async Task ExecuteAsync_QueuesBoundedBatchAndSuccessorWithoutMutatingRecipes()
    {
        await using var db = TestDbContextFactory.Create();
        for (var index = 0; index < 26; index++) db.Recipes.Add(new Recipe { Id = Guid.NewGuid(), Name = $"Recipe {index}" });
        await db.SaveChangesAsync();
        var orchestrator = new RecordingOrchestrator();
        var processor = new BackfillVegetarianClassificationProcessor(db, orchestrator);

        var result = await processor.ExecuteAsync(new WorkflowTask { Payload = "{}" }, CancellationToken.None);

        Assert.Equal(26, db.Recipes.Count());
        Assert.Equal(25, orchestrator.Calls.Count(call => call.WorkflowId == "classify-recipe-vegetarian"));
        Assert.Single(orchestrator.Calls, call => call.WorkflowId == "vegetarian-classification-backfill");
        var metrics = Assert.IsType<VegetarianClassificationMetrics>(result);
        Assert.Equal(26, metrics.Total);
        Assert.Equal(25, metrics.Queued);
    }

    [Fact]
    public async Task ExecuteAsync_SkipsCurrentRowsUnlessForced()
    {
        await using var db = TestDbContextFactory.Create();
        db.Recipes.Add(new Recipe { Id = Guid.NewGuid(), VegetarianClassificationVersion = CategorizeRecipeProcessor.VegetarianClassifierVersion });
        await db.SaveChangesAsync();
        var orchestrator = new RecordingOrchestrator();
        var processor = new BackfillVegetarianClassificationProcessor(db, orchestrator);

        await processor.ExecuteAsync(new WorkflowTask { Payload = "{}" }, CancellationToken.None);
        Assert.Empty(orchestrator.Calls);

        await processor.ExecuteAsync(new WorkflowTask { Payload = "{\"force\":true}" }, CancellationToken.None);
        Assert.Single(orchestrator.Calls, call => call.WorkflowId == "classify-recipe-vegetarian");
    }

    private sealed class RecordingOrchestrator : IWorkflowOrchestrator
    {
        public List<(string WorkflowId, Dictionary<string, string> Parameters)> Calls { get; } = [];
        public Task<WorkflowInstance> TriggerAsync(string workflowId, Dictionary<string, string> parameters, DateTimeOffset? scheduledAt = null)
        {
            Calls.Add((workflowId, parameters));
            return Task.FromResult(new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = workflowId });
        }
        public Task<WorkflowDefinition> GetDefinitionAsync(string workflowId) => throw new NotSupportedException();
    }
}
