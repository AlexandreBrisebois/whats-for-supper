using System.Net;
using System.Text.Json;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Controllers;

public class HealthControllerTests : IAsyncLifetime
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

    // ── GET /health ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Health_Returns_Ok_With_Healthy_Status()
    {
        var response = await _client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.Equal("healthy", doc.RootElement.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Health_Response_Includes_Required_Checks()
    {
        var response = await _client.GetAsync("/health");
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        Assert.True(doc.RootElement.TryGetProperty("status",    out _), "missing 'status'");
        Assert.True(doc.RootElement.TryGetProperty("timestamp", out _), "missing 'timestamp'");
        Assert.True(doc.RootElement.TryGetProperty("checks",    out var checks), "missing 'checks'");

        Assert.True(checks.TryGetProperty("database", out _), "missing 'checks.database'");
        Assert.True(checks.TryGetProperty("schema",   out _), "missing 'checks.schema'");
    }

    [Fact]
    public async Task Health_Checks_Report_Healthy_With_InMemory_Db()
    {
        var response = await _client.GetAsync("/health");
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var checks = doc.RootElement.GetProperty("checks");

        Assert.Equal("healthy", checks.GetProperty("database").GetProperty("status").GetString());
        Assert.Equal("healthy", checks.GetProperty("schema").GetProperty("status").GetString());
    }
}
