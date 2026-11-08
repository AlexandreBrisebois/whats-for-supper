using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using RecipeApi.Models;
using Xunit;

namespace RecipeApi.Tests.Integration;

internal static class GroceryTestRows
{
    internal static async Task<JsonElement> ReadAsync(HttpClient client, DateOnly monday) =>
        JsonDocument.Parse(await client.GetStringAsync($"/api/schedule?weekOffset=0&referenceWeekStartDate={monday:yyyy-MM-dd}")).RootElement.GetProperty("data").Clone();

    internal static string Id(JsonElement schedule, string key) => schedule.GetProperty("groceryItems").EnumerateArray()
        .Single(row => row.GetProperty("normalizedKey").GetString() == key).GetProperty("rowId").GetString()!;

    internal static bool Checked(JsonElement schedule, string key) => schedule.GetProperty("groceryState").GetProperty(Id(schedule, key)).GetBoolean();

    internal static bool Checked(WeeklyPlan plan, string key)
    {
        var rows = JsonDocument.Parse(plan.GroceryItems).RootElement;
        var id = rows.EnumerateArray().Single(row => row.GetProperty("normalizedKey").GetString() == key).GetProperty("rowId").GetString()!;
        return JsonDocument.Parse(plan.GroceryState).RootElement.GetProperty(id).GetBoolean();
    }

    internal static async Task<string> CheckAsync(HttpClient client, DateOnly monday, string key = "pasta", bool value = true)
    {
        var schedule = await ReadAsync(client, monday);
        var row = schedule.GetProperty("groceryItems").EnumerateArray().Single(row => row.GetProperty("normalizedKey").GetString() == key);
        var id = row.GetProperty("rowId").GetString()!;
        var response = await client.PatchAsJsonAsync($"/api/schedule/0/grocery/item?referenceWeekStartDate={monday:yyyy-MM-dd}", new {
            rowId = id, weekStartDate = monday.ToString("yyyy-MM-dd"), expectedRowVersion = row.GetProperty("rowVersion").GetString(),
            @checked = value, clientMutationId = Guid.NewGuid(),
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return id;
    }
}
