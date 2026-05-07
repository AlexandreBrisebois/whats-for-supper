using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>
/// End-to-end integration tests for the grocery items feature (Vertical Slice 11).
///
/// Task 11.1: Assign recipe → GET /api/schedule returns groceryItems
/// Task 11.2: Remove recipe → groceryItems updated (emptied)
///
/// These tests exercise the full HTTP stack:
///   POST /api/schedule/assign  → triggers GroceryRecomputeService
///   GET  /api/schedule         → returns ScheduleDays.groceryItems
///   DELETE /api/schedule/day/{date}/remove → triggers recompute, empties list
/// </summary>
public class GroceryItemsIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client = _factory.CreateClient();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a recipe with a supply[] array in raw_metadata and persists it to the DB.
    /// Returns the recipe ID.
    /// </summary>
    private async Task<Guid> CreateRecipeWithSupplyAsync(
        string name,
        string supplyJson)
    {
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = name,
            ImageCount = 1,
            RawMetadata = supplyJson,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();
        return recipe.Id;
    }

    /// <summary>
    /// Calls GET /api/schedule?weekOffset=0 and returns the parsed ScheduleDays JSON element.
    /// Asserts the response is 200 OK.
    /// </summary>
    private async Task<JsonElement> GetScheduleAsync(int weekOffset = 0)
    {
        var response = await _client.GetAsync($"/api/schedule?weekOffset={weekOffset}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("data");
    }

    /// <summary>
    /// Returns the Monday date string (yyyy-MM-dd) for the current week offset.
    /// </summary>
    private static string GetMondayDateString(int weekOffset = 0)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday + weekOffset * 7);
        return monday.ToString("yyyy-MM-dd");
    }

    [Fact]
    public async Task MoveRecipe_ToNextWeek_PopulatesTargetWeekGroceryItems()
    {
        // Arrange: create a recipe with supply[] so the grocery list is derived from it
        var supplyJson = """
            {
              "supply": [
                { "name": "rice", "quantity": 2, "unitText": "cups" },
                { "name": "lime", "quantity": 1, "unitText": "piece" }
              ]
            }
            """;
        var recipeId = await CreateRecipeWithSupplyAsync("Rice Bowl", supplyJson);

        var assignResponse = await _client.PostAsJsonAsync("/api/schedule/assign", new
        {
            weekOffset = 0,
            dayIndex = 0,
            recipeId,
        });
        Assert.Equal(HttpStatusCode.OK, assignResponse.StatusCode);

        // Act: move the recipe from this week into next week.
        var moveResponse = await _client.PostAsJsonAsync("/api/schedule/move", new
        {
            weekOffset = 0,
            recipeId,
            toIndex = 0,
            targetWeekOffset = 1,
            intent = "push",
        });
        Assert.Equal(HttpStatusCode.OK, moveResponse.StatusCode);

        // Assert: next week's grocery list reflects the moved recipe.
        var nextWeekSchedule = await GetScheduleAsync(1);
        var nextWeekGroceryItems = nextWeekSchedule.GetProperty("groceryItems");
        Assert.Equal(JsonValueKind.Array, nextWeekGroceryItems.ValueKind);
        Assert.True(nextWeekGroceryItems.GetArrayLength() > 0,
            "groceryItems must be non-empty for the target week after moving a recipe there");

        var nextWeekNames = nextWeekGroceryItems.EnumerateArray()
            .Select(item => item.GetProperty("displayName").GetString())
            .ToList();

        Assert.Contains("rice", nextWeekNames);
        Assert.Contains("lime", nextWeekNames);

        // And the source week should no longer include those grocery items.
        var currentWeekSchedule = await GetScheduleAsync(0);
        var currentWeekGroceryItems = currentWeekSchedule.GetProperty("groceryItems");
        if (currentWeekGroceryItems.ValueKind == JsonValueKind.Array)
        {
            var currentWeekNames = currentWeekGroceryItems.EnumerateArray()
                .Select(item => item.GetProperty("displayName").GetString())
                .ToList();

            Assert.DoesNotContain("rice", currentWeekNames);
            Assert.DoesNotContain("lime", currentWeekNames);
        }
        else
        {
            Assert.Equal(JsonValueKind.Null, currentWeekGroceryItems.ValueKind);
        }
    }

    // ── Task 11.1: Assign recipe → GET /api/schedule returns groceryItems ────

    [Fact]
    public async Task AssignRecipe_ThenGetSchedule_ReturnsNonEmptyGroceryItems()
    {
        // Arrange: create a recipe with supply[] in raw_metadata
        var supplyJson = """
            {
              "supply": [
                { "name": "chicken breast", "quantity": 2, "unitText": "pieces" },
                { "name": "tomato", "quantity": 3, "unitText": "pieces" }
              ]
            }
            """;
        var recipeId = await CreateRecipeWithSupplyAsync("Chicken Tomato", supplyJson);

        // Act: assign the recipe to weekOffset=0, dayIndex=0 (Monday)
        var assignResponse = await _client.PostAsJsonAsync("/api/schedule/assign", new
        {
            weekOffset = 0,
            dayIndex = 0,
            recipeId = recipeId,
        });
        Assert.Equal(HttpStatusCode.OK, assignResponse.StatusCode);

        // Act: GET /api/schedule
        var schedule = await GetScheduleAsync(0);

        // Assert: groceryItems is present and non-empty
        Assert.True(schedule.TryGetProperty("groceryItems", out var groceryItems),
            "ScheduleDays response must contain a 'groceryItems' property");
        Assert.Equal(JsonValueKind.Array, groceryItems.ValueKind);
        Assert.True(groceryItems.GetArrayLength() > 0,
            "groceryItems must be non-empty after assigning a recipe with supply[]");
    }

    [Fact]
    public async Task AssignRecipe_ThenGetSchedule_GroceryItemsContainExpectedIngredients()
    {
        // Arrange: create a recipe with two known supply items
        var supplyJson = """
            {
              "supply": [
                { "name": "chicken breast", "quantity": 2, "unitText": "pieces" },
                { "name": "tomato", "quantity": 3, "unitText": "pieces" }
              ]
            }
            """;
        var recipeId = await CreateRecipeWithSupplyAsync("Chicken Tomato Dish", supplyJson);

        // Act: assign and fetch schedule
        await _client.PostAsJsonAsync("/api/schedule/assign", new
        {
            weekOffset = 0,
            dayIndex = 0,
            recipeId = recipeId,
        });
        var schedule = await GetScheduleAsync(0);

        // Assert: groceryItems contains the expected display names
        var groceryItems = schedule.GetProperty("groceryItems");
        var displayNames = groceryItems.EnumerateArray()
            .Select(item => item.GetProperty("displayName").GetString())
            .ToList();

        Assert.Contains("chicken breast", displayNames);
        Assert.Contains("tomato", displayNames);
    }

    [Fact]
    public async Task AssignRecipe_ThenGetSchedule_GroceryItemsHaveRequiredFields()
    {
        // Arrange
        var supplyJson = """
            {
              "supply": [
                { "name": "salmon fillet", "quantity": 1, "unitText": "piece" }
              ]
            }
            """;
        var recipeId = await CreateRecipeWithSupplyAsync("Salmon Dish", supplyJson);

        // Act
        await _client.PostAsJsonAsync("/api/schedule/assign", new
        {
            weekOffset = 0,
            dayIndex = 0,
            recipeId = recipeId,
        });
        var schedule = await GetScheduleAsync(0);

        // Assert: each grocery item has the required GroceryLineItemDto fields
        var groceryItems = schedule.GetProperty("groceryItems");
        Assert.True(groceryItems.GetArrayLength() > 0);

        var item = groceryItems.EnumerateArray().First();
        Assert.True(item.TryGetProperty("displayName", out _), "item must have displayName");
        Assert.True(item.TryGetProperty("normalizedKey", out _), "item must have normalizedKey");
        Assert.True(item.TryGetProperty("section", out _), "item must have section");
        Assert.True(item.TryGetProperty("recipeIds", out var recipeIds), "item must have recipeIds");
        Assert.Equal(JsonValueKind.Array, recipeIds.ValueKind);
        Assert.Contains(recipeId.ToString(), recipeIds.EnumerateArray().Select(r => r.GetString()));
    }

    [Fact]
    public async Task AssignRecipe_WithNoSupply_ThenGetSchedule_ReturnsEmptyGroceryItems()
    {
        // Arrange: recipe with no supply[] in raw_metadata
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "No Supply Recipe",
            ImageCount = 1,
            RawMetadata = null,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        // Act
        await _client.PostAsJsonAsync("/api/schedule/assign", new
        {
            weekOffset = 0,
            dayIndex = 0,
            recipeId = recipe.Id,
        });
        var schedule = await GetScheduleAsync(0);

        // Assert: groceryItems is present but empty (no supply to extract)
        Assert.True(schedule.TryGetProperty("groceryItems", out var groceryItems));
        // Either null or empty array is acceptable when no supply[] exists
        if (groceryItems.ValueKind == JsonValueKind.Array)
        {
            Assert.Equal(0, groceryItems.GetArrayLength());
        }
        else
        {
            Assert.Equal(JsonValueKind.Null, groceryItems.ValueKind);
        }
    }

    // ── Task 11.2: Remove recipe → groceryItems updated (emptied) ────────────

    [Fact]
    public async Task AssignThenRemoveRecipe_GroceryItemsBecomesEmpty()
    {
        // Arrange: create a recipe with supply[]
        var supplyJson = """
            {
              "supply": [
                { "name": "beef", "quantity": 500, "unitText": "g" },
                { "name": "onion", "quantity": 2, "unitText": "pieces" }
              ]
            }
            """;
        var recipeId = await CreateRecipeWithSupplyAsync("Beef Stew", supplyJson);

        // Step 1: assign the recipe to Monday (dayIndex=0)
        var assignResponse = await _client.PostAsJsonAsync("/api/schedule/assign", new
        {
            weekOffset = 0,
            dayIndex = 0,
            recipeId = recipeId,
        });
        Assert.Equal(HttpStatusCode.OK, assignResponse.StatusCode);

        // Step 2: verify groceryItems is populated
        var scheduleAfterAssign = await GetScheduleAsync(0);
        var groceryItemsAfterAssign = scheduleAfterAssign.GetProperty("groceryItems");
        Assert.Equal(JsonValueKind.Array, groceryItemsAfterAssign.ValueKind);
        Assert.True(groceryItemsAfterAssign.GetArrayLength() > 0,
            "groceryItems must be non-empty after assigning a recipe with supply[]");

        // Step 3: remove the recipe from Monday
        var mondayDate = GetMondayDateString(0);
        var removeResponse = await _client.DeleteAsync($"/api/schedule/day/{mondayDate}/remove");
        Assert.Equal(HttpStatusCode.NoContent, removeResponse.StatusCode);

        // Step 4: verify groceryItems is now empty
        var scheduleAfterRemove = await GetScheduleAsync(0);
        var groceryItemsAfterRemove = scheduleAfterRemove.GetProperty("groceryItems");

        // After removing the only recipe, grocery_items should be empty ([] or null)
        if (groceryItemsAfterRemove.ValueKind == JsonValueKind.Array)
        {
            Assert.Equal(0, groceryItemsAfterRemove.GetArrayLength());
        }
        else
        {
            Assert.Equal(JsonValueKind.Null, groceryItemsAfterRemove.ValueKind);
        }
    }

    [Fact]
    public async Task AssignTwoRecipes_RemoveOne_GroceryItemsRetainsRemainingRecipeItems()
    {
        // Arrange: two recipes with distinct supply items
        var supplyJson1 = """
            {
              "supply": [
                { "name": "pasta", "quantity": 200, "unitText": "g" }
              ]
            }
            """;
        var supplyJson2 = """
            {
              "supply": [
                { "name": "salmon fillet", "quantity": 2, "unitText": "pieces" }
              ]
            }
            """;
        var recipeId1 = await CreateRecipeWithSupplyAsync("Pasta Dish", supplyJson1);
        var recipeId2 = await CreateRecipeWithSupplyAsync("Salmon Dish", supplyJson2);

        // Assign both recipes to different days
        await _client.PostAsJsonAsync("/api/schedule/assign", new
        {
            weekOffset = 0,
            dayIndex = 0,
            recipeId = recipeId1,
        });
        await _client.PostAsJsonAsync("/api/schedule/assign", new
        {
            weekOffset = 0,
            dayIndex = 1,
            recipeId = recipeId2,
        });

        // Verify both items are present
        var scheduleAfterBoth = await GetScheduleAsync(0);
        var itemsAfterBoth = scheduleAfterBoth.GetProperty("groceryItems");
        Assert.Equal(JsonValueKind.Array, itemsAfterBoth.ValueKind);
        Assert.Equal(2, itemsAfterBoth.GetArrayLength());

        // Remove the first recipe (Monday)
        var mondayDate = GetMondayDateString(0);
        var removeResponse = await _client.DeleteAsync($"/api/schedule/day/{mondayDate}/remove");
        Assert.Equal(HttpStatusCode.NoContent, removeResponse.StatusCode);

        // Verify only the second recipe's item remains
        var scheduleAfterRemove = await GetScheduleAsync(0);
        var itemsAfterRemove = scheduleAfterRemove.GetProperty("groceryItems");
        Assert.Equal(JsonValueKind.Array, itemsAfterRemove.ValueKind);
        Assert.Equal(1, itemsAfterRemove.GetArrayLength());

        var remainingItem = itemsAfterRemove.EnumerateArray().First();
        Assert.Equal("salmon fillet", remainingItem.GetProperty("displayName").GetString());
    }
}
