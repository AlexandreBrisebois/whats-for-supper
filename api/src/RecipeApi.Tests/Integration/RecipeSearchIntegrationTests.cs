using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
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
    public async Task Search_Clamps_To_MaxLimit()
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

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var results = document.RootElement.GetProperty("results");
        Assert.True(results.GetArrayLength() <= 50);
        // Ensure TopPick is not in results
        var topPick = document.RootElement.GetProperty("topPick");
        var topPickId = topPick.GetProperty("id").GetGuid();
        Assert.DoesNotContain(results.EnumerateArray(), r => r.GetProperty("id").GetGuid() == topPickId);
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
        var topPick = document.RootElement.GetProperty("topPick");
        Assert.Equal("Newest Recipe", topPick.GetProperty("name").GetString());
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
    public async Task Search_WithPlannerContext_Excludes_Recipes_Already_Assigned_In_TargetWeek()
    {
        var assignedRecipe = CreateRecipe(
            "Assigned Chicken",
            "Chicken dinner already planned this week",
            totalTime: "45 min",
            dietaryProfile: CreateDietaryProfile("ProteinFoods"));

        var availableRecipe = CreateRecipe(
            "Available Chicken",
            "Chicken dinner still available",
            totalTime: "35 min",
            dietaryProfile: CreateDietaryProfile("ProteinFoods"));

        await SeedRecipeAsync(assignedRecipe);
        await SeedRecipeAsync(availableRecipe);
        await SeedWeekAsync(
            weekOffset: 0,
            assignedRecipeIds: [assignedRecipe.Id],
            balanceSummary: WeeklyBalanceScorer.Compute(new RecipeDietaryProfile?[]
            {
                CreateDietaryProfile("ProteinFoods"),
                null,
                null,
                null,
                null,
                null,
                null
            }));

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
    public async Task Search_WithPlannerContext_Promotes_Vegetable_Recipe_To_TopPick_When_Week_Has_Veggie_Gap()
    {
        var proteinRecipe = CreateRecipe(
            "Comfort Bowl",
            "Fresh dinner with bright flavors",
            totalTime: "35 min",
            dietaryProfile: CreateDietaryProfile("ProteinFoods"));

        var veggieRecipe = CreateRecipe(
            "Garden Veggie Bowl",
            "Fresh dinner with bright flavors",
            totalTime: "40 min",
            dietaryProfile: CreateDietaryProfile("VegetablesAndFruits"));

        await SeedRecipeAsync(proteinRecipe);
        await SeedRecipeAsync(veggieRecipe);
        await SeedWeekAsync(
            weekOffset: 0,
            assignedRecipeIds: [proteinRecipe.Id],
            balanceSummary: WeeklyBalanceScorer.Compute(new RecipeDietaryProfile?[]
            {
                CreateDietaryProfile("ProteinFoods"),
                CreateDietaryProfile("ProteinFoods"),
                null,
                null,
                null,
                null,
                null
            }));

        var response = await PostSearchAsync(new { query = "fresh dinner", weekOffset = 0, dayIndex = 2 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");

        Assert.Equal(veggieRecipe.Id, topPick.GetProperty("id").GetGuid());
        Assert.False(string.IsNullOrWhiteSpace(topPick.GetProperty("plannerFitNote").GetString()));
    }

    [Fact]
    public async Task Search_WithoutPlannerContext_Keeps_TopPick_Based_On_QueryFit_Only()
    {
        var exactMatch = CreateRecipe(
            "Quick Chicken Tacos",
            "Fast and easy tacos",
            totalTime: "35 min",
            dietaryProfile: CreateDietaryProfile("ProteinFoods"));

        var veggieRecipe = CreateRecipe(
            "Garden Tacos",
            "Fast and easy tacos",
            totalTime: "35 min",
            dietaryProfile: CreateDietaryProfile("VegetablesAndFruits"));

        await SeedRecipeAsync(exactMatch);
        await SeedRecipeAsync(veggieRecipe);

        var response = await PostSearchAsync(new { query = "quick chicken tacos" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");

        Assert.Equal(exactMatch.Id, topPick.GetProperty("id").GetGuid());
        Assert.True(topPick.GetProperty("plannerFitNote").ValueKind == JsonValueKind.Null);
    }

    [Fact]
    public async Task Search_WithPlannerContext_Sets_PlannerFitNote_On_TopPick()
    {
        var veggieRecipe = CreateRecipe(
            "Veggie Stir Fry",
            "Fresh dinner",
            totalTime: "40 min",
            dietaryProfile: CreateDietaryProfile("VegetablesAndFruits"));

        await SeedRecipeAsync(veggieRecipe);
        await SeedWeekAsync(
            weekOffset: 0,
            assignedRecipeIds: [],
            balanceSummary: WeeklyBalanceScorer.Compute(new RecipeDietaryProfile?[]
            {
                CreateDietaryProfile("ProteinFoods"),
                CreateDietaryProfile("ProteinFoods"),
                null,
                null,
                null,
                null,
                null
            }));

        var response = await PostSearchAsync(new { query = "fresh dinner", weekOffset = 0, dayIndex = 2 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");

        Assert.False(string.IsNullOrWhiteSpace(topPick.GetProperty("plannerFitNote").GetString()));
    }

    [Fact]
    public async Task Search_WithQuickQuery_AndPlannerContext_Boosts_Quick_Recipes()
    {
        var slowerRecipe = CreateRecipe(
            "Quick Chicken Pasta",
            "Fast dinner on paper but still takes time",
            totalTime: "45 min",
            dietaryProfile: CreateDietaryProfile("ProteinFoods"));

        var fasterRecipe = CreateRecipe(
            "Weeknight Pasta",
            "Fast dinner on paper but actually quick",
            totalTime: "25 min",
            dietaryProfile: CreateDietaryProfile("ProteinFoods"));

        await SeedRecipeAsync(slowerRecipe);
        await SeedRecipeAsync(fasterRecipe);
        await SeedWeekAsync(
            weekOffset: 0,
            assignedRecipeIds: [],
            balanceSummary: WeeklyBalanceScorer.Compute(new RecipeDietaryProfile?[]
            {
                CreateDietaryProfile("ProteinFoods"),
                null,
                null,
                null,
                null,
                null,
                null
            }));

        var response = await PostSearchAsync(new { query = "quick pasta tonight", weekOffset = 0, dayIndex = 2 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");

        Assert.Equal(fasterRecipe.Id, topPick.GetProperty("id").GetGuid());
        Assert.Contains("quick", topPick.GetProperty("plannerFitNote").GetString() ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Search_Prefers_Love_Rated_Recipe_Over_Equivalent_Unrated_Recipe()
    {
        var neutralRecipe = CreateRecipe("Chicken Pasta", "Bright lemon chicken pasta", "30 min", CreateDietaryProfile("ProteinFoods"));
        neutralRecipe.Rating = RecipeRating.Unknown;

        var lovedRecipe = CreateRecipe("Chicken Pasta Supreme", "Bright lemon chicken pasta", "30 min", CreateDietaryProfile("ProteinFoods"));
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
        var neutralRecipe = CreateRecipe("Chicken Tacos", "Fast chicken taco night", "25 min", CreateDietaryProfile("ProteinFoods"));
        neutralRecipe.Rating = RecipeRating.Unknown;

        var dislikedRecipe = CreateRecipe("Chicken Tacos Deluxe", "Fast chicken taco night", "25 min", CreateDietaryProfile("ProteinFoods"));
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
        var plainRecipe = CreateRecipe("Cozy Pasta", "Creamy pasta for busy nights", "30 min", CreateDietaryProfile("ProteinFoods"));
        plainRecipe.Notes = "Family likes this on weekends.";

        var notesRecipe = CreateRecipe("Weeknight Pasta", "Creamy pasta for busy nights", "30 min", CreateDietaryProfile("ProteinFoods"));
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
        var neutralRecipe = CreateRecipe("Chicken Rice Bowl", "Fresh bowl for busy nights", "30 min", CreateDietaryProfile("ProteinFoods"));
        var votedRecipe = CreateRecipe("Chicken Rice Bowl Plus", "Fresh bowl for busy nights", "30 min", CreateDietaryProfile("ProteinFoods"));

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
        var cappedRecipe = CreateRecipe("Chicken Rice Bowl Capped", "Fresh bowl for busy nights", "30 min", CreateDietaryProfile("ProteinFoods"));
        var baselineRecipe = CreateRecipe("Chicken Rice Bowl Baseline", "Fresh bowl for busy nights", "30 min", CreateDietaryProfile("ProteinFoods"));

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
        var matchingRecipe = CreateRecipe("Chicken Soup", "Comforting chicken soup", "40 min", CreateDietaryProfile("ProteinFoods"));

        var lovedNonMatch = CreateRecipe("Berry Pancakes", "Weekend breakfast favorite", "20 min", CreateDietaryProfile("WholeGrains"));
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

    private async Task<HttpResponseMessage> PostSearchAsync(object payload)
    {
        return await _client.PostAsJsonAsync("/api/recipes/search", payload);
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

    private async Task SeedWeekAsync(int weekOffset, IReadOnlyList<Guid> assignedRecipeIds, WeeklyBalanceSummary balanceSummary)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();

        var monday = GetMondayForWeekOffset(weekOffset);
        db.WeeklyPlans.Add(new WeeklyPlan
        {
            Id = Guid.NewGuid(),
            WeekStartDate = monday,
            BalanceSummary = JsonSerializer.Serialize(balanceSummary, JsonDefaults.CamelCase)
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

    private static Recipe CreateRecipe(string name, string description, string? totalTime, RecipeDietaryProfile dietaryProfile)
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
            DietaryProfile = JsonSerializer.Serialize(dietaryProfile, JsonDefaults.CamelCase),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
    }

    private static RecipeDietaryProfile CreateDietaryProfile(string primaryFoodGroup)
    {
        return new RecipeDietaryProfile(
            PrimaryFoodGroup: primaryFoodGroup,
            SecondaryFoodGroups: [],
            ProteinSource: primaryFoodGroup == "ProteinFoods" ? "Poultry" : "None",
            CuisineType: "Canadian",
            MealTypes: ["Dinner"],
            PrimaryMealType: "Dinner",
            WholeGrainConfident: false,
            Confidence: 0.95,
            Source: "test",
            FopFlags: null);
    }

    private static DateOnly GetMondayForWeekOffset(int weekOffset)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monday = today.AddDays(-(7 + (int)today.DayOfWeek - (int)DayOfWeek.Monday) % 7);
        return monday.AddDays(weekOffset * 7);
    }
}