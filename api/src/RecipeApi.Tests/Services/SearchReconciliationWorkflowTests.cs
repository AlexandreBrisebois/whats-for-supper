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

    [Theory]
    [InlineData("{\"force\":true}")]
    [InlineData("{\"force\":\"true\"}")]
    public async Task ExecuteAsync_WithForceTrue_RequeuesReadySidecarsWhileDeduplicatingActiveJobs(string payload)
    {
        await using var db = TestDbContextFactory.Create();
        var builder = new RecipeSearchDocumentBuilder();

        var readyRecipe = new Recipe { Id = Guid.NewGuid(), IsReady = true, Name = "Ready recipe" };
        var readyContent = builder.Build(readyRecipe);
        var readyFingerprint = SearchFingerprintService.ComputeSourceFingerprint(readyRecipe, readyContent);
        db.Recipes.Add(readyRecipe);
        db.RecipeSearchDocuments.Add(new RecipeSearchDocument
        {
            RecipeId = readyRecipe.Id,
            DocumentText = readyContent.DocumentText,
            SearchMetadata = readyContent.SearchMetadata,
            IndexStatus = "ready",
            EmbeddingStatus = "ready",
            SourceFingerprint = readyFingerprint,
            SchemaVersion = readyContent.SchemaVersion
        });

        var activeRecipe = new Recipe { Id = Guid.NewGuid(), IsReady = true, Name = "Active job recipe" };
        var activeContent = builder.Build(activeRecipe);
        var activeFingerprint = SearchFingerprintService.ComputeSourceFingerprint(activeRecipe, activeContent);
        db.Recipes.Add(activeRecipe);
        db.RecipeSearchDocuments.Add(new RecipeSearchDocument
        {
            RecipeId = activeRecipe.Id,
            DocumentText = activeContent.DocumentText,
            SearchMetadata = activeContent.SearchMetadata,
            IndexStatus = "ready",
            EmbeddingStatus = "ready",
            SourceFingerprint = activeFingerprint,
            SchemaVersion = activeContent.SchemaVersion
        });
        db.WorkflowInstances.Add(new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = "index-recipe-search",
            Status = WorkflowStatus.Processing,
            Parameters = System.Text.Json.JsonSerializer.Serialize(new Dictionary<string, string>
            {
                ["recipeId"] = activeRecipe.Id.ToString(),
                ["fingerprint"] = activeFingerprint
            })
        });
        await db.SaveChangesAsync();

        var orchestrator = new RecordingOrchestrator();
        var workflow = new SearchReconciliationWorkflow(db, orchestrator, builder, NullLogger<SearchReconciliationWorkflow>.Instance);

        await workflow.ExecuteAsync(new WorkflowTask { Payload = payload }, CancellationToken.None);

        var queued = Assert.Single(orchestrator.Calls);
        Assert.Equal("index-recipe-search", queued.WorkflowId);
        Assert.Equal(readyRecipe.Id.ToString(), queued.Parameters["recipeId"]);
        var readyDoc = await db.RecipeSearchDocuments.FindAsync(readyRecipe.Id);
        Assert.Equal("pending", readyDoc!.IndexStatus);
        Assert.Equal("pending", readyDoc.EmbeddingStatus);
    }

    [Fact]
    public async Task ExecuteAsync_WithForceTrue_PropagatesForceToContinuationBatch()
    {
        await using var db = TestDbContextFactory.Create();
        var builder = new RecipeSearchDocumentBuilder();
        for (var i = 0; i < 50; i++)
        {
            var recipe = new Recipe { Id = Guid.NewGuid(), IsReady = true, Name = $"Recipe {i}" };
            var content = builder.Build(recipe);
            var fp = SearchFingerprintService.ComputeSourceFingerprint(recipe, content);
            db.Recipes.Add(recipe);
            db.RecipeSearchDocuments.Add(new RecipeSearchDocument
            {
                RecipeId = recipe.Id,
                DocumentText = content.DocumentText,
                SearchMetadata = content.SearchMetadata,
                IndexStatus = "ready",
                EmbeddingStatus = "ready",
                SourceFingerprint = fp,
                SchemaVersion = content.SchemaVersion
            });
        }
        await db.SaveChangesAsync();

        var orchestrator = new RecordingOrchestrator();
        var workflow = new SearchReconciliationWorkflow(db, orchestrator, builder, NullLogger<SearchReconciliationWorkflow>.Instance);

        await workflow.ExecuteAsync(new WorkflowTask { Payload = "{\"force\":true}" }, CancellationToken.None);

        var continuation = Assert.Single(orchestrator.Calls, c => c.WorkflowId == "search-reconciliation");
        Assert.Equal("true", continuation.Parameters["force"]);
        Assert.True(continuation.Parameters.ContainsKey("cursor"));
    }

    private sealed class RecordingOrchestrator : IWorkflowOrchestrator
    {
        public Task<WorkflowInstance> TriggerImportAsync(Guid instanceId, Guid recipeId,
            string workflowId, Dictionary<string, string> parameters) => throw new NotSupportedException();

        public Task<WorkflowInstance> TriggerReportAsync(Guid instanceId, Guid recipeId, string workflowId, Dictionary<string, string> parameters)
            => throw new NotSupportedException();

        public Task<WorkflowInstance?> InitializeUrlCaptureAsync(Guid instanceId, CancellationToken ct = default)
            => throw new NotSupportedException();

        public Task<WorkflowInstance?> InitializeRecipeFollowupAsync(Guid instanceId, CancellationToken ct = default)
            => throw new NotSupportedException();

        public List<(string WorkflowId, Dictionary<string, string> Parameters)> Calls { get; } = [];
        public Task<WorkflowInstance> TriggerAsync(string workflowId, Dictionary<string, string> parameters, DateTimeOffset? scheduledAt = null)
        {
            Calls.Add((workflowId, parameters));
            return Task.FromResult(new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = workflowId });
        }
        public Task<WorkflowDefinition> GetDefinitionAsync(string workflowId) => throw new NotSupportedException();
    }
}
