using Microsoft.EntityFrameworkCore;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

public class DreamingFilterMaterializationWorkflowTests
{
    [Fact]
    public async Task Dreaming_MaterializesOnlyAfterFinalization_AndReportWaitsForMaterialization()
    {
        var storage = new InMemoryStorageProvider();
        var yaml = await File.ReadAllTextAsync(FindDreamingWorkflow());
        await storage.SaveAsync("workflows", "dreaming.yaml", yaml);
        await using var db = TestDbContextFactory.Create();
        var definition = await new WorkflowOrchestrator(new WorkflowRepository(storage), db).GetDefinitionAsync("dreaming");

        var materialize = Assert.Single(definition.Tasks, task => task.Name == "materialize-recipe-search-filters");
        var report = Assert.Single(definition.Tasks, task => task.Name == "report");
        Assert.Equal(["finalize-overdue-meals"], materialize.DependsOn);
        Assert.Contains("materialize-recipe-search-filters", report.DependsOn);
    }

    [Fact]
    public async Task Dreaming_FailedFinalizationLeavesTheMaterializerWaitingAndPreviousStateAvailable()
    {
        var storage = new InMemoryStorageProvider();
        await storage.SaveAsync("workflows", "dreaming.yaml", await File.ReadAllTextAsync(FindDreamingWorkflow()));
        await using var db = TestDbContextFactory.Create();
        var orchestrator = new WorkflowOrchestrator(new WorkflowRepository(storage), db);
        var instance = await orchestrator.TriggerAsync("dreaming", []);
        var state = new RecipeSearchFilterState
        {
            GeneratedAt = new DateTimeOffset(2026, 9, 18, 6, 0, 0, TimeSpan.Zero),
            CuisinePayload = "{\"promoted\":[\"Italian\"],\"all\":[\"Italian\"]}"
        };
        db.RecipeSearchFilterStates.Add(state);
        var finalization = await db.WorkflowTasks.SingleAsync(task => task.InstanceId == instance.Id && task.TaskName == "finalize-overdue-meals");
        finalization.Status = TaskStatus.Failed;
        await db.SaveChangesAsync();

        var materialize = await db.WorkflowTasks.SingleAsync(task => task.InstanceId == instance.Id && task.TaskName == "materialize-recipe-search-filters");

        Assert.Equal(TaskStatus.Waiting, materialize.Status);
        Assert.Equal(state.GeneratedAt, (await db.RecipeSearchFilterStates.SingleAsync()).GeneratedAt);
    }

    private static string FindDreamingWorkflow()
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !File.Exists(Path.Combine(root.FullName, "api", "src", "RecipeApi", "Workflows", "dreaming.yaml")))
            root = root.Parent;
        return Path.Combine(root?.FullName ?? throw new DirectoryNotFoundException("Repository root not found."), "api", "src", "RecipeApi", "Workflows", "dreaming.yaml");
    }
}
