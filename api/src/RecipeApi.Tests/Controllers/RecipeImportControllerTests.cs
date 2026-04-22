using System.Net;
using System.Text.Json;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Controllers;

public class RecipeImportControllerTests : IAsyncLifetime
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

    [Fact]
    public async Task GetImportSummary_Returns_Ok_With_Counts()
    {
        // Act
        var response = await _client.GetAsync("/api/recipes/import-status");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var data = doc.RootElement.GetProperty("data");

        Assert.True(data.TryGetProperty("importedCount", out _), "Missing 'importedCount'");
        Assert.True(data.TryGetProperty("queueCount",    out _), "Missing 'queueCount'");
        Assert.True(data.TryGetProperty("failedCount",   out _), "Missing 'failedCount'");
    }
}
