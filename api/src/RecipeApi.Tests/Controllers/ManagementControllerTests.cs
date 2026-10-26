using System.Net;
using System.Text.Json;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Moq;
using RecipeApi.Models;

namespace RecipeApi.Tests.Controllers;

public class ManagementControllerTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client  = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    // ── GET /api/management/status ──────────────────────────────────────────

    [Fact]
    public async Task GetStatus_Returns_NotFound_When_No_Workflows_Run()
    {
        var response = await _client.GetAsync("/api/management/status");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/management/demo-capture", "demo-capture", "Demo capture task enqueued.")]
    [InlineData("/api/management/demo-restore", "demo-restore", "Demo restore task enqueued.")]
    public async Task Demo_Management_Endpoints_Enqueue_Workflows(string path, string workflowId, string message)
    {
        var response = await _client.PostAsync(path, content: null);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.Equal(message, doc.RootElement.GetProperty("message").GetString());
        var taskId = doc.RootElement.GetProperty("taskId").GetGuid();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var instance = await db.WorkflowInstances.FindAsync(taskId);

        Assert.NotNull(instance);
        Assert.Equal(workflowId, instance.WorkflowId);
    }

    [Fact]
    public async Task GetStatus_Reports_DemoSnapshotMissing_When_DemoFilesAbsent()
    {
        var enqueue = await _client.PostAsync("/api/management/demo-restore", content: null);
        Assert.Equal(HttpStatusCode.Accepted, enqueue.StatusCode);

        var response = await _client.GetAsync("/api/management/status");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.False(doc.RootElement.GetProperty("demoSnapshotReady").GetBoolean());

        var missing = doc.RootElement.GetProperty("demoSnapshotMissing")
            .EnumerateArray()
            .Select(x => x.GetString())
            .OfType<string>()
            .ToArray();

        Assert.Contains("current", missing);
    }

    [Fact]
    public async Task GetStatus_Reports_InvalidCron_SeederErrorCode()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
        {
            ["DEMO_MODE"] = "true",
            ["DEMO_RESTORE_CRON_UTC"] = "invalid"
        });
        using var client = factory.CreateClient();

        // Persist server-owned work; demo visitors cannot manually trigger a reset.
        using (var scope = factory.Services.CreateScope())
            await scope.ServiceProvider.GetRequiredService<IWorkflowOrchestrator>().TriggerAsync("demo-restore", []);

        var response = await client.GetAsync("/api/management/status");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.False(doc.RootElement.GetProperty("demoRestoreSeederHealthy").GetBoolean());
        Assert.Equal("INVALID_CRON", doc.RootElement.GetProperty("demoRestoreSeederErrorCode").GetString());
    }

    [Fact]
    public async Task GetStatus_DoesNotCertifyRecurrenceFromValidCronAlone()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
        {
            ["DEMO_MODE"] = "true",
            ["DEMO_RESTORE_CRON_UTC"] = "0 3 * * *"
        });
        using var client = factory.CreateClient();

        // Persist server-owned work; demo visitors cannot manually trigger a reset.
        using (var scope = factory.Services.CreateScope())
            await scope.ServiceProvider.GetRequiredService<IWorkflowOrchestrator>().TriggerAsync("demo-restore", []);

        var response = await client.GetAsync("/api/management/status");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.False(doc.RootElement.GetProperty("demoSnapshotReady").GetBoolean());
        Assert.False(doc.RootElement.GetProperty("demoRestoreSeederHealthy").GetBoolean());
        Assert.True(doc.RootElement.GetProperty("demoRestoreCronValid").GetBoolean());
        Assert.Equal("NO_CONFIRMED_SUCCESSOR", doc.RootElement.GetProperty("demoRestoreSeederErrorCode").GetString());
        Assert.Equal("RECAPTURE_REQUIRED", doc.RootElement.GetProperty("demoSnapshotErrorCode").GetString());
        Assert.Equal(JsonValueKind.Null, doc.RootElement.GetProperty("demoNextRestoreAt").ValueKind);
    }    [Fact]
    public async Task Backfill_search_does_not_return_acceptance_before_persisted_dispatch()
    {
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var accepted = new TaskCompletionSource<WorkflowInstance>(TaskCreationOptions.RunContinuationsAsynchronously);
        _factory.WorkflowOrchestratorMock.Setup(o => o.TriggerAsync("search-reconciliation", It.IsAny<Dictionary<string, string>>(), null))
            .Callback(() => { entered.TrySetResult(); }).Returns(accepted.Task);
        var request = _client.PostAsync("/api/management/backfill-search", null);
        try
        {
            await entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
            await Task.WhenAny(request, Task.Delay(500));
            Assert.False(request.IsCompleted);
        }
        finally
        {
            accepted.TrySetResult(new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "search-reconciliation" });
            await request;
        }
        Assert.Equal(HttpStatusCode.Accepted, (await request).StatusCode);
    }

}
