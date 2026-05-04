using System.Net;
using System.Net.Http.Json;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>
/// Verifies that the HearthSecret authentication scheme is wired up correctly
/// and enforced globally on protected endpoints.
///
/// These tests use <see cref="TestWebApplicationFactory.CreateWithAuthAsync"/> so
/// the full auth stack (handler + global AuthorizeFilter) is active. Business-logic
/// tests use the default factory (no auth) and are not affected.
/// </summary>
public class AuthEnforcementTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateWithAuthAsync();
    }

    public async Task DisposeAsync()
    {
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task NoCredentials_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/recipes/describe", new
        {
            name = "test",
            description = "test"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task WrongSecret_Returns401()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Hearth-Secret", "wrong-secret");
        var response = await client.PostAsJsonAsync("/api/recipes/describe", new
        {
            name = "test",
            description = "test"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CorrectSecret_HeaderPasses()
    {
        var client = _factory.CreateAuthenticatedClient();
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/recipes/describe")
        {
            Content = System.Net.Http.Json.JsonContent.Create(new
            {
                name = "Auth test recipe",
                description = "Verifies that a valid X-Hearth-Secret header is accepted"
            })
        };
        request.Headers.Add("X-Family-Member-Id", _factory.DefaultFamilyMemberId.ToString());
        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AllowAnonymousEndpoint_PassesWithoutCredentials()
    {
        // GET /health is decorated [AllowAnonymous] — must remain accessible
        // without credentials even when auth enforcement is enabled.
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
