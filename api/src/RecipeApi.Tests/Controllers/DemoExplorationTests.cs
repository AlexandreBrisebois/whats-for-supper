using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Controllers;

public class DemoExplorationTests
{
    [Fact]
    public async Task RuntimeOpenApiIncludesEarlyDemoRefusalForPdf()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/openapi/v1.json");
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(document.RootElement.GetProperty("paths").GetProperty("/api/recipes/capture-pdf")
            .GetProperty("post").GetProperty("responses").TryGetProperty("403", out _));
    }

    [Theory]
    [InlineData("/api/recipes")]
    [InlineData("/api/recipes/capture-pdf")]
    [InlineData("/api/recipes/capture-url")]
    [InlineData("/api/recipes/describe")]
    [InlineData("/api/recipes/imports/bulk")]
    [InlineData("/api/recipes/00000000-0000-4000-8000-000000000001/originals")]
    [InlineData("/api/recipes/00000000-0000-4000-8000-000000000001/hero/regenerate")]
    [InlineData("/api/recipes/00000000-0000-4000-8000-000000000001/import-report")]
    [InlineData("/api/captures/failures/00000000-0000-4000-8000-000000000001/retry")]
    public async Task DemoRejectsBeforeBindingOrHouseholdMutation(string path)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["DEMO_MODE"] = "true" });
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        using var content = new StringContent("malformed synthetic private upload", Encoding.UTF8);
        // Preserve endpoint media-type selection; the resource filter must still run
        // before a selected multipart action attempts to parse this invalid body.
        content.Headers.ContentType = System.Net.Http.Headers.MediaTypeHeaderValue.Parse(
            path.EndsWith("/originals", StringComparison.Ordinal)
                ? "multipart/form-data; boundary=synthetic"
                : "application/json");
        using var response = await client.PostAsync(path, content);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(403, json.RootElement.GetProperty("status").GetInt32());
        Assert.Equal("DEMO_AI_UNAVAILABLE", json.RootElement.GetProperty("code").GetString());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.Empty(db.Recipes);
        Assert.Empty(db.WorkflowInstances);
        var root = scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root;
        Assert.StartsWith(Path.Combine(Path.GetTempPath(), "wfs-test-"), root);
        Assert.Empty(Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories));
    }
}
