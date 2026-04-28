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
}
