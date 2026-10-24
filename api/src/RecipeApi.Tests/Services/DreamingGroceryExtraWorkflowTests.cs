using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class DreamingGroceryExtraWorkflowTests
{
    [Fact]
    public async Task Dreaming_RollsOverExtras_AndReportWaitsForOutcome()
    {
        var storage = new InMemoryStorageProvider();
        await storage.SaveAsync("workflows", "dreaming.yaml", await File.ReadAllTextAsync(FindDreamingWorkflow()));
        await using var db = TestDbContextFactory.Create();
        var definition = await new WorkflowOrchestrator(new SystemClock(), new WorkflowRepository(storage), db)
            .GetDefinitionAsync("dreaming");

        var rollover = Assert.Single(definition.Tasks, task => task.Name == "rollover-grocery-extras");
        Assert.Equal("RolloverGroceryExtras", rollover.Processor);
        Assert.Contains("rollover-grocery-extras", Assert.Single(definition.Tasks, task => task.Name == "report").DependsOn);
    }

    [Fact]
    public async Task RolloverProcessor_ReturnsAReportableFailedOutcomeInsteadOfBlockingDreamingReport()
    {
        var db = TestDbContextFactory.Create();
        await db.DisposeAsync();
        var rollover = new GroceryExtraRolloverService(db, new SystemClock(),
            new DeploymentCalendar(new ConfigurationManager()));
        var processor = new RolloverGroceryExtrasProcessor(rollover,
            NullLogger<RolloverGroceryExtrasProcessor>.Instance);

        var result = Assert.IsType<GroceryExtraRolloverResult>(
            await processor.ExecuteAsync(new WorkflowTask(), CancellationToken.None));

        Assert.False(result.Succeeded);
        Assert.Equal("ObjectDisposedException", result.FailureCode);
    }

    private static string FindDreamingWorkflow()
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !File.Exists(Path.Combine(root.FullName, "api", "src", "RecipeApi", "Workflows", "dreaming.yaml")))
            root = root.Parent;
        return Path.Combine(root?.FullName ?? throw new DirectoryNotFoundException("Repository root not found."),
            "api", "src", "RecipeApi", "Workflows", "dreaming.yaml");
    }
}
