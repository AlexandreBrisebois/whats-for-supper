using System.Net;
using System.Text.Json;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

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

        Assert.Contains("manifest.json", missing);
        Assert.Contains("family-members.json", missing);
        Assert.Contains("recipes.json", missing);
        Assert.Contains("recipe-search-documents.json", missing);
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

        var enqueue = await client.PostAsync("/api/management/demo-restore", content: null);
        Assert.Equal(HttpStatusCode.Accepted, enqueue.StatusCode);

        var response = await client.GetAsync("/api/management/status");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.False(doc.RootElement.GetProperty("demoRestoreSeederHealthy").GetBoolean());
        Assert.Equal("INVALID_CRON", doc.RootElement.GetProperty("demoRestoreSeederErrorCode").GetString());
    }

    [Fact]
    public async Task GetStatus_Reports_SeederHealthy_WhenCronValid_EvenIfSnapshotMissing()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
        {
            ["DEMO_MODE"] = "true",
            ["DEMO_RESTORE_CRON_UTC"] = "0 3 * * *"
        });
        using var client = factory.CreateClient();

        var enqueue = await client.PostAsync("/api/management/demo-restore", content: null);
        Assert.Equal(HttpStatusCode.Accepted, enqueue.StatusCode);

        var response = await client.GetAsync("/api/management/status");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.False(doc.RootElement.GetProperty("demoSnapshotReady").GetBoolean());
        Assert.True(doc.RootElement.GetProperty("demoRestoreSeederHealthy").GetBoolean());
        Assert.True(doc.RootElement.GetProperty("demoRestoreSeederErrorCode").ValueKind == JsonValueKind.Null);
    }
}
