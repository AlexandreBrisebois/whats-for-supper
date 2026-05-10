using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class CaptureFailureIntegrationTests : IAsyncLifetime
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
    public async Task GetFailures_ExcludesScheduledRetryTasks()
    {
        var instanceId = await SeedWorkflowAsync(
            workflowId: "url-import",
            instanceStatus: WorkflowStatus.Processing,
            taskStatus: RecipeApi.Models.TaskStatus.Pending,
            scheduledAt: DateTimeOffset.UtcNow.AddHours(2));

        var response = await _client.GetAsync("/api/captures/failures");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(instanceId.ToString(), json);
    }

    [Fact]
    public async Task GetFailures_ReturnsPausedCaptureWorkflow_WithFailedTask()
    {
        var instanceId = await SeedWorkflowAsync(
            workflowId: "url-import",
            instanceStatus: WorkflowStatus.Paused,
            taskStatus: RecipeApi.Models.TaskStatus.Failed);

        var response = await _client.GetAsync("/api/captures/failures");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        Assert.Contains(instanceId.ToString(), json);
        Assert.Contains("url-import", json);
    }

    [Fact]
    public async Task GetFailures_ExcludesPausedNonCaptureWorkflow()
    {
        var instanceId = await SeedWorkflowAsync(
            workflowId: "db-backup",
            instanceStatus: WorkflowStatus.Paused,
            taskStatus: RecipeApi.Models.TaskStatus.Failed);

        var response = await _client.GetAsync("/api/captures/failures");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(instanceId.ToString(), json);
    }

    [Fact]
    public async Task Retry_ResetsFailedTask_AndResumesWorkflow()
    {
        var instanceId = await SeedWorkflowAsync(
            workflowId: "recipe-import",
            instanceStatus: WorkflowStatus.Paused,
            taskStatus: RecipeApi.Models.TaskStatus.Failed,
            retryCount: 3);

        var response = await _client.PostAsync($"/api/captures/failures/{instanceId}/retry", null);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var body = await ReadDataAsync<RetryResponseBody>(response);
        Assert.True(body.Queued);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var instance = await db.WorkflowInstances.Include(i => i.Tasks).SingleAsync(i => i.Id == instanceId);
        var task = Assert.Single(instance.Tasks);
        Assert.Equal(WorkflowStatus.Processing, instance.Status);
        Assert.Equal(RecipeApi.Models.TaskStatus.Pending, task.Status);
        Assert.Null(task.ErrorMessage);
        Assert.Null(task.StackTrace);
        Assert.True(task.ScheduledAt <= DateTimeOffset.UtcNow.AddSeconds(5));
    }

    [Fact]
    public async Task Clear_RemovesWorkflow_AndQueuesCleanupCommand()
    {
        var recipeId = await SeedPlaceholderRecipeAsync();
        var instanceId = await SeedWorkflowAsync(
            workflowId: "url-import",
            instanceStatus: WorkflowStatus.Paused,
            taskStatus: RecipeApi.Models.TaskStatus.Failed,
            recipeId: recipeId);

        var response = await _client.DeleteAsync($"/api/captures/failures/{instanceId}");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var body = await ReadDataAsync<ClearResponseBody>(response);
        Assert.True(body.Cleared);
        Assert.NotEqual(Guid.Empty, body.CleanupCommandId);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.False(await db.WorkflowInstances.AnyAsync(i => i.Id == instanceId));
        Assert.False(await db.WorkflowTasks.AnyAsync(t => t.InstanceId == instanceId));
        Assert.True(await db.MaintenanceCommands.AnyAsync(c => c.Id == body.CleanupCommandId && c.Status == "pending"));

        var recipe = await db.Recipes.IgnoreQueryFilters().SingleAsync(r => r.Id == recipeId);
        Assert.NotNull(recipe.DeletedAt);
    }

    [Fact]
    public async Task DreamingMaintenance_DeletesSafeResidue_AndRecordsResult()
    {
        var recipeId = await SeedPlaceholderRecipeAsync();
        var recipesRoot = _factory.Services.GetRequiredService<RecipesRootResolver>().Root;
        var recipeDir = Path.Combine(recipesRoot, recipeId.ToString());
        Directory.CreateDirectory(recipeDir);
        await File.WriteAllTextAsync(Path.Combine(recipeDir, "recipe.info"), "{}");

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.MaintenanceCommands.Add(new MaintenanceCommand
            {
                CommandType = CaptureFailureService.DeleteFailedCaptureResidueCommand,
                Status = "pending",
                Payload = JsonSerializer.Serialize(new
                {
                    recipeId,
                    workflowInstanceId = Guid.NewGuid(),
                    sourceWorkflowId = "url-import",
                    reason = "test",
                }),
                CreatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
            var result = await service.ProcessMaintenanceCommandsAsync();
            Assert.Equal(1, result.Completed);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            Assert.False(await db.Recipes.IgnoreQueryFilters().AnyAsync(r => r.Id == recipeId));
            var command = await db.MaintenanceCommands.SingleAsync();
            Assert.Equal("completed", command.Status);
            Assert.Contains("recipeDeleted", command.Result);
        }
        Assert.False(Directory.Exists(recipeDir));
    }

    [Fact]
    public async Task DreamingMaintenance_SkipsReadyRecipe()
    {
        var recipeId = await SeedPlaceholderRecipeAsync(isReady: true);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.MaintenanceCommands.Add(new MaintenanceCommand
            {
                CommandType = CaptureFailureService.DeleteFailedCaptureResidueCommand,
                Status = "pending",
                Payload = JsonSerializer.Serialize(new
                {
                    recipeId,
                    workflowInstanceId = Guid.NewGuid(),
                    sourceWorkflowId = "recipe-import",
                    reason = "test",
                }),
                CreatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
            var result = await service.ProcessMaintenanceCommandsAsync();
            Assert.Equal(1, result.Skipped);
        }

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.True(await verifyDb.Recipes.IgnoreQueryFilters().AnyAsync(r => r.Id == recipeId));
        Assert.Equal("skipped", (await verifyDb.MaintenanceCommands.SingleAsync()).Status);
    }

    private async Task<Guid> SeedPlaceholderRecipeAsync(bool isReady = false)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = isReady ? "Ready Recipe" : "Captured Recipe",
            AddedBy = _factory.DefaultFamilyMemberId,
            SourceUrl = "https://example.com/recipe",
            Rating = RecipeRating.Unknown,
            ImageCount = isReady ? 1 : 0,
            IsDiscoverable = isReady,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        return recipe.Id;
    }

    private async Task<Guid> SeedWorkflowAsync(
        string workflowId,
        WorkflowStatus instanceStatus,
        RecipeApi.Models.TaskStatus taskStatus,
        Guid? recipeId = null,
        DateTimeOffset? scheduledAt = null,
        int retryCount = 0)
    {
        recipeId ??= await SeedPlaceholderRecipeAsync();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var instance = new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = workflowId,
            Status = instanceStatus,
            Parameters = JsonSerializer.Serialize(new Dictionary<string, string>
            {
                ["recipeId"] = recipeId.Value.ToString(),
                ["url"] = "https://example.com/recipe",
            }),
            CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-5),
            UpdatedAt = DateTimeOffset.UtcNow.AddMinutes(-1),
        };
        instance.Tasks.Add(new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = instance.Id,
            TaskName = "extract_recipe",
            ProcessorName = "ExtractRecipe",
            Status = taskStatus,
            ScheduledAt = scheduledAt,
            RetryCount = retryCount,
            ErrorMessage = taskStatus == RecipeApi.Models.TaskStatus.Failed ? "Fatal extraction failure" : "Temporary failure",
            StackTrace = taskStatus == RecipeApi.Models.TaskStatus.Failed ? "stack" : null,
            DependsOn = [],
            CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-5),
            UpdatedAt = DateTimeOffset.UtcNow.AddMinutes(-1),
        });

        db.WorkflowInstances.Add(instance);
        await db.SaveChangesAsync();
        return instance.Id;
    }

    private static async Task<T> ReadDataAsync<T>(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        var doc = JsonSerializer.Deserialize<JsonElement>(json);
        var data = doc.GetProperty("data");
        return JsonSerializer.Deserialize<T>(data.GetRawText(), new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
        })!;
    }

    private record RetryResponseBody(bool Queued);
    private record ClearResponseBody(bool Cleared, Guid CleanupCommandId);
}
