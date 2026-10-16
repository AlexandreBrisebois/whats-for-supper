using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class DeploymentCalendarStreamTests
{
    [Fact]
    public async Task SmartDefaults_IdentifiesItsAbsoluteMonday()
    {
        await using var factory = await DeploymentCalendarIntegrationTests.CreateAsync();
        using var client = factory.CreateAuthenticatedClient();
        using var body = JsonDocument.Parse(await client.GetStringAsync("/api/schedule/1/smart-defaults?referenceWeekStartDate=2026-10-05"));
        Assert.True(body.RootElement.GetProperty("data").TryGetProperty("weekStartDate", out var monday), "Smart defaults must identify their absolute Monday.");
        Assert.Equal("2026-10-12", monday.GetString());
    }

    [Theory]
    [InlineData("fill_the_gap_invalidated")]
    [InlineData("grocery_updated")]
    public async Task RealStreamEvents_IdentifyPinnedMonday(string expectedEvent)
    {
        await using var factory = await DeploymentCalendarIntegrationTests.CreateAsync();
        var recipeId = Guid.Parse("660e8400-e29b-41d4-a716-446655440011");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.Recipes.Add(new Recipe { Id = recipeId, Name = "Carrot supper", Ingredients = "[\"Carrot\"]" });
            db.WeeklyPlans.Add(new WeeklyPlan
            {
                WeekStartDate = new DateOnly(2026, 10, 5), GroceryState = "{\"Carrot\":true}",
                GroceryItems = JsonSerializer.Serialize(new[] { new GroceryLineItemDto("Carrot", "carrot", "Produce", null, null, [recipeId]) }),
            });
            await db.SaveChangesAsync();
        }
        using var client = factory.CreateAuthenticatedClient();
        client.DefaultRequestHeaders.Add("Cookie", $"x-family-member-id={factory.DefaultFamilyMemberId}");
        using var stream = await client.GetAsync("/api/stream", HttpCompletionOption.ResponseHeadersRead);
        stream.EnsureSuccessStatusCode();
        using var reader = new StreamReader(await stream.Content.ReadAsStreamAsync());
        using var connected = await DeploymentCalendarPostgresTests.ReadEvent(reader, "connected");
        Assert.Equal("2026-10-05", connected.RootElement.GetProperty("schedule").GetProperty("weekStartDate").GetString());
        var calendar = connected.RootElement.GetProperty("schedule").GetProperty("calendar");
        Assert.True(calendar.TryGetProperty("today", out var today), "Stream calendar must use the same camel-case contract as HTTP.");
        Assert.Equal("2026-10-11", today.GetString());
        Assert.Equal("America/Toronto", calendar.GetProperty("timeZone").GetString());
        (await client.PostAsJsonAsync("/api/schedule/assign?referenceWeekStartDate=2026-10-05", new { weekOffset = 0, dayIndex = 6, recipeId })).EnsureSuccessStatusCode();
        if (expectedEvent == "fill_the_gap_invalidated")
        {
            using var week = await DeploymentCalendarPostgresTests.ReadEvent(reader, "week_updated");
            Assert.True(week.RootElement.GetProperty("schedule").GetProperty("calendar").TryGetProperty("today", out _), "Broadcast calendar must use the same camel-case contract as connected/HTTP.");
        }
        using var frame = await DeploymentCalendarPostgresTests.ReadEvent(reader, expectedEvent);
        Assert.True(frame.RootElement.TryGetProperty("weekStartDate", out var monday), "Week-specific frames must identify their absolute Monday.");
        Assert.Equal("2026-10-05", monday.GetString());
    }
}
