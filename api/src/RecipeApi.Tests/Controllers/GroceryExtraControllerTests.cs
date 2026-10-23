using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Controllers;

public sealed class GroceryExtraControllerTests
{
    [Fact]
    public async Task GroceryExtra_CreateResponse_MatchesTheUnwrappedOpenApiShape()
    {
        await using var app = await TestWebApplicationFactory.CreateWithAuthAsync();
        using var scope = app.Services.CreateScope();
        var clock = scope.ServiceProvider.GetRequiredService<IClock>();
        var calendar = scope.ServiceProvider.GetRequiredService<DeploymentCalendar>();
        var week = calendar.Capture(clock.UtcNow).CurrentWeekStartDate;
        using var client = app.CreateAuthenticatedClient();

        var response = await client.PostAsJsonAsync("/api/grocery-extras", new
        {
            clientId = Guid.NewGuid(),
            weekStartDate = week,
            name = "Coffee"
        });

        var responseBody = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == HttpStatusCode.Created,
            $"Expected 201 Created but received {(int)response.StatusCode}: {responseBody}");
        using var json = JsonDocument.Parse(responseBody);
        Assert.Equal("Coffee", json.RootElement.GetProperty("name").GetString());
        Assert.False(json.RootElement.TryGetProperty("data", out _));
    }
}
