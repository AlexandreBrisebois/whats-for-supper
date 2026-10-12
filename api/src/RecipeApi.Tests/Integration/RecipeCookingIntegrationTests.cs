using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class RecipeCookingIntegrationTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task CookingRecipe_UpdatesRotationWithoutCompletingDifferentSupper(bool matchesSupper)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var client = factory.CreateClient();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var lunchId = Guid.NewGuid();
        var supperId = Guid.NewGuid();
        var date = DateOnly.FromDateTime(DateTime.UtcNow);
        db.Recipes.AddRange(
            new Recipe { Id = lunchId, Name = "Lunch", IsReady = true },
            new Recipe { Id = supperId, Name = "Supper", IsReady = true });
        db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), RecipeId = supperId, Date = date, Status = CalendarEventStatus.Planned });
        await db.SaveChangesAsync();
        var cookedId = matchesSupper ? supperId : lunchId;
        var untouchedId = matchesSupper ? lunchId : supperId;

        var response = await client.PostAsJsonAsync($"/api/schedule/day/{date:yyyy-MM-dd}/validate", new { status = 2, recipeId = cookedId });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        db.ChangeTracker.Clear();
        Assert.NotNull((await db.Recipes.FindAsync(cookedId))!.LastCookedDate);
        Assert.Null((await db.Recipes.FindAsync(untouchedId))!.LastCookedDate);
        Assert.Equal(matchesSupper ? CalendarEventStatus.Cooked : CalendarEventStatus.Planned,
            db.CalendarEvents.Single(e => e.Date == date).Status);

        // The same persisted timestamp drives library filtering and rotation order.
        var summary = await client.GetFromJsonAsync<JsonElement>("/api/recipes/library-summary");
        Assert.Equal(1, summary.GetProperty("data").GetProperty("neverCooked").GetInt32());
        var list = await client.GetFromJsonAsync<RecipeListResponseDto>("/api/recipes?order=explore");
        Assert.Equal(untouchedId, list!.Recipes[0].Id);
        Assert.Equal(cookedId, list.Recipes[1].Id);
    }

    [Fact]
    public async Task CookingMissingRecipe_ReturnsNotFoundWithoutCompletingSupper()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/schedule/day/2026-10-11/validate", new { status = 2, recipeId = Guid.NewGuid() });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
