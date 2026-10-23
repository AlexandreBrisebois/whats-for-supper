using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class MaintenanceCommandPruningTests : IAsyncLifetime
{
    private static readonly DateTimeOffset Now = new(2026, 10, 23, 12, 0, 0, TimeSpan.Zero);
    private TestWebApplicationFactory factory = null!;
    private IServiceScope scope = null!;
    private RecipeDbContext db = null!;
    private ManagementService service = null!;

    public async Task InitializeAsync()
    {
        factory = await TestWebApplicationFactory.CreateAsync(new FixedClock(Now));
        scope = factory.Services.CreateScope();
        db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        service = scope.ServiceProvider.GetRequiredService<ManagementService>();
    }

    public async Task DisposeAsync()
    {
        scope.Dispose();
        await factory.DisposeAsync();
    }

    [Fact]
    public async Task PruneMaintenanceCommands_UsesTerminalCompletionCutoff_AndInitializesNulls()
    {
        var oldCompleted = Command("completed", Now.AddDays(-31), Now.AddDays(-40));
        var cutoffSkipped = Command("skipped", Now.AddDays(-30), Now.AddDays(-40));
        var recentCompleted = Command("completed", Now.AddDays(-29), Now.AddDays(-40));
        var futureSkipped = Command("skipped", Now.AddDays(1), Now.AddDays(-40));
        var nullCompleted = Command("completed", null, Now.AddDays(-100));
        var nullSkipped = Command("skipped", null, Now.AddDays(-100));
        var oldPending = Command("pending", Now.AddDays(-60), Now.AddDays(-70));
        var oldProcessing = Command("processing", Now.AddDays(-60), Now.AddDays(-70));
        var oldFailed = Command("failed", Now.AddDays(-60), Now.AddDays(-70));
        var unrelatedRecipe = new Recipe { Name = "Untouched by command pruning", CreatedAt = Now };
        var unrelatedReport = new RecipeImportReport
        {
            RecipeId = unrelatedRecipe.Id,
            Recipe = unrelatedRecipe,
            Reasons = ["steps"],
            CreatedAt = Now,
            UpdatedAt = Now,
        };
        var unrelatedWorkflow = Workflow("unrelated-workflow", WorkflowStatus.Completed, Now.AddDays(-100));
        db.AddRange(oldCompleted, cutoffSkipped, recentCompleted, futureSkipped, nullCompleted, nullSkipped, oldPending, oldProcessing, oldFailed, unrelatedRecipe, unrelatedReport, unrelatedWorkflow);
        await db.SaveChangesAsync();
        var recipeStore = scope.ServiceProvider.GetRequiredService<IRecipeStore>();
        await recipeStore.SaveOriginalImageAsync(unrelatedRecipe.Id, 0, "image/png", new MemoryStream([1, 2, 3]));

        var result = await service.PruneMaintenanceCommandsAsync(30, 500);

        Assert.Equal(2, result.PrunedCommands);
        Assert.Equal(2, result.InitializedCompletionTimestamps);
        Assert.Equal(Now.AddDays(-30), result.Cutoff);
        var remaining = await db.MaintenanceCommands.OrderBy(c => c.Status).ToListAsync();
        Assert.DoesNotContain(remaining, c => c.Id == oldCompleted.Id || c.Id == cutoffSkipped.Id);
        Assert.Contains(remaining, c => c.Id == recentCompleted.Id);
        Assert.Contains(remaining, c => c.Id == futureSkipped.Id);
        Assert.Equal(Now, Assert.Single(remaining, c => c.Id == nullCompleted.Id).CompletedAt);
        Assert.Equal(Now, Assert.Single(remaining, c => c.Id == nullSkipped.Id).CompletedAt);
        Assert.Contains(remaining, c => c.Id == oldPending.Id);
        Assert.Contains(remaining, c => c.Id == oldProcessing.Id);
        Assert.Contains(remaining, c => c.Id == oldFailed.Id);
        Assert.True(await db.Recipes.AnyAsync(r => r.Id == unrelatedRecipe.Id));
        Assert.True(await db.RecipeImportReports.AnyAsync(r => r.RecipeId == unrelatedRecipe.Id));
        Assert.True(await db.WorkflowInstances.AnyAsync(w => w.Id == unrelatedWorkflow.Id));
        var original = await recipeStore.ReadOriginalImageAsync(unrelatedRecipe.Id, 0);
        Assert.NotNull(original);
        await using var originalStream = original.Value.Stream;
        Assert.Equal(1, originalStream.ReadByte());

        var repeated = await service.PruneMaintenanceCommandsAsync(30, 500);
        Assert.Equal(0, repeated.PrunedCommands);
        Assert.Equal(0, repeated.InitializedCompletionTimestamps);
    }

    [Fact]
    public async Task PruneMaintenanceCommands_RespectsBatchSize_AndResumes()
    {
        db.MaintenanceCommands.AddRange(
            Command("completed", Now.AddDays(-31), Now.AddDays(-40)),
            Command("completed", Now.AddDays(-32), Now.AddDays(-40)),
            Command("skipped", Now.AddDays(-33), Now.AddDays(-40)));
        await db.SaveChangesAsync();

        Assert.Equal(2, (await service.PruneMaintenanceCommandsAsync(30, 2)).PrunedCommands);
        Assert.Single(await db.MaintenanceCommands.ToListAsync());
        Assert.Equal(1, (await service.PruneMaintenanceCommandsAsync(30, 2)).PrunedCommands);
        Assert.Empty(await db.MaintenanceCommands.ToListAsync());
    }

    [Fact]
    public async Task PruneMaintenanceCommands_CancelledBeforePersistence_LeavesRowsUntouched()
    {
        var command = Command("completed", Now.AddDays(-31), Now.AddDays(-40));
        db.MaintenanceCommands.Add(command);
        await db.SaveChangesAsync();
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            service.PruneMaintenanceCommandsAsync(30, 500, cancellation.Token));

        db.ChangeTracker.Clear();
        Assert.True(await db.MaintenanceCommands.AnyAsync(c => c.Id == command.Id));
    }

    [Fact]
    public async Task Processor_UsesThirtyDayAndFiveHundredRowDefaults_WhenPayloadValuesAreInvalid()
    {
        db.MaintenanceCommands.Add(Command("completed", Now.AddDays(-31), Now.AddDays(-40)));
        await db.SaveChangesAsync();
        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = Guid.NewGuid(),
            TaskName = "prune-maintenance-commands",
            ProcessorName = "PruneMaintenanceCommands",
            Payload = "{\"retentionDays\":0,\"batchSize\":0}",
            CreatedAt = Now,
            UpdatedAt = Now,
        };

        var result = Assert.IsType<MaintenanceCommandPruneResult>(
            await new ManagementProcessor(service, db, "PruneMaintenanceCommands").ExecuteAsync(task, CancellationToken.None));

        Assert.Equal(1, result.PrunedCommands);
        Assert.Equal(Now.AddDays(-30), result.Cutoff);
    }

    private static MaintenanceCommand Command(string status, DateTimeOffset? completedAt, DateTimeOffset createdAt) => new()
    {
        Id = Guid.NewGuid(),
        CommandType = CaptureFailureService.DeleteFailedCaptureResidueCommand,
        Status = status,
        CreatedAt = createdAt,
        CompletedAt = completedAt,
    };

    private static WorkflowInstance Workflow(string workflowId, WorkflowStatus status, DateTimeOffset updatedAt) => new()
    {
        Id = Guid.NewGuid(),
        WorkflowId = workflowId,
        Status = status,
        CreatedAt = updatedAt.AddMinutes(-5),
        UpdatedAt = updatedAt,
    };

    private sealed class FixedClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow => now;
    }
}
