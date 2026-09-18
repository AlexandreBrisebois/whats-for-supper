using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class SearchReconciliationWorkflowTests
{
    [Fact]
    public async Task ExecuteAsync_CreatesMissingSidecarAndQueuesOneCurrentFingerprint()
    {
        await using var db = TestDbContextFactory.Create();
        var recipe = new Recipe { Id = Guid.NewGuid(), IsReady = true, Name = "Reconcile me" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var orchestrator = new RecordingOrchestrator();
        var workflow = new SearchReconciliationWorkflow(db, orchestrator, new RecipeSearchDocumentBuilder(), NullLogger<SearchReconciliationWorkflow>.Instance);

        await workflow.ExecuteAsync(new WorkflowTask { Payload = "{}" }, CancellationToken.None);

        var sidecar = await db.RecipeSearchDocuments.FindAsync(recipe.Id);
        Assert.NotNull(sidecar);
        Assert.Equal("pending", sidecar!.IndexStatus);
        var queued = Assert.Single(orchestrator.Calls);
        Assert.Equal("index-recipe-search", queued.WorkflowId);
        Assert.Equal(recipe.Id.ToString(), queued.Parameters["recipeId"]);
        Assert.False(string.IsNullOrWhiteSpace(queued.Parameters["fingerprint"]));
    }

    [Fact]
    public async Task ExecuteAsync_DoesNotQueueWhenAnEquivalentIndexWorkflowIsActive()
    {
        await using var db = TestDbContextFactory.Create();
        var recipe = new Recipe { Id = Guid.NewGuid(), IsReady = true, Name = "Already indexing" };
        var content = new RecipeSearchDocumentBuilder().Build(recipe);
        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe, content);
        db.Recipes.Add(recipe);
        db.WorkflowInstances.Add(new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = "index-recipe-search",
            Status = WorkflowStatus.Pending,
            Parameters = System.Text.Json.JsonSerializer.Serialize(new Dictionary<string, string>
            {
                ["recipeId"] = recipe.Id.ToString(),
                ["fingerprint"] = fingerprint
            })
        });
        await db.SaveChangesAsync();
        var orchestrator = new RecordingOrchestrator();
        var workflow = new SearchReconciliationWorkflow(db, orchestrator, new RecipeSearchDocumentBuilder(), NullLogger<SearchReconciliationWorkflow>.Instance);

        await workflow.ExecuteAsync(new WorkflowTask { Payload = "{}" }, CancellationToken.None);

        Assert.Empty(orchestrator.Calls);
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
