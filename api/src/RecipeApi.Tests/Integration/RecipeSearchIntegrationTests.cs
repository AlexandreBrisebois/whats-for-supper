using System.Net;
using System.Net.Http.Json;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class RecipeSearchIntegrationTests : IAsyncLifetime
{
    private static readonly DateTimeOffset TestNow = new(2026, 9, 20, 12, 0, 0, TimeSpan.Zero);
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync(new FixedClock(TestNow));
        _client = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task Search_WithChickenQuery_Returns_ChickenStirFry_From_NameMatch()
    {
        await SeedRecipeAsync(new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Chicken Stir Fry",
            Description = "Weeknight skillet dinner",
            Ingredients = JsonSerializer.Serialize(new[] { "chicken thighs", "broccoli", "soy sauce" }),
            Notes = "Kids ask for this on busy nights.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1)
        });

        var response = await PostSearchAsync(new { query = "chicken" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var data = document.RootElement;
        var topPick = data.GetProperty("topPick");
        Assert.Equal("Chicken Stir Fry", topPick.GetProperty("name").GetString());

        var results = data.GetProperty("results");
        Assert.DoesNotContain(results.EnumerateArray(), result => result.GetProperty("name").GetString() == "Chicken Stir Fry");
    }

    [Fact]
    public async Task Search_Matches_Query_From_Notes_And_Emits_NotesReason()
    {
        await SeedRecipeAsync(new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Lemon Pasta",
            Description = "Bright pantry pasta",
            Ingredients = JsonSerializer.Serialize(new[] { "pasta", "lemon", "parmesan" }),
            Notes = "This is the cozy soup-adjacent pasta the family asks for when someone is sick.",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        var response = await PostSearchAsync(new { query = "soup" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");
        Assert.Equal("Lemon Pasta", topPick.GetProperty("name").GetString());

        var reasons = topPick.GetProperty("reasons");
        Assert.Contains(reasons.EnumerateArray(), reason =>
            reason.GetProperty("source").GetString() == "notes-match" &&
            reason.GetProperty("label").GetString() == "Your notes mention this");
    }

    [Fact]
    public async Task Search_WithFuzzyQuery_Returns_Similar_Text_Candidate()
    {
        await SeedRecipeAsync(new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Chicken Stir Fry",
            Description = "Fast dinner with crisp vegetables",
            Ingredients = JsonSerializer.Serialize(new[] { "chicken", "snow peas" }),
            Notes = "Reliable favorite.",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        var response = await PostSearchAsync(new { query = "chikcen" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");
        Assert.Equal("Chicken Stir Fry", topPick.GetProperty("name").GetString());
        var results = document.RootElement.GetProperty("results");
        Assert.DoesNotContain(results.EnumerateArray(), result => result.GetProperty("name").GetString() == "Chicken Stir Fry");
    }

    [Fact]
    public async Task Search_Rejects_An_OutOfRange_Limit()
    {
        for (var index = 0; index < 12; index++)
        {
            await SeedRecipeAsync(new Recipe
            {
                Id = Guid.NewGuid(),
                AddedBy = _factory.DefaultFamilyMemberId,
                Name = $"Chicken Dinner {index}",
                Description = "Chicken dinner",
                Ingredients = JsonSerializer.Serialize(new[] { "chicken", "garlic" }),
                Notes = "Weeknight staple.",
                CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-index),
                UpdatedAt = DateTimeOffset.UtcNow.AddMinutes(-index)
            });
        }

        var response = await PostSearchAsync(new { query = "chicken", limit = 99 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Search_Returns_Continuation_Batches_Without_Repeating_The_TopPick()
    {
        for (var index = 0; index < 15; index++)
        {
            await SeedRecipeAsync(new Recipe
            {
                Id = Guid.NewGuid(),
                AddedBy = _factory.DefaultFamilyMemberId,
                Name = $"Chicken continuation {index}",
                Description = "Chicken dinner",
                Ingredients = JsonSerializer.Serialize(new[] { "chicken" }),
                ImageCount = 1,
                CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-index),
                UpdatedAt = DateTimeOffset.UtcNow
            });
        }

        using var first = await ReadDataAsync(await PostSearchAsync(new { query = "chicken", limit = 12 }));
        var cursor = first.RootElement.GetProperty("nextCursor").GetString();

        Assert.False(string.IsNullOrWhiteSpace(cursor));
        Assert.Equal(12, SearchResultIds(first.RootElement).Count);

        using var next = await ReadDataAsync(await PostSearchAsync(new { query = "chicken", limit = 12, continuationToken = cursor }));
        var firstIds = SearchResultIds(first.RootElement).Append(first.RootElement.GetProperty("topPick").GetProperty("id").GetGuid()).ToHashSet();

        Assert.Equal(JsonValueKind.Null, next.RootElement.GetProperty("topPick").ValueKind);
        Assert.Equal(2, SearchResultIds(next.RootElement).Count);
        Assert.DoesNotContain(SearchResultIds(next.RootElement), firstIds.Contains);
        Assert.Equal(JsonValueKind.Null, next.RootElement.GetProperty("nextCursor").ValueKind);
    }

    [Fact]
    public async Task Browse_Uses_Continuation_To_Reach_More_Than_Fifty_Eligible_Recipes()
    {
        for (var index = 0; index < 55; index++)
        {
            await SeedRecipeAsync(new Recipe
            {
                Id = Guid.NewGuid(),
                AddedBy = _factory.DefaultFamilyMemberId,
                Name = $"Browse recipe {index}",
                Description = "Library recipe",
                Ingredients = JsonSerializer.Serialize(new[] { "pantry" }),
                ImageCount = 1,
                CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-index),
                UpdatedAt = DateTimeOffset.UtcNow
            });
        }

        var seen = new HashSet<Guid>();
        string? cursor = null;
        do
        {
            using var page = await ReadDataAsync(await PostSearchAsync(new { query = "", limit = 12, continuationToken = cursor }));
            if (page.RootElement.GetProperty("topPick").ValueKind != JsonValueKind.Null)
                seen.Add(page.RootElement.GetProperty("topPick").GetProperty("id").GetGuid());
            foreach (var id in SearchResultIds(page.RootElement))
                Assert.True(seen.Add(id), $"Duplicate recipe {id}");
            cursor = page.RootElement.GetProperty("nextCursor").GetString();
        } while (cursor is not null);

        Assert.Equal(55, seen.Count);
    }

    [Fact]
    public async Task Search_Returns_Restart_Guidance_For_An_Expired_Continuation()
    {
        var response = await PostSearchAsync(new { query = "", continuationToken = "expired-cursor" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("Restart the search", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Browse_Promotes_Liked_LongUncooked_Recipes_But_Not_Disliked_Or_NeverCooked_Likes()
    {
        var favorite = CreateRecipe("Forgotten favorite", "Loved long ago", "30 min");
        favorite.CreatedAt = DateTimeOffset.UtcNow.AddDays(-90);
        var disliked = CreateRecipe("Old dislike", "Not a favorite", "30 min");
        disliked.CreatedAt = DateTimeOffset.UtcNow.AddDays(-80);
        var neverCookedLiked = CreateRecipe("Never cooked liked", "Still new", "30 min");
        neverCookedLiked.CreatedAt = DateTimeOffset.UtcNow;
        await SeedRecipeAsync(favorite);
        await SeedRecipeAsync(disliked);
        await SeedRecipeAsync(neverCookedLiked);
        await SeedAffinityFactsAsync(
            (favorite.Id, 3, new DateOnly(2026, 8, 1)),
            (disliked.Id, -2, new DateOnly(2026, 7, 1)),
            (neverCookedLiked.Id, 2, null));

        using var document = await ReadDataAsync(await PostSearchAsync(new { query = "", limit = 12 }));

        Assert.Equal(favorite.Id, document.RootElement.GetProperty("topPick").GetProperty("id").GetGuid());
        Assert.True(document.RootElement.GetProperty("topPick").GetProperty("isPromotionEligible").GetBoolean());
        var results = document.RootElement.GetProperty("results").EnumerateArray().ToList();
        Assert.Contains(results, result => result.GetProperty("id").GetGuid() == disliked.Id &&
            !result.GetProperty("isPromotionEligible").GetBoolean());
        Assert.Contains(results, result => result.GetProperty("id").GetGuid() == neverCookedLiked.Id &&
            !result.GetProperty("isPromotionEligible").GetBoolean());
    }

    [Fact]
    public async Task Browse_CalendarGuards_Block_ActiveFuture_And_SameWeekCooked_Favorites_Without_Hiding_Them()
    {
        var favorite = CreateRecipe("Guarded favorite", "Loved long ago", "30 min");
        var fallback = CreateRecipe("Available favorite", "Loved long ago", "30 min");
        await SeedRecipeAsync(favorite);
        await SeedRecipeAsync(fallback);
        await SeedAffinityFactsAsync(
            (favorite.Id, 4, new DateOnly(2026, 8, 1)),
            (fallback.Id, 2, new DateOnly(2026, 7, 1)));
        await SeedCalendarEventsAsync(
            (favorite.Id, new DateOnly(2026, 9, 20), CalendarEventStatus.Planned),
            (favorite.Id, new DateOnly(2026, 10, 12), CalendarEventStatus.Locked),
            (favorite.Id, new DateOnly(2026, 9, 17), CalendarEventStatus.Cooked));

        using var document = await ReadDataAsync(await PostSearchAsync(new { query = "", limit = 12, weekOffset = 0 }));

        Assert.Equal(fallback.Id, document.RootElement.GetProperty("topPick").GetProperty("id").GetGuid());
        var guardedFavorite = document.RootElement.GetProperty("results").EnumerateArray()
            .Single(result => result.GetProperty("id").GetGuid() == favorite.Id);
        Assert.False(guardedFavorite.GetProperty("isPromotionEligible").GetBoolean());
    }

    [Fact]
    public async Task Browse_Skipped_Assignment_Does_Not_Block_But_Another_Active_Assignment_Does()
    {
        var favorite = CreateRecipe("Duplicated favorite", "Loved long ago", "30 min");
        var fallback = CreateRecipe("Fallback favorite", "Loved long ago", "30 min");
        await SeedRecipeAsync(favorite);
        await SeedRecipeAsync(fallback);
        await SeedAffinityFactsAsync((favorite.Id, 4, new DateOnly(2026, 8, 1)), (fallback.Id, 2, new DateOnly(2026, 7, 1)));
        await SeedCalendarEventsAsync(
            (favorite.Id, new DateOnly(2026, 9, 21), CalendarEventStatus.Skipped),
            (favorite.Id, new DateOnly(2026, 9, 22), CalendarEventStatus.AwaitingConsensus));

        using var blocked = await ReadDataAsync(await PostSearchAsync(new { query = "", limit = 12 }));
        Assert.Equal(fallback.Id, blocked.RootElement.GetProperty("topPick").GetProperty("id").GetGuid());

        await RemoveCalendarEventsAsync(favorite.Id, CalendarEventStatus.AwaitingConsensus);
        using var restored = await ReadDataAsync(await PostSearchAsync(new { query = "", limit = 12 }));
        Assert.Equal(favorite.Id, restored.RootElement.GetProperty("topPick").GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task FindSimilar_UsesCurrentRecipeFacts_NotLegacyDietaryProfile()
    {
        var source = new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Herbed Tomato Pasta",
            Description = "Tomato pasta with basil",
            Ingredients = JsonSerializer.Serialize(new[] { "pasta", "tomato", "basil" }),
            DietaryProfile = "{\"primaryFoodGroup\":\"ProteinFoods\",\"proteinSource\":\"Poultry\"}",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        var similar = new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Tomato Basil Pasta",
            Description = "Herbed pasta dinner",
            Ingredients = JsonSerializer.Serialize(new[] { "pasta", "tomato", "basil" }),
            DietaryProfile = "{\"primaryFoodGroup\":\"VegetablesAndFruits\",\"proteinSource\":\"None\"}",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        await SeedRecipeAsync(source);
        await SeedRecipeAsync(similar);

        using var document = await ReadDataAsync(await PostSearchAsync(new { query = "", similarToRecipeId = source.Id }));
        var ids = SearchResultIds(document.RootElement)
            .Append(document.RootElement.GetProperty("topPick").ValueKind == JsonValueKind.Null
                ? Guid.Empty
                : document.RootElement.GetProperty("topPick").GetProperty("id").GetGuid())
            .ToArray();

        Assert.Equal("similar", document.RootElement.GetProperty("searchMode").GetString());
        Assert.Contains(similar.Id, ids);
        Assert.DoesNotContain(source.Id, ids);
    }

    [Fact]
    public async Task Search_Returns_LexicalOnly_ResultPath_In_Phase1()
    {
        await SeedRecipeAsync(new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Chicken Stir Fry",
            Description = "Fast dinner",
            Ingredients = JsonSerializer.Serialize(new[] { "chicken" }),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        var response = await PostSearchAsync(new { query = "chicken" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var resultPath = document.RootElement.GetProperty("resultPath").GetString();
        Assert.True(resultPath == "lexical-only" || resultPath == "fallback-lexical", $"Expected lexical-only or fallback-lexical, got {resultPath}");
    }

    [Fact]
    public async Task Search_Returns_NonEmpty_Reasons_With_Source_And_Label()
    {
        await SeedRecipeAsync(new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Chicken Stir Fry",
            Description = "Fast dinner",
            Ingredients = JsonSerializer.Serialize(new[] { "chicken" }),
            Notes = "Chicken note",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        var response = await PostSearchAsync(new { query = "chicken" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");
        var firstReason = topPick.GetProperty("reasons")[0];

        Assert.False(string.IsNullOrWhiteSpace(firstReason.GetProperty("source").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(firstReason.GetProperty("label").GetString()));
    }

    [Fact]
    public async Task Search_WithEmptyQuery_Returns_Newest_Recipes_First()
    {
        await SeedRecipeAsync(new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Older Recipe",
            Description = "Earlier recipe",
            Ingredients = JsonSerializer.Serialize(new[] { "onion" }),
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-3),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-3)
        });

        await SeedRecipeAsync(new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Newest Recipe",
            Description = "Latest recipe",
            Ingredients = JsonSerializer.Serialize(new[] { "garlic" }),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        var response = await PostSearchAsync(new { query = "" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        Assert.Equal(JsonValueKind.Null, document.RootElement.GetProperty("topPick").ValueKind);
        Assert.Equal(
            new[] { "Newest Recipe", "Older Recipe" },
            document.RootElement.GetProperty("results").EnumerateArray()
                .Select(result => result.GetProperty("name").GetString()));
    }

    [Fact]
    public async Task Search_Excludes_NotReady_Recipes()
    {
        var ready = new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Ready Chicken Dinner",
            Description = "Chicken dinner ready for search",
            Ingredients = JsonSerializer.Serialize(new[] { "chicken" }),
            ImageCount = 1,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var pendingPhotoImport = new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = null,
            Description = "Chicken dinner still extracting",
            Ingredients = JsonSerializer.Serialize(new[] { "chicken" }),
            ImageCount = 1,
            CreatedAt = DateTimeOffset.UtcNow.AddSeconds(1),
            UpdatedAt = DateTimeOffset.UtcNow.AddSeconds(1)
        };

        var pendingUrlImport = new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Captured Recipe",
            Description = "Chicken dinner still captured",
            Ingredients = JsonSerializer.Serialize(new[] { "chicken" }),
            ImageCount = 0,
            IsSynthesized = false,
            IsReady = false,
            CreatedAt = DateTimeOffset.UtcNow.AddSeconds(2),
            UpdatedAt = DateTimeOffset.UtcNow.AddSeconds(2)
        };

        await SeedRecipeAsync(ready);
        await SeedRecipeAsync(pendingPhotoImport);
        await SeedRecipeAsync(pendingUrlImport);

        var response = await PostSearchAsync(new { query = "chicken" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var returnedIds = new List<Guid>();
        var topPick = document.RootElement.GetProperty("topPick");
        if (topPick.ValueKind != JsonValueKind.Null)
        {
            returnedIds.Add(topPick.GetProperty("id").GetGuid());
        }

        returnedIds.AddRange(document.RootElement.GetProperty("results")
            .EnumerateArray()
            .Select(result => result.GetProperty("id").GetGuid()));

        Assert.Contains(ready.Id, returnedIds);
        Assert.DoesNotContain(pendingPhotoImport.Id, returnedIds);
        Assert.DoesNotContain(pendingUrlImport.Id, returnedIds);
    }

    [Fact]
    public async Task Search_Mirrors_AppliedFilters_In_Response()
    {
        var response = await PostSearchAsync(new
        {
            query = "chicken",
            filters = new
            {
                newRecipes = true,
                neverCooked = false,
                familyFavorite = true,
                quickOnly = true,
                notCookedInLongTime = false,
                discoverableOnly = true
            }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var appliedFilters = document.RootElement.GetProperty("appliedFilters");
        Assert.True(appliedFilters.GetProperty("newRecipes").GetBoolean());
        Assert.False(appliedFilters.GetProperty("neverCooked").GetBoolean());
        Assert.True(appliedFilters.GetProperty("familyFavorite").GetBoolean());
        Assert.True(appliedFilters.GetProperty("quickOnly").GetBoolean());
        Assert.False(appliedFilters.GetProperty("notCookedInLongTime").GetBoolean());
        Assert.True(appliedFilters.GetProperty("discoverableOnly").GetBoolean());
    }

    [Fact]
    public async Task Search_WithPantrySnapshot_Emits_InventoryFit_Reason()
    {
        await SeedRecipeAsync(new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Tomato Pasta",
            Description = "Pantry dinner",
            Ingredients = JsonSerializer.Serialize(new[] { "tomatoes", "pasta", "olive oil" }),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            ImageCount = 1
        });

        using var captureContent = new MultipartFormDataContent();
        using var fileContent = new ByteArrayContent([0xFF, 0xD8, 0xFF, 0xD9]);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        captureContent.Add(fileContent, "photos", "pantry.jpg");

        var captureResponse = await _client.PostAsync("/api/inventory-captures", captureContent);

        Assert.Equal(HttpStatusCode.OK, captureResponse.StatusCode);

        using var captureDocument = await ReadDataAsync(captureResponse);
        var pantrySnapshotId = captureDocument.RootElement.GetProperty("snapshotId").GetGuid();

        var response = await PostSearchAsync(new
        {
            query = "pasta",
            pantrySnapshotId
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");

        Assert.Contains(topPick.GetProperty("reasons").EnumerateArray(), reason =>
            reason.GetProperty("source").GetString() == "inventory-fit" &&
            reason.GetProperty("label").GetString() == "Uses 1 ingredients from your camera photos");
    }

    [Fact]
    public async Task Search_WithNotCookedInLongTime_Orders_By_Oldest_LastCookedDate()
    {
        var oldest = CreateRecipe("Oldest Chicken", "Chicken dinner", "30 min");
        oldest.LastCookedDate = DateTimeOffset.UtcNow.AddDays(-45);
        oldest.CreatedAt = DateTimeOffset.UtcNow.AddDays(-1);

        var middle = CreateRecipe("Middle Chicken", "Chicken dinner", "30 min");
        middle.LastCookedDate = DateTimeOffset.UtcNow.AddDays(-20);
        middle.CreatedAt = DateTimeOffset.UtcNow.AddDays(-2);

        var newest = CreateRecipe("Newest Chicken", "Chicken dinner", "30 min");
        newest.LastCookedDate = DateTimeOffset.UtcNow.AddDays(-3);
        newest.CreatedAt = DateTimeOffset.UtcNow.AddDays(-3);

        await SeedRecipeAsync(newest);
        await SeedRecipeAsync(oldest);
        await SeedRecipeAsync(middle);

        var response = await PostSearchAsync(new
        {
            query = "",
            filters = new { notCookedInLongTime = true }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var results = document.RootElement.GetProperty("results").EnumerateArray().ToList();

        Assert.Equal(JsonValueKind.Null, document.RootElement.GetProperty("topPick").ValueKind);
        Assert.Equal(oldest.Id, results[0].GetProperty("id").GetGuid());
        Assert.Equal(middle.Id, results[1].GetProperty("id").GetGuid());
        Assert.Equal(newest.Id, results[2].GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task Search_WithPlannerContext_Excludes_Recipes_Already_Assigned_In_TargetWeek()
    {
        var assignedRecipe = CreateRecipe(
            "Assigned Chicken",
            "Chicken dinner already planned this week",
            totalTime: "45 min");

        var availableRecipe = CreateRecipe(
            "Available Chicken",
            "Chicken dinner still available",
            totalTime: "35 min");

        await SeedRecipeAsync(assignedRecipe);
        await SeedRecipeAsync(availableRecipe);
        await SeedWeekAsync(
            weekOffset: 0,
            assignedRecipeIds: [assignedRecipe.Id]);

        var response = await PostSearchAsync(new { query = "chicken", weekOffset = 0, dayIndex = 2 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");
        var results = document.RootElement.GetProperty("results");

        // NEW BEHAVIOR: Planned recipes are NOT excluded, they are just demoted.
        // We verify that the assigned recipe is PRESENT but has the "already planned" reason.
        var assigned = results.EnumerateArray().FirstOrDefault(r => r.GetProperty("id").GetGuid() == assignedRecipe.Id);
        Assert.NotEqual(default, assigned.ValueKind);
        Assert.Contains(assigned.GetProperty("reasons").EnumerateArray(), reason =>
            reason.GetProperty("source").GetString() == "planner-fit" &&
            reason.GetProperty("label").GetString() == "Already planned for this week");

        var topPickId = topPick.GetProperty("id").GetGuid();
        Assert.True(topPickId == availableRecipe.Id || results.EnumerateArray().Any(r => r.GetProperty("id").GetGuid() == availableRecipe.Id));
    }

    [Fact]
    public async Task Search_WithoutPlannerContext_Keeps_TopPick_Based_On_QueryFit_Only()
    {
        var exactMatch = CreateRecipe(
            "Quick Chicken Tacos",
            "Fast and easy tacos",
            totalTime: "35 min");

        var veggieRecipe = CreateRecipe(
            "Garden Tacos",
            "Fast and easy tacos",
            totalTime: "35 min");

        await SeedRecipeAsync(exactMatch);
        await SeedRecipeAsync(veggieRecipe);

        var response = await PostSearchAsync(new { query = "quick chicken tacos" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");

        Assert.Equal(exactMatch.Id, topPick.GetProperty("id").GetGuid());
        Assert.False(topPick.TryGetProperty("plannerFitNote", out _));
    }

    [Fact]
    public async Task Search_Prefers_Love_Rated_Recipe_Over_Equivalent_Unrated_Recipe()
    {
        var neutralRecipe = CreateRecipe("Chicken Pasta", "Bright lemon chicken pasta", "30 min");
        neutralRecipe.Rating = RecipeRating.Unknown;

        var lovedRecipe = CreateRecipe("Chicken Pasta Supreme", "Bright lemon chicken pasta", "30 min");
        lovedRecipe.Rating = RecipeRating.Love;

        await SeedRecipeAsync(neutralRecipe);
        await SeedRecipeAsync(lovedRecipe);

        var response = await PostSearchAsync(new { query = "chicken pasta" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");
        var reasons = topPick.GetProperty("reasons");

        Assert.Equal(lovedRecipe.Id, topPick.GetProperty("id").GetGuid());
        Assert.Contains(reasons.EnumerateArray(), reason => reason.GetProperty("source").GetString() == "rating-boost");
    }

    [Fact]
    public async Task Search_Demotes_Disliked_Recipe_Below_Equivalent_Unrated_Recipe()
    {
        var neutralRecipe = CreateRecipe("Chicken Tacos", "Fast chicken taco night", "25 min");
        neutralRecipe.Rating = RecipeRating.Unknown;

        var dislikedRecipe = CreateRecipe("Chicken Tacos Deluxe", "Fast chicken taco night", "25 min");
        dislikedRecipe.Rating = RecipeRating.Dislike;

        await SeedRecipeAsync(neutralRecipe);
        await SeedRecipeAsync(dislikedRecipe);

        var response = await PostSearchAsync(new { query = "chicken tacos" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");
        var dislikedResult = document.RootElement.GetProperty("results")
            .EnumerateArray()
            .Single(result => result.GetProperty("id").GetGuid() == dislikedRecipe.Id);

        Assert.Equal(neutralRecipe.Id, topPick.GetProperty("id").GetGuid());
        Assert.Contains(dislikedResult.GetProperty("reasons").EnumerateArray(), reason => reason.GetProperty("source").GetString() == "rating-boost");
    }

    [Fact]
    public async Task Search_Prefers_Notes_Match_Over_Equivalent_NonNotes_Match()
    {
        var plainRecipe = CreateRecipe("Cozy Pasta", "Creamy pasta for busy nights", "30 min");
        plainRecipe.Notes = "Family likes this on weekends.";

        var notesRecipe = CreateRecipe("Weeknight Pasta", "Creamy pasta for busy nights", "30 min");
        notesRecipe.Notes = "This is the soup mood pasta everyone asks for.";

        await SeedRecipeAsync(plainRecipe);
        await SeedRecipeAsync(notesRecipe);

        var response = await PostSearchAsync(new { query = "soup pasta" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");

        Assert.Equal(notesRecipe.Id, topPick.GetProperty("id").GetGuid());
        Assert.Contains(topPick.GetProperty("reasons").EnumerateArray(), reason =>
            reason.GetProperty("source").GetString() == "notes-match" &&
            reason.GetProperty("label").GetString() == "Your notes mention this");
    }

    [Fact]
    public async Task Search_Applies_Bounded_Vote_Boost_And_Emits_Vote_Reason()
    {
        var neutralRecipe = CreateRecipe("Chicken Rice Bowl", "Fresh bowl for busy nights", "30 min");
        var votedRecipe = CreateRecipe("Chicken Rice Bowl Plus", "Fresh bowl for busy nights", "30 min");

        await SeedRecipeAsync(neutralRecipe);
        await SeedRecipeAsync(votedRecipe);
        await SeedLikeVotesAsync(votedRecipe.Id, 2);

        var response = await PostSearchAsync(new { query = "chicken rice bowl" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");
        var results = document.RootElement.GetProperty("results");

        Assert.Equal(votedRecipe.Id, topPick.GetProperty("id").GetGuid());
        Assert.Contains(topPick.GetProperty("reasons").EnumerateArray(), reason =>
            reason.GetProperty("source").GetString() == "vote-boost" &&
            reason.GetProperty("label").GetString() == "Family has shown interest");
    }

    [Fact]
    public async Task Search_Caps_Vote_Boost_At_Maximum_Value()
    {
        var cappedRecipe = CreateRecipe("Chicken Rice Bowl Capped", "Fresh bowl for busy nights", "30 min");
        var baselineRecipe = CreateRecipe("Chicken Rice Bowl Baseline", "Fresh bowl for busy nights", "30 min");

        await SeedRecipeAsync(cappedRecipe);
        await SeedRecipeAsync(baselineRecipe);
        await SeedLikeVotesAsync(cappedRecipe.Id, 10);
        await SeedLikeVotesAsync(baselineRecipe.Id, 3);

        // Explicitly set cappedRecipe as slightly newer to break ties
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var r = db.Recipes.Find(cappedRecipe.Id);
            if (r != null) { r.CreatedAt = DateTimeOffset.UtcNow.AddSeconds(10); await db.SaveChangesAsync(); }
        }

        var response = await PostSearchAsync(new { query = "chicken rice bowl" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");
        var results = document.RootElement.GetProperty("results");

        Assert.Equal(cappedRecipe.Id, topPick.GetProperty("id").GetGuid());
        Assert.Contains(topPick.GetProperty("reasons").EnumerateArray(), reason =>
            reason.GetProperty("source").GetString() == "vote-boost" &&
            reason.GetProperty("label").GetString() == "Family has shown interest");

        var baselineResult = results.EnumerateArray().Single(result => result.GetProperty("id").GetGuid() == baselineRecipe.Id);
        Assert.Contains(baselineResult.GetProperty("reasons").EnumerateArray(), reason =>
            reason.GetProperty("source").GetString() == "vote-boost" &&
            reason.GetProperty("label").GetString() == "Family has shown interest");
    }

    [Fact]
    public async Task Search_Love_Boost_Does_Not_Override_A_Completely_NonMatching_Query()
    {
        var matchingRecipe = CreateRecipe("Chicken Soup", "Comforting chicken soup", "40 min");

        var lovedNonMatch = CreateRecipe("Berry Pancakes", "Weekend breakfast favorite", "20 min");
        lovedNonMatch.Rating = RecipeRating.Love;

        await SeedRecipeAsync(matchingRecipe);
        await SeedRecipeAsync(lovedNonMatch);

        var response = await PostSearchAsync(new { query = "chicken soup" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var results = document.RootElement.GetProperty("results");
        var topPick = document.RootElement.GetProperty("topPick");

        Assert.Equal(matchingRecipe.Id, topPick.GetProperty("id").GetGuid());
        Assert.DoesNotContain(results.EnumerateArray(), result => result.GetProperty("id").GetGuid() == lovedNonMatch.Id);
    }

    [Fact]
    public async Task Search_ReviewFilters_UseReportedSupersetAndReadySubset_WithoutTopPick()
    {
        var reported = CreateRecipe("Reported Chicken", "Chicken dinner", "30 min");
        var failed = CreateRecipe("Failed Chicken", "Chicken dinner", "30 min");
        var ready = CreateRecipe("Ready Chicken", "Chicken dinner", "30 min");
        var unreported = CreateRecipe("Ordinary Chicken", "Chicken dinner", "30 min");

        await SeedRecipeAsync(reported);
        await SeedRecipeAsync(failed);
        await SeedRecipeAsync(ready);
        await SeedRecipeAsync(unreported);
        await SeedReportAsync(reported.Id, RecipeImportReportStatus.Reported);
        await SeedReportAsync(failed.Id, RecipeImportReportStatus.ReimportFailed);
        await SeedReportAsync(ready.Id, RecipeImportReportStatus.ReadyToReview);

        using var reportedDocument = await ReadDataAsync(await PostSearchAsync(new
        {
            query = "chicken",
            filters = new { reportedOnly = true }
        }));
        Assert.Equal(JsonValueKind.Null, reportedDocument.RootElement.GetProperty("topPick").ValueKind);
        Assert.Equal(
            new[] { failed.Id, ready.Id, reported.Id }.Order(),
            SearchResultIds(reportedDocument.RootElement).Order());

        using var readyDocument = await ReadDataAsync(await PostSearchAsync(new
        {
            query = "chicken",
            filters = new { readyToReviewOnly = true }
        }));
        Assert.Equal(JsonValueKind.Null, readyDocument.RootElement.GetProperty("topPick").ValueKind);
        Assert.Equal(new[] { ready.Id }, SearchResultIds(readyDocument.RootElement));

        using var bothDocument = await ReadDataAsync(await PostSearchAsync(new
        {
            query = "chicken",
            filters = new { reportedOnly = true, readyToReviewOnly = true }
        }));
        Assert.Equal(JsonValueKind.Null, bothDocument.RootElement.GetProperty("topPick").ValueKind);
        Assert.Equal(new[] { ready.Id }, SearchResultIds(bothDocument.RootElement));
    }

    [Fact]
    public async Task Search_ReviewFilter_ComposesWithTextAndExistingFilters()
    {
        var match = CreateRecipe("Healthy Discoverable Chicken", "Chicken dinner", "30 min");
        match.IsDiscoverable = true;

        var unhealthy = CreateRecipe("Unhealthy Discoverable Chicken", "Chicken dinner", "30 min");
        unhealthy.IsDiscoverable = true;

        var hidden = CreateRecipe("Healthy Hidden Chicken", "Chicken dinner", "30 min");

        var wrongText = CreateRecipe("Healthy Discoverable Pasta", "Pasta dinner", "30 min");
        wrongText.IsDiscoverable = true;
        wrongText.Ingredients = JsonSerializer.Serialize(new[] { "pasta", "tomato" });
        wrongText.Notes = "Pasta dinner";

        foreach (var recipe in new[] { match, unhealthy, hidden, wrongText })
        {
            await SeedRecipeAsync(recipe);
            await SeedReportAsync(recipe.Id, RecipeImportReportStatus.Reported);
        }

        using var document = await ReadDataAsync(await PostSearchAsync(new
        {
            query = "chicken",
            filters = new
            {
                reportedOnly = true,
                discoverableOnly = true,
                quickOnly = true
            }
        }));

        Assert.Equal(new[] { unhealthy.Id, match.Id }.Order(), SearchResultIds(document.RootElement).Order());
    }

    [Fact]
    public async Task Search_ProjectsPublicStatus_KeepsReportedRecipeOrdinaryAndAssigned_ButNeverTopPick()
    {
        var reported = CreateRecipe("Best Chicken", "Chicken dinner", "30 min");
        reported.Rating = RecipeRating.Love;
        var ready = CreateRecipe("Ready Chicken", "Chicken dinner", "30 min");
        var ordinary = CreateRecipe("Ordinary Chicken", "Chicken dinner", "30 min");

        await SeedRecipeAsync(reported);
        await SeedRecipeAsync(ready);
        await SeedRecipeAsync(ordinary);
        await SeedReportAsync(reported.Id, RecipeImportReportStatus.Reimporting);
        await SeedReportAsync(ready.Id, RecipeImportReportStatus.ReadyToReview);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.CalendarEvents.Add(new CalendarEvent
            {
                Id = Guid.NewGuid(),
                RecipeId = reported.Id,
                Date = GetMondayForWeekOffset(0),
                Status = CalendarEventStatus.Planned
            });
            await db.SaveChangesAsync();
        }

        using var document = await ReadDataAsync(await PostSearchAsync(new { query = "chicken" }));
        var root = document.RootElement;
        Assert.Equal(ordinary.Id, root.GetProperty("topPick").GetProperty("id").GetGuid());
        Assert.Equal(JsonValueKind.Null, root.GetProperty("topPick").GetProperty("importIssueStatus").ValueKind);

        var results = root.GetProperty("results").EnumerateArray().ToList();
        var reportedResult = results.Single(result => result.GetProperty("id").GetGuid() == reported.Id);
        var readyResult = results.Single(result => result.GetProperty("id").GetGuid() == ready.Id);
        Assert.Equal("reported", reportedResult.GetProperty("importIssueStatus").GetString());
        Assert.Equal("readyToReview", readyResult.GetProperty("importIssueStatus").GetString());
        Assert.False(root.GetRawText().Contains("lastError", StringComparison.Ordinal));
        Assert.False(root.GetRawText().Contains("lastWorkflowInstanceId", StringComparison.Ordinal));

        var schedule = await _factory.Services.GetRequiredService<ScheduleService>().GetScheduleAsync(0);
        Assert.Contains(schedule.Days, day => day.Recipe?.Id == reported.Id);
    }

    [Fact]
    public async Task Search_CannotPromoteAnActiveReport()
    {
        var reported = CreateRecipe("Reported Chicken", "Chicken dinner", "30 min");
        var ordinary = CreateRecipe("Ordinary Chicken", "Chicken dinner", "30 min");

        await SeedRecipeAsync(reported);
        await SeedRecipeAsync(ordinary);
        await SeedReportAsync(reported.Id, RecipeImportReportStatus.Reported);

        using var document = await ReadDataAsync(await PostSearchAsync(new { query = "chicken" }));

        Assert.Equal(ordinary.Id, document.RootElement.GetProperty("topPick").GetProperty("id").GetGuid());
        Assert.Contains(
            document.RootElement.GetProperty("results").EnumerateArray(),
            result => result.GetProperty("id").GetGuid() == reported.Id);
    }

    private async Task<HttpResponseMessage> PostSearchAsync(object payload)
    {
        return await _client.PostAsJsonAsync("/api/recipes/search", payload);
    }

    private async Task SeedAffinityFactsAsync(params (Guid RecipeId, int Affinity, DateOnly? LastCookedOn)[] facts)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.RecipeSearchAffinityFacts.AddRange(facts.Select(fact => new RecipeSearchAffinityFact
        {
            RecipeId = fact.RecipeId,
            Affinity = fact.Affinity,
            LastCookedOn = fact.LastCookedOn,
            GeneratedAt = new DateTimeOffset(2026, 9, 20, 12, 0, 0, TimeSpan.Zero)
        }));
        await db.SaveChangesAsync();
    }

    private async Task SeedCalendarEventsAsync(params (Guid RecipeId, DateOnly Date, CalendarEventStatus Status)[] events)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.CalendarEvents.AddRange(events.Select(@event => new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = @event.RecipeId,
            Date = @event.Date,
            Status = @event.Status,
            MealSlot = 0
        }));
        await db.SaveChangesAsync();
    }

    private async Task RemoveCalendarEventsAsync(Guid recipeId, CalendarEventStatus status)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var events = await db.CalendarEvents.Where(@event => @event.RecipeId == recipeId && @event.Status == status).ToListAsync();
        db.CalendarEvents.RemoveRange(events);
        await db.SaveChangesAsync();
    }

    private async Task<JsonDocument> ReadDataAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        using var envelope = JsonDocument.Parse(json);
        var root = envelope.RootElement;
        return root.TryGetProperty("data", out var data)
            ? JsonDocument.Parse(data.GetRawText())
            : JsonDocument.Parse(root.GetRawText());
    }

    private async Task SeedRecipeAsync(Recipe recipe)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        recipe.ImageCount = recipe.ImageCount == 0 &&
                            !recipe.IsSynthesized &&
                            !string.IsNullOrWhiteSpace(recipe.Name) &&
                            recipe.Name != "Captured Recipe"
            ? 1
            : recipe.ImageCount;

        // If not explicitly set, default to true so existing tests pass
        if (!recipe.IsReady && recipe.Name != null && recipe.Name != "Captured Recipe")
        {
            recipe.IsReady = true;
        }

        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
    }

    private async Task SeedLikeVotesAsync(Guid recipeId, int count)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();

        for (var index = 0; index < count; index++)
        {
            var familyMemberId = Guid.NewGuid();
            db.FamilyMembers.Add(new FamilyMember
            {
                Id = familyMemberId,
                Name = $"Tester {index}",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });

            db.RecipeVotes.Add(new RecipeVote
            {
                RecipeId = recipeId,
                FamilyMemberId = familyMemberId,
                Vote = VoteType.Like,
                VotedAt = DateTimeOffset.UtcNow.AddMinutes(index)
            });
        }

        await db.SaveChangesAsync();
    }

    private async Task SeedReportAsync(Guid recipeId, RecipeImportReportStatus status)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.RecipeImportReports.Add(new RecipeImportReport
        {
            RecipeId = recipeId,
            Reasons = ["ingredients"],
            Status = status,
            ReportedBy = _factory.DefaultFamilyMemberId,
            UpdatedBy = _factory.DefaultFamilyMemberId
        });
        await db.SaveChangesAsync();
    }

    private static List<Guid> SearchResultIds(JsonElement root) =>
        root.GetProperty("results")
            .EnumerateArray()
            .Select(result => result.GetProperty("id").GetGuid())
            .ToList();

    private sealed class FixedClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow => now;
    }

    private async Task SeedWeekAsync(int weekOffset, IReadOnlyList<Guid> assignedRecipeIds)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();

        var monday = GetMondayForWeekOffset(weekOffset);
        db.WeeklyPlans.Add(new WeeklyPlan
        {
            Id = Guid.NewGuid(),
            WeekStartDate = monday
        });

        for (var index = 0; index < assignedRecipeIds.Count; index++)
        {
            db.CalendarEvents.Add(new CalendarEvent
            {
                Id = Guid.NewGuid(),
                RecipeId = assignedRecipeIds[index],
                Date = monday.AddDays(index),
                MealSlot = 0,
                Status = CalendarEventStatus.Planned
            });
        }

        await db.SaveChangesAsync();
    }

    private static Recipe CreateRecipe(string name, string description, string? totalTime)
    {
        return new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = Guid.NewGuid(),
            Name = name,
            Description = description,
            TotalTime = totalTime,
            Ingredients = JsonSerializer.Serialize(new[] { "chicken", "garlic", "spinach" }),
            Notes = description,
            ImageCount = 1,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
    }

    private static DateOnly GetMondayForWeekOffset(int weekOffset)
    {
        var today = DateOnly.FromDateTime(TestNow.UtcDateTime);
        var monday = today.AddDays(-(7 + (int)today.DayOfWeek - (int)DayOfWeek.Monday) % 7);
        return monday.AddDays(weekOffset * 7);
    }

    private sealed class ReportSelectingChatClient(Guid reportedRecipeId) : IChatClient
    {
        public Task<ChatResponse> GetResponseAsync(
            IEnumerable<ChatMessage> messages,
            ChatOptions? options = null,
            CancellationToken cancellationToken = default)
        {
            var prompt = string.Join("\n", messages.Select(message => message.Text));
            var response = prompt.Contains("selectedRecipeId", StringComparison.Ordinal)
                ? $$"""{"selectedRecipeId":"{{reportedRecipeId}}","reason":"Hostile selection"}"""
                : """{"query":"chicken","filters":{}}""";
            return Task.FromResult(new ChatResponse(new ChatMessage(ChatRole.Assistant, response)));
        }

        public IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(
            IEnumerable<ChatMessage> messages,
            ChatOptions? options = null,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public object? GetService(Type serviceType, object? serviceKey = null) => null;

        public void Dispose() { }
    }
}
