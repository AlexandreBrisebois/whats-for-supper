using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class RecipePhysicalLifecycleTests
{
    [Fact]
    public async Task Maintenance_RetainsOriginalCommandAndReceiptIndependentOfWorkflowRetirement()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Id = Guid.NewGuid(), IsReady = true }; // Existing eligibility is not IsReady alone.
        var workflow = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "url-import", Status = WorkflowStatus.Paused };
        workflow.Tasks.Add(new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = workflow.Id, TaskName = "failed", ProcessorName = "ExtractRecipe", Status = RecipeApi.Models.TaskStatus.Failed });
        var command = new MaintenanceCommand { Id = Guid.NewGuid(), CommandType = CaptureFailureService.DeleteFailedCaptureResidueCommand,
            Status = "pending", Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id, workflowInstanceId = workflow.Id }), CreatedAt = DateTimeOffset.UtcNow };
        db.RecipeImportReports.Add(new RecipeImportReport { RecipeId = recipe.Id, LastWorkflowInstanceId = workflow.Id, Reasons = ["steps"], Note = "original report" });
        db.Recipes.Add(recipe); db.WorkflowInstances.Add(workflow); db.MaintenanceCommands.Add(command); await db.SaveChangesAsync();
        var root = scope.ServiceProvider.GetRequiredService<RecipesRootResolver>();
        var directory = Path.Combine(root.Root, recipe.Id.ToString()); Directory.CreateDirectory(directory);
        await File.WriteAllTextAsync(Path.Combine(directory, "disposable.txt"), "captured");
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        var first = await service.ProcessMaintenanceCommandsAsync();
        Assert.True(first.Completed == 1, JsonSerializer.Serialize(first));
        Assert.False(Directory.Exists(directory)); Assert.Empty(await db.Recipes.IgnoreQueryFilters().ToArrayAsync());
        var physical = await db.RecipePhysicalDeletions.SingleAsync();
        Assert.Equal(command.Id, physical.OperationId); Assert.NotNull(physical.FilesDeliveredAt); Assert.NotNull(physical.CompletedAt); Assert.True(physical.FilesRemoved);
        using var payload = JsonDocument.Parse(physical.Payload);
        Assert.Equal("processing", payload.RootElement.GetProperty("originalMaintenanceCommand").GetProperty("status").GetString());
        Assert.Equal(workflow.Id, Assert.Single(payload.RootElement.GetProperty("workflowRetirements").EnumerateArray()).GetProperty("id").GetGuid());
        Assert.Equal("completed", command.Status);
        var originalPayload = physical.Payload;
        command.Status = "pending"; await db.SaveChangesAsync(); // Retry exactly the original command.
        Assert.Equal(1, (await service.ProcessMaintenanceCommandsAsync()).Completed);
        Assert.Equal(originalPayload, (await db.RecipePhysicalDeletions.SingleAsync()).Payload);
        Assert.Single(await db.WorkflowLifecycleRecords.ToArrayAsync());
        Assert.True(JsonDocument.Parse(command.Result!).RootElement.GetProperty("recipeDeleted").GetBoolean());
        command.CompletedAt = scope.ServiceProvider.GetRequiredService<IClock>().UtcNow.AddDays(-31); await db.SaveChangesAsync();
        Assert.Equal(1, (await service.PruneMaintenanceCommandsAsync(30, 10)).PrunedCommands);
        using var retained = JsonDocument.Parse((await db.MaintenanceCommandLifecycleRecords.SingleAsync()).Payload);
        var association = Assert.Single(retained.RootElement.GetProperty("physicalRetirements").EnumerateArray());
        Assert.Equal(recipe.Id, association.GetProperty("recipeId").GetGuid());
        Assert.NotEqual(JsonValueKind.Null, association.GetProperty("completedAt").ValueKind);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Maintenance_OriginalCommandCannotChangePayloadOrRetargetAnotherRecipe(bool retarget)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var original = new Recipe { Id = Guid.NewGuid() }; var other = new Recipe { Id = Guid.NewGuid() };
        var command = new MaintenanceCommand { Id = Guid.NewGuid(), CommandType = CaptureFailureService.DeleteFailedCaptureResidueCommand,
            Status = "pending", Payload = JsonSerializer.Serialize(new { recipeId = original.Id, reason = "original" }) };
        db.Recipes.AddRange(original, other); db.MaintenanceCommands.Add(command); await db.SaveChangesAsync();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        Assert.Equal(1, (await service.ProcessMaintenanceCommandsAsync()).Completed);
        var authority = await db.RecipePhysicalDeletions.AsNoTracking().SingleAsync();
        command.Status = "pending";
        command.Payload = JsonSerializer.Serialize(new { recipeId = retarget ? other.Id : original.Id, reason = "changed" });
        await db.SaveChangesAsync();
        var outcome = await service.ProcessMaintenanceCommandsAsync();
        Assert.True(outcome.Failed == 1, JsonSerializer.Serialize(outcome));
        Assert.NotNull(await db.Recipes.FindAsync(other.Id));
        Assert.Equal(authority.PayloadHash, (await db.RecipePhysicalDeletions.AsNoTracking().SingleAsync()).PayloadHash);
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public async Task Maintenance_PreservesExistingDiscoverabilityOrNamedImageEligibility(bool discoverable, bool namedImage)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Id = Guid.NewGuid(), IsDiscoverable = discoverable, Name = namedImage ? "Named" : null, ImageCount = namedImage ? 1 : 0 };
        db.Recipes.Add(recipe);
        db.MaintenanceCommands.Add(new MaintenanceCommand { Id = Guid.NewGuid(), CommandType = CaptureFailureService.DeleteFailedCaptureResidueCommand,
            Status = "pending", Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id }) });
        await db.SaveChangesAsync();
        Assert.Equal(1, (await scope.ServiceProvider.GetRequiredService<ManagementService>().ProcessMaintenanceCommandsAsync()).Skipped);
        Assert.NotNull(await db.Recipes.FindAsync(recipe.Id)); Assert.Empty(await db.RecipePhysicalDeletions.ToArrayAsync());
    }
}
