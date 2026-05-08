using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class RecipeSoftDeleteIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    // Test 1: DELETE /api/recipes/{id} sets deleted_at IS NOT NULL
    [Fact]
    public async Task Delete_SetsDeletedAt_On_Recipe_Row()
    {
        var recipe = await SeedRecipeAsync();

        var response = await _client.DeleteAsync($"/api/recipes/{recipe.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var updated = await db.Recipes.FindAsync(recipe.Id);
        Assert.NotNull(updated?.DeletedAt);
    }

    // Test 2: DELETE /api/recipes/{id} returns HTTP 200 with updated recipe body
    [Fact]
    public async Task Delete_Returns200_With_SoftDeleted_RecipeBody()
    {
        var recipe = await SeedRecipeAsync();

        var response = await _client.DeleteAsync($"/api/recipes/{recipe.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var data = document.RootElement;
        Assert.Equal(recipe.Id.ToString(), data.GetProperty("id").GetString());
        Assert.False(string.IsNullOrEmpty(data.GetProperty("deletedAt").GetString()));
    }

    // Test 3: After soft delete, GET /api/recipes does NOT include the deleted recipe
    [Fact]
    public async Task Delete_Removes_Recipe_From_Active_Library()
    {
        var recipe = await SeedRecipeAsync("Soft Deleted Pasta");

        await _client.DeleteAsync($"/api/recipes/{recipe.Id}");

        var listResponse = await _client.GetAsync("/api/recipes");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

        var json = await listResponse.Content.ReadAsStringAsync();
        Assert.DoesNotContain(recipe.Id.ToString(), json);
    }

    // Test 4: After soft delete, POST /api/recipes/search does NOT return deleted recipe
    [Fact]
    public async Task Delete_Removes_Recipe_From_Search_Results()
    {
        var recipe = await SeedRecipeAsync("Unique Deleted Lasagna Pasta");

        await _client.DeleteAsync($"/api/recipes/{recipe.Id}");

        var searchResponse = await _client.PostAsJsonAsync("/api/recipes/search", new { query = "Unique Deleted Lasagna Pasta" });
        Assert.Equal(HttpStatusCode.OK, searchResponse.StatusCode);

        var json = await searchResponse.Content.ReadAsStringAsync();
        Assert.DoesNotContain(recipe.Id.ToString(), json);
    }

    // Test 5: After soft delete, GET /api/recipes/trash DOES include the deleted recipe
    [Fact]
    public async Task Delete_Includes_Recipe_In_Trash()
    {
        var recipe = await SeedRecipeAsync();

        await _client.DeleteAsync($"/api/recipes/{recipe.Id}");

        var trashResponse = await _client.GetAsync("/api/recipes/trash");
        Assert.Equal(HttpStatusCode.OK, trashResponse.StatusCode);

        using var document = JsonDocument.Parse(await trashResponse.Content.ReadAsStringAsync());
        var items = document.RootElement.GetProperty("data").GetProperty("items");
        Assert.Contains(items.EnumerateArray(), item => item.GetProperty("id").GetString() == recipe.Id.ToString());
    }

    // Test 6: DELETE returns HTTP 409 when recipe is assigned to an active/future planner slot
    [Fact]
    public async Task Delete_Returns409_When_Recipe_Is_Assigned_To_Planner()
    {
        var recipe = await SeedRecipeAsync();
        await SeedCalendarEventAsync(recipe.Id, DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)));

        var response = await _client.DeleteAsync($"/api/recipes/{recipe.Id}");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        Assert.Contains("RECIPE_ASSIGNED_TO_PLANNER", json);
        Assert.Contains("assignedDays", json);
    }

    // Test 7: GET /api/recipes/trash returns RecipeTrashListResponse with all soft-deleted recipes
    [Fact]
    public async Task GetTrash_Returns_All_SoftDeleted_Recipes()
    {
        var recipe1 = await SeedRecipeAsync("Trash Recipe One");
        var recipe2 = await SeedRecipeAsync("Trash Recipe Two");

        await _client.DeleteAsync($"/api/recipes/{recipe1.Id}");
        await _client.DeleteAsync($"/api/recipes/{recipe2.Id}");

        var trashResponse = await _client.GetAsync("/api/recipes/trash");
        Assert.Equal(HttpStatusCode.OK, trashResponse.StatusCode);

        using var document = JsonDocument.Parse(await trashResponse.Content.ReadAsStringAsync());
        var items = document.RootElement.GetProperty("data").GetProperty("items");
        var ids = items.EnumerateArray().Select(i => i.GetProperty("id").GetString()).ToList();
        Assert.Contains(recipe1.Id.ToString(), ids);
        Assert.Contains(recipe2.Id.ToString(), ids);
    }

    // Test 8: POST /api/recipes/{id}/restore clears deleted_at and returns the recipe
    [Fact]
    public async Task Restore_Clears_DeletedAt_And_Returns_Recipe()
    {
        var recipe = await SeedRecipeAsync();

        await _client.DeleteAsync($"/api/recipes/{recipe.Id}");
        var restoreResponse = await _client.PostAsync($"/api/recipes/{recipe.Id}/restore", null);

        Assert.Equal(HttpStatusCode.OK, restoreResponse.StatusCode);

        using var document = await ReadDataAsync(restoreResponse);
        var data = document.RootElement;
        Assert.Equal(recipe.Id.ToString(), data.GetProperty("id").GetString());
        Assert.True(
            data.GetProperty("deletedAt").ValueKind == JsonValueKind.Null ||
            string.IsNullOrEmpty(data.TryGetProperty("deletedAt", out var da) ? da.GetString() : null)
        );

        // Confirm DB row is cleared
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var restored = await db.Recipes.FindAsync(recipe.Id);
        Assert.Null(restored?.DeletedAt);
    }

    // Test 9: Restored recipe appears in GET /api/recipes and POST /api/recipes/search
    [Fact]
    public async Task Restore_ReIncludes_Recipe_In_Active_Surfaces()
    {
        var recipe = await SeedRecipeAsync("Restored Chickpea Stew");

        await _client.DeleteAsync($"/api/recipes/{recipe.Id}");
        await _client.PostAsync($"/api/recipes/{recipe.Id}/restore", null);

        var listResponse = await _client.GetAsync("/api/recipes");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var listJson = await listResponse.Content.ReadAsStringAsync();
        Assert.Contains(recipe.Id.ToString(), listJson);

        var searchResponse = await _client.PostAsJsonAsync("/api/recipes/search", new { query = "Restored Chickpea Stew" });
        Assert.Equal(HttpStatusCode.OK, searchResponse.StatusCode);
        var searchJson = await searchResponse.Content.ReadAsStringAsync();
        Assert.Contains(recipe.Id.ToString(), searchJson);
    }

    // Test 10: Restored recipe does NOT appear in GET /api/recipes/trash
    [Fact]
    public async Task Restore_Removes_Recipe_From_Trash()
    {
        var recipe = await SeedRecipeAsync();

        await _client.DeleteAsync($"/api/recipes/{recipe.Id}");
        await _client.PostAsync($"/api/recipes/{recipe.Id}/restore", null);

        var trashResponse = await _client.GetAsync("/api/recipes/trash");
        Assert.Equal(HttpStatusCode.OK, trashResponse.StatusCode);

        using var document = JsonDocument.Parse(await trashResponse.Content.ReadAsStringAsync());
        var items = document.RootElement.GetProperty("data").GetProperty("items");
        Assert.DoesNotContain(items.EnumerateArray(), item => item.GetProperty("id").GetString() == recipe.Id.ToString());
    }

    private async Task<Recipe> SeedRecipeAsync(string name = "Test Recipe")
    {
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = name,
            Description = "A test recipe",
            Ingredients = JsonSerializer.Serialize(new[] { "flour", "water" }),
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1)
        };

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        return recipe;
    }

    private async Task SeedCalendarEventAsync(Guid recipeId, DateOnly date)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = date,
            MealSlot = 0,
            Status = CalendarEventStatus.Planned
        });
        await db.SaveChangesAsync();
    }

    private static async Task<JsonDocument> ReadDataAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        using var envelope = JsonDocument.Parse(json);
        var root = envelope.RootElement;
        return root.TryGetProperty("data", out var data)
            ? JsonDocument.Parse(data.GetRawText())
            : JsonDocument.Parse(root.GetRawText());
    }
}
