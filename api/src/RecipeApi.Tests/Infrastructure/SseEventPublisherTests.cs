using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Infrastructure;

/// <summary>
/// Verifies that each <see cref="SseEventPublisher"/> method calls
/// <see cref="SseConnectionManager.BroadcastAsync"/> with the correct
/// event type string and a serialised payload that matches the contract.
/// </summary>
public class SseEventPublisherTests
{
    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /// <summary>
    /// Creates a real <see cref="SseConnectionManager"/> wired to an in-memory
    /// response body so we can inspect the raw SSE bytes without network I/O.
    /// </summary>
    private static (SseConnectionManager Manager, MemoryStream Body) MakeManager()
    {
        var manager = new SseConnectionManager();
        var ctx = new DefaultHttpContext();
        var body = new MemoryStream();
        ctx.Response.Body = body;
        manager.AddConnection(ctx.Response);
        return (manager, body);
    }

    private static string ReadBody(MemoryStream body)
    {
        body.Position = 0;
        return Encoding.UTF8.GetString(body.ToArray());
    }

    /// <summary>
    /// Parses the raw SSE frame and returns (eventType, dataJson).
    /// Expected format: "event: {type}\ndata: {json}\n\n"
    /// </summary>
    private static (string EventType, JsonElement Data) ParseSseFrame(string raw)
    {
        var lines = raw.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        var eventType = lines[0].Replace("event: ", "").Trim();
        var dataJson = lines[1].Replace("data: ", "").Trim();
        return (eventType, JsonDocument.Parse(dataJson).RootElement);
    }

    // -------------------------------------------------------------------------
    // PublishSlotUpdatedAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task PublishSlotUpdatedAsync_BroadcastsCorrectEventTypeAndPayload()
    {
        var (manager, body) = MakeManager();
        var publisher = new SseEventPublisher(manager);

        var date = new DateOnly(2025, 6, 15);
        var recipe = new ScheduleRecipeDto(Guid.NewGuid(), "Lasagna", "/img/lasagna.jpg");
        const int status = 0;

        await publisher.PublishSlotUpdatedAsync(date, recipe, status);

        var (eventType, data) = ParseSseFrame(ReadBody(body));

        Assert.Equal("slot_updated", eventType);
        Assert.Equal("2025-06-15", data.GetProperty("date").GetString());
        Assert.Equal(recipe.Id.ToString(), data.GetProperty("recipe").GetProperty("id").GetString());
        Assert.Equal(status, data.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task PublishSlotUpdatedAsync_NullRecipe_SerializesNullInPayload()
    {
        var (manager, body) = MakeManager();
        var publisher = new SseEventPublisher(manager);

        await publisher.PublishSlotUpdatedAsync(new DateOnly(2025, 6, 15), null, 3);

        var (eventType, data) = ParseSseFrame(ReadBody(body));

        Assert.Equal("slot_updated", eventType);
        Assert.Equal(JsonValueKind.Null, data.GetProperty("recipe").ValueKind);
        Assert.Equal(3, data.GetProperty("status").GetInt32());
    }

    // -------------------------------------------------------------------------
    // PublishWeekUpdatedAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task PublishWeekUpdatedAsync_BroadcastsCorrectEventTypeAndPayload()
    {
        var (manager, body) = MakeManager();
        var publisher = new SseEventPublisher(manager);

        var schedule = new ScheduleDays(0, false, 0, []);

        await publisher.PublishWeekUpdatedAsync(schedule);

        var (eventType, data) = ParseSseFrame(ReadBody(body));

        Assert.Equal("week_updated", eventType);
        Assert.Equal(0, data.GetProperty("schedule").GetProperty("weekOffset").GetInt32());
    }

    [Fact]
    public async Task PublishWeekUpdatedAsync_WithEchoSeq_SerializesEchoSeq()
    {
        var (manager, body) = MakeManager();
        var publisher = new SseEventPublisher(manager);

        var schedule = new ScheduleDays(0, false, 0, []);

        await publisher.PublishWeekUpdatedAsync(schedule, echoSeq: 5);

        var (eventType, data) = ParseSseFrame(ReadBody(body));

        Assert.Equal("week_updated", eventType);
        Assert.Equal(5, data.GetProperty("echoSeq").GetInt32());
    }

    // -------------------------------------------------------------------------
    // PublishVoteUpdatedAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task PublishVoteUpdatedAsync_BroadcastsCorrectEventTypeAndPayload()
    {
        var (manager, body) = MakeManager();
        var publisher = new SseEventPublisher(manager);

        var recipeId = Guid.NewGuid();
        const int voteCount = 3;

        await publisher.PublishVoteUpdatedAsync(recipeId, voteCount);

        var (eventType, data) = ParseSseFrame(ReadBody(body));

        Assert.Equal("vote_updated", eventType);
        Assert.Equal(recipeId.ToString(), data.GetProperty("recipeId").GetString());
        Assert.Equal(voteCount, data.GetProperty("voteCount").GetInt32());
    }

    // -------------------------------------------------------------------------
    // PublishSmartDefaultsUpdatedAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task PublishSmartDefaultsUpdatedAsync_BroadcastsCorrectEventTypeAndPayload()
    {
        var (manager, body) = MakeManager();
        var publisher = new SseEventPublisher(manager);

        var defaults = new SmartDefaultsDto(0, 4, 3, [], [], 0);

        await publisher.PublishSmartDefaultsUpdatedAsync(0, defaults);

        var (eventType, data) = ParseSseFrame(ReadBody(body));

        Assert.Equal("smart_defaults_updated", eventType);
        Assert.Equal(0, data.GetProperty("weekOffset").GetInt32());
        Assert.Equal(4, data.GetProperty("defaults").GetProperty("familySize").GetInt32());
    }

    // -------------------------------------------------------------------------
    // PublishFillTheGapInvalidatedAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task PublishFillTheGapInvalidatedAsync_BroadcastsCorrectEventTypeAndPayload()
    {
        var (manager, body) = MakeManager();
        var publisher = new SseEventPublisher(manager);

        await publisher.PublishFillTheGapInvalidatedAsync(1);

        var (eventType, data) = ParseSseFrame(ReadBody(body));

        Assert.Equal("fill_the_gap_invalidated", eventType);
        Assert.Equal(1, data.GetProperty("weekOffset").GetInt32());
    }

    // -------------------------------------------------------------------------
    // PublishRecipeReadyAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task PublishRecipeReadyAsync_BroadcastsCorrectEventTypeAndPayload()
    {
        var (manager, body) = MakeManager();
        var publisher = new SseEventPublisher(manager);

        var recipeId = Guid.NewGuid();
        const string name = "Spaghetti Carbonara";
        var imageUrl = $"/api/recipes/{recipeId}/image/0";

        await publisher.PublishRecipeReadyAsync(recipeId, name, imageUrl);

        var (eventType, data) = ParseSseFrame(ReadBody(body));

        Assert.Equal("recipe_ready", eventType);
        Assert.Equal(recipeId.ToString(), data.GetProperty("recipeId").GetString());
        Assert.Equal(name, data.GetProperty("name").GetString());
        Assert.Equal(imageUrl, data.GetProperty("imageUrl").GetString());
    }

    [Fact]
    public async Task PublishRecipeReadyAsync_NullImageUrl_SerializesNullInPayload()
    {
        var (manager, body) = MakeManager();
        var publisher = new SseEventPublisher(manager);

        var recipeId = Guid.NewGuid();

        await publisher.PublishRecipeReadyAsync(recipeId, "No Image Recipe", null);

        var (eventType, data) = ParseSseFrame(ReadBody(body));

        Assert.Equal("recipe_ready", eventType);
        Assert.Equal(recipeId.ToString(), data.GetProperty("recipeId").GetString());
        Assert.Equal("No Image Recipe", data.GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, data.GetProperty("imageUrl").ValueKind);
    }
}
