using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class WorkflowTaskDiagnosticsIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateWithAuthAsync();
        _client = _factory.CreateAuthenticatedClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task GetDiagnostics_ReturnsStoredFailureDetails_ForAuthenticatedRequest()
    {
        var (instanceId, taskId) = await SeedFailedTaskAsync();

        var response = await _client.GetAsync($"/api/workflows/tasks/{taskId}/diagnostics");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var envelope = await response.Content.ReadFromJsonAsync<WorkflowTaskDiagnosticsEnvelope>();
        var diagnostics = Assert.IsType<WorkflowTaskDiagnosticsResponse>(envelope?.Data);
        Assert.Equal(taskId, diagnostics.TaskId);
        Assert.Equal(instanceId, diagnostics.InstanceId);
        Assert.Equal("recipe-import", diagnostics.WorkflowId);
        Assert.Equal("extract-recipe", diagnostics.TaskName);
        Assert.Equal("RecipeExtractionProcessor", diagnostics.ProcessorName);
        Assert.Equal("Failed", diagnostics.Status);
        Assert.Equal(2, diagnostics.RetryCount);
        Assert.Equal("The extractor returned no steps.", diagnostics.ErrorMessage);
        Assert.Equal("System.InvalidOperationException: missing steps\n   at Extract()", diagnostics.StackTrace);
    }

    [Fact]
    public async Task GetDiagnostics_ReturnsNotFound_WhenTaskDoesNotExist()
    {
        var response = await _client.GetAsync($"/api/workflows/tasks/{Guid.NewGuid()}/diagnostics");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetDiagnostics_ReturnsUnauthorized_WithoutHearthCredentials()
    {
        using var anonymousClient = _factory.CreateClient();

        var response = await anonymousClient.GetAsync($"/api/workflows/tasks/{Guid.NewGuid()}/diagnostics");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private async Task<(Guid InstanceId, Guid TaskId)> SeedFailedTaskAsync()
    {
        var instanceId = Guid.NewGuid();
        var taskId = Guid.NewGuid();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var now = DateTimeOffset.UtcNow;

        db.WorkflowInstances.Add(new WorkflowInstance
        {
            Id = instanceId,
            WorkflowId = "recipe-import",
            Status = WorkflowStatus.Failed,
            CreatedAt = now,
            UpdatedAt = now
        });
        db.WorkflowTasks.Add(new WorkflowTask
        {
            TaskId = taskId,
            InstanceId = instanceId,
            TaskName = "extract-recipe",
            ProcessorName = "RecipeExtractionProcessor",
            Status = RecipeApi.Models.TaskStatus.Failed,
            RetryCount = 2,
            ErrorMessage = "The extractor returned no steps.",
            StackTrace = "System.InvalidOperationException: missing steps\n   at Extract()",
            CreatedAt = now,
            UpdatedAt = now
        });
        await db.SaveChangesAsync();

        return (instanceId, taskId);
    }

    private sealed class WorkflowTaskDiagnosticsEnvelope
    {
        public WorkflowTaskDiagnosticsResponse? Data { get; init; }
    }

    private sealed class WorkflowTaskDiagnosticsResponse
    {
        public Guid TaskId { get; init; }
        public Guid InstanceId { get; init; }
        public string WorkflowId { get; init; } = string.Empty;
        public string TaskName { get; init; } = string.Empty;
        public string ProcessorName { get; init; } = string.Empty;
        public string Status { get; init; } = string.Empty;
        public int RetryCount { get; init; }
        public string? ErrorMessage { get; init; }
        public string? StackTrace { get; init; }
    }
}
