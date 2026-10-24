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
    [Fact]
    public async Task GroceryExtra_LifecyclePublishesOnlyToOtherConnectionsAndHistoryStaysHouseholdScoped()
    {
        await using var app = await TestWebApplicationFactory.CreateWithAuthAsync();
        await using var otherHousehold = await TestWebApplicationFactory.CreateWithAuthAsync();
        using var scope = app.Services.CreateScope();
        var manager = scope.ServiceProvider.GetRequiredService<SseConnectionManager>();
        using var ownBody = new MemoryStream();
        using var otherBody = new MemoryStream();
        var ownContext = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        var otherContext = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        ownContext.Response.Body = ownBody;
        otherContext.Response.Body = otherBody;
        var ownId = manager.AddConnection(ownContext.Response);
        var otherId = manager.AddConnection(otherContext.Response);
        try
        {
            using var client = app.CreateAuthenticatedClient();
            client.DefaultRequestHeaders.Add("X-SSE-Connection-ID", ownId);
            var clock = scope.ServiceProvider.GetRequiredService<IClock>();
            var week = scope.ServiceProvider.GetRequiredService<DeploymentCalendar>().Capture(clock.UtcNow).CurrentWeekStartDate;
            var id = Guid.NewGuid();
            Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/grocery-extras", new { clientId = id, weekStartDate = week, name = "Milk" })).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/grocery-extras/{id}", new { weekStartDate = week, expectedVersion = 1, @checked = true })).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/grocery-extras/{id}", new { weekStartDate = week, expectedVersion = 2, name = "Milk bags" })).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/grocery-extras/{id}", new { weekStartDate = week, expectedVersion = 3, grocerySection = "Pantry" })).StatusCode);
            using var suggestions = JsonDocument.Parse(await client.GetStringAsync("/api/grocery-extras/suggestions?query=mi"));
            Assert.Equal("Milk bags", suggestions.RootElement.GetProperty("names")[0].GetString());
            using var isolatedClient = otherHousehold.CreateAuthenticatedClient();
            using var isolated = JsonDocument.Parse(await isolatedClient.GetStringAsync("/api/grocery-extras/suggestions?query=mi"));
            Assert.Empty(isolated.RootElement.GetProperty("names").EnumerateArray());
            Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/grocery-extras/{id}?weekStartDate={week:yyyy-MM-dd}&expectedVersion=4")).StatusCode);
            Assert.Empty(ownBody.ToArray());
            var frames = System.Text.Encoding.UTF8.GetString(otherBody.ToArray());
            Assert.Equal(5, frames.Split("event: grocery_extras_updated").Length - 1);
            Assert.Contains($"\"weekStartDate\":\"{week:yyyy-MM-dd}\"", frames);
        }
        finally { manager.RemoveConnection(ownId); manager.RemoveConnection(otherId); }
    }
}
