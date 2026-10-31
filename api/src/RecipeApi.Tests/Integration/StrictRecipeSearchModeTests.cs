using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed class StrictRecipeSearchModeTests : IAsyncLifetime
{
    private static readonly DateTimeOffset TestNow = new(2026, 10, 22, 12, 0, 0, TimeSpan.Zero);
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

    [Theory]
    [InlineData("""{"filters":{"gotoOnly":false}}""")]
    [InlineData("""{"filters":{"gotoOnly":null}}""")]
    [InlineData("""{}""")]
    [InlineData("""{"query":" ","filters":null}""")]
    [InlineData("""{"query":"","filters":{}}""")]
    [InlineData("""{"query":"","filters":{"cuisines":[" "],"mealTypes":[],"includedIngredients":[],"categories":[],"maximumTotalMinutes":null,"newRecipes":false,"neverCooked":false,"familyFavorite":false,"quickOnly":false,"vegetarianOnly":false,"notCookedInLongTime":false,"reportedOnly":false,"readyToReviewOnly":false,"discoverableOnly":false}}""")]
    public async Task EmptyAndInactiveFilterRepresentationsSelectDiscovery(string payload)
    {
        using var response = await SearchJsonAsync(payload);

        Assert.Equal("discovery", response.RootElement.GetProperty("searchMode").GetString());
    }

    [Theory]
    [InlineData("""{"query":"chicken"}""", "explicit")]
    [InlineData("""{"preferences":{"concepts":[" fish "," "]}}""", "explicit")]
    [InlineData("""{"query":"chicken","preferences":{"concepts":["fish"]},"filters":{"newRecipes":true},"similarToRecipeId":"11111111-1111-1111-1111-111111111111"}""", "similar")]
    public async Task TextConceptAndSimilarRequestsReportTheirCanonicalModes(string payload, string expectedMode)
    {
        using var response = await SearchJsonAsync(payload);

        Assert.Equal(expectedMode, response.RootElement.GetProperty("searchMode").GetString());
        Assert.NotEqual("standard", response.RootElement.GetProperty("searchMode").GetString());
    }

    [Theory]
    [InlineData("""{"cuisines":[" Italian "]}""")]
    [InlineData("""{"newRecipes":true}""")]
    [InlineData("""{"neverCooked":true}""")]
    [InlineData("""{"familyFavorite":true}""")]
    [InlineData("""{"quickOnly":true}""")]
    [InlineData("""{"vegetarianOnly":true}""")]
    [InlineData("""{"notCookedInLongTime":true}""")]
    [InlineData("""{"reportedOnly":true}""")]
    [InlineData("""{"readyToReviewOnly":true}""")]
    [InlineData("""{"gotoOnly":true}""")]
    [InlineData("""{"discoverableOnly":true}""")]
    public async Task SupportedEffectiveFiltersSelectExplicit(string filters)
    {
        using var response = await SearchJsonAsync($$"""{"filters":{{filters}}}""");

        Assert.Equal("explicit", response.RootElement.GetProperty("searchMode").GetString());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task GotoMembership_IntersectsTypedAndFilterOnlyResults(bool typed)
    {
        var configured = Recipe(Guid.NewGuid(), "Chicken configured", TestNow.AddDays(-2));
        var loved = Recipe(Guid.NewGuid(), "Chicken loved", TestNow, RecipeRating.Love);
        await SeedRecipesAsync(configured, loved);
        using var save = await _client.PutAsJsonAsync("/api/goto", new { items = new[] { new { recipeId = configured.Id } } });
        save.EnsureSuccessStatusCode();
        using var response = await SearchAsync(new { query = typed ? "chicken" : "", filters = new { gotoOnly = true }, limit = 10 });
        Assert.Equal("explicit", response.RootElement.GetProperty("searchMode").GetString());
        Assert.Equal(new[] { configured.Id }, OrderedIds(response.RootElement));
        using var intersection = await SearchAsync(new { filters = new { gotoOnly = true, familyFavorite = true } });
        Assert.Empty(OrderedIds(intersection.RootElement));
    }

    [Fact]
    public async Task GotoMembership_EmptyDoesNotFallBack_AndChangedFilterRejectsCursor()
    {
        await SeedRecipesAsync(Enumerable.Range(0, 6).Select(i => Recipe(Guid.NewGuid(), $"Recipe {i}", TestNow.AddDays(-i))).ToArray());
        using var first = await SearchAsync(new { filters = new { newRecipes = true }, limit = 1 });
        using var mismatch = await _client.PostAsJsonAsync("/api/recipes/search", new { filters = new { newRecipes = true, gotoOnly = true }, continuationToken = RequiredCursor(first.RootElement), limit = 1 });
        Assert.Equal(HttpStatusCode.Conflict, mismatch.StatusCode);
        using var empty = await SearchAsync(new { filters = new { gotoOnly = true } });
        Assert.Empty(OrderedIds(empty.RootElement));
    }

    [Fact]
    public async Task GotoRankedContinuation_RechecksRemovalAndDoesNotInsertNewMembers()
    {
        var recipes = Enumerable.Range(0, 6).Select(i => Recipe(Guid.NewGuid(), $"Chicken {i}", TestNow.AddDays(-i))).ToArray();
        await SeedRecipesAsync(recipes);
        using var save = await _client.PutAsJsonAsync("/api/goto", new { items = recipes.Take(5).Select(recipe => new { recipeId = recipe.Id }).ToArray() });
        save.EnsureSuccessStatusCode();
        using var first = await SearchAsync(new { filters = new { gotoOnly = true }, limit = 1 });
        var served = OrderedIds(first.RootElement);
        var remaining = recipes.Take(5).Select(recipe => recipe.Id).Except(served).ToArray();
        Assert.NotEmpty(remaining);
        using var changed = await _client.PutAsJsonAsync("/api/goto", new { items = recipes.Where(recipe => recipe.Id != remaining[0]).Select(recipe => new { recipeId = recipe.Id }).ToArray() });
        changed.EnsureSuccessStatusCode();
        using var next = await SearchAsync(new { filters = new { gotoOnly = true }, limit = 10, continuationToken = RequiredCursor(first.RootElement) });
        Assert.Equal(remaining.Skip(1), OrderedIds(next.RootElement));
        Assert.DoesNotContain(recipes[5].Id, OrderedIds(next.RootElement));
    }

    [Fact]
    public async Task FilterOnlyUsesCreationThenNormalizedName()
    {
        var sharedCreatedAt = TestNow.AddDays(-1);
        var alpha = Recipe(Guid.Parse("ffffffff-ffff-ffff-ffff-ffffffffffff"), "alpha", sharedCreatedAt);
        var zulu = Recipe(Guid.Parse("00000000-0000-0000-0000-000000000001"), "Zulu", sharedCreatedAt);
        var older = Recipe(Guid.NewGuid(), "Older", TestNow.AddDays(-2));
        await SeedRecipesAsync(alpha, zulu, older);

        using var response = await SearchAsync(new { filters = new { newRecipes = true }, limit = 10 });
        var ordered = OrderedIds(response.RootElement);

        Assert.Equal(new[] { alpha.Id, zulu.Id, older.Id }, ordered);
    }

    [Fact]
    public async Task FilterOnlyOrderIgnoresHouseholdSignals()
    {
        var newer = Recipe(Guid.NewGuid(), "Newer", TestNow.AddDays(-1));
        var olderFavorite = Recipe(Guid.NewGuid(), "Older favorite", TestNow.AddDays(-2), RecipeRating.Love);
        await SeedRecipesAsync(newer, olderFavorite);
        await SeedAffinityAsync(olderFavorite.Id, affinity: 50, lastCookedOn: DateOnly.FromDateTime(TestNow.UtcDateTime).AddDays(-60));

        using var response = await SearchAsync(new { filters = new { newRecipes = true }, limit = 10 });

        Assert.Equal(new[] { newer.Id, olderFavorite.Id }, OrderedIds(response.RootElement));
    }

    [Fact]
    public async Task OldestCookedFilterUsesCookedRecencyBeforeCreation()
    {
        var oldestCooked = Recipe(Guid.NewGuid(), "Oldest cooked", TestNow.AddDays(-1));
        oldestCooked.LastCookedDate = TestNow.AddDays(-60);
        var middleCooked = Recipe(Guid.NewGuid(), "Middle cooked", TestNow.AddDays(-3));
        middleCooked.LastCookedDate = TestNow.AddDays(-30);
        var newestCooked = Recipe(Guid.NewGuid(), "Newest cooked", TestNow.AddDays(-5));
        newestCooked.LastCookedDate = TestNow.AddDays(-7);
        await SeedRecipesAsync(newestCooked, oldestCooked, middleCooked);

        using var response = await SearchAsync(new { filters = new { notCookedInLongTime = true }, limit = 10 });

        Assert.Equal("explicit", response.RootElement.GetProperty("searchMode").GetString());
        Assert.Equal(new[] { oldestCooked.Id, middleCooked.Id, newestCooked.Id }, OrderedIds(response.RootElement));
    }

    [Fact]
    public async Task TypedExplicitPreservesStrongerRetrievalMatchDespiteHouseholdSignals()
    {
        var stronger = Recipe(Guid.NewGuid(), "Chicken Noodle Soup", TestNow, RecipeRating.Dislike);
        var weakerFavorite = Recipe(Guid.NewGuid(), "Chicken Noodle Soups", TestNow.AddMinutes(-1), RecipeRating.Love);
        await SeedRecipesAsync(stronger, weakerFavorite);
        await SeedLikeVotesAsync(weakerFavorite.Id, 3);
        await SeedHistoricalInterestAsync(weakerFavorite.Id);

        using var response = await SearchAsync(new { query = "chicken noodle soup", limit = 10 });

        Assert.Equal("explicit", response.RootElement.GetProperty("searchMode").GetString());
        Assert.Equal(new[] { stronger.Id, weakerFavorite.Id }, OrderedIds(response.RootElement));
    }

    [Fact]
    public async Task ConceptExplicitPreservesCreationTieBreakDespiteHistoricalInterest()
    {
        var newer = Recipe(Guid.NewGuid(), "Lentil Stew Newer", TestNow);
        var olderWithHistory = Recipe(Guid.NewGuid(), "Lentil Stew Older", TestNow.AddMinutes(-1));
        await SeedRecipesAsync(newer, olderWithHistory);
        await SeedHistoricalInterestAsync(olderWithHistory.Id);

        using var response = await SearchAsync(new
        {
            preferences = new { concepts = new[] { "lentil stew" } },
            limit = 10
        });

        Assert.Equal("explicit", response.RootElement.GetProperty("searchMode").GetString());
        Assert.Equal(new[] { newer.Id, olderWithHistory.Id }, OrderedIds(response.RootElement));
    }

    [Fact]
    public async Task ExplicitPlannerContextDoesNotDemoteBaseRankOne()
    {
        var plannedRankOne = Recipe(Guid.NewGuid(), "Tomato Pasta Planned", TestNow);
        var availableRankTwo = Recipe(Guid.NewGuid(), "Tomato Pasta Available", TestNow.AddMinutes(-1));
        await SeedRecipesAsync(plannedRankOne, availableRankTwo);
        await SeedPlannedWeekAsync(plannedRankOne.Id);

        using var response = await SearchAsync(new
        {
            query = "tomato pasta",
            weekOffset = 0,
            dayIndex = 1,
            limit = 10
        });

        Assert.Equal(new[] { plannedRankOne.Id, availableRankTwo.Id }, OrderedIds(response.RootElement));
    }

    [Fact]
    public async Task SimilarPlannerContextDoesNotDemoteBaseRankOne()
    {
        var source = Recipe(Guid.NewGuid(), "Tomato Pasta Source", TestNow.AddMinutes(1));
        var plannedRankOne = Recipe(Guid.NewGuid(), "Tomato Pasta Planned", TestNow);
        var availableRankTwo = Recipe(Guid.NewGuid(), "Tomato Pasta Available", TestNow.AddMinutes(-1));
        await SeedRecipesAsync(source, plannedRankOne, availableRankTwo);
        await SeedPlannedWeekAsync(plannedRankOne.Id);

        using var response = await SearchAsync(new
        {
            similarToRecipeId = source.Id,
            weekOffset = 0,
            dayIndex = 1,
            limit = 10
        });

        Assert.Equal("similar", response.RootElement.GetProperty("searchMode").GetString());
        Assert.Equal(new[] { plannedRankOne.Id, availableRankTwo.Id }, OrderedIds(response.RootElement));
    }

    [Fact]
    public async Task ReportedExplicitRankOneRemainsFirstOrdinaryResultWithoutPromotingRankTwo()
    {
        var reportedRankOne = Recipe(Guid.NewGuid(), "Chicken Soup", TestNow);
        var eligibleRankTwo = Recipe(Guid.NewGuid(), "Chicken Soups", TestNow.AddMinutes(-1));
        await SeedRecipesAsync(reportedRankOne, eligibleRankTwo);
        await SeedReportAsync(reportedRankOne.Id);

        using var response = await SearchAsync(new { query = "chicken soup", limit = 10 });

        Assert.Equal(JsonValueKind.Null, response.RootElement.GetProperty("topPick").ValueKind);
        Assert.Equal(
            new[] { reportedRankOne.Id, eligibleRankTwo.Id },
            response.RootElement.GetProperty("results").EnumerateArray().Select(result => result.GetProperty("id").GetGuid()));
    }

    [Theory]
    [InlineData("""{}""")]
    [InlineData("""{"cuisines":[],"mealTypes":[],"newRecipes":false,"neverCooked":false,"familyFavorite":false,"quickOnly":false,"vegetarianOnly":false,"notCookedInLongTime":false,"reportedOnly":false,"readyToReviewOnly":false,"discoverableOnly":false}""")]
    [InlineData("""{"cuisines":[" "],"mealTypes":[],"includedIngredients":[],"categories":[],"maximumTotalMinutes":null}""")]
    public async Task ContinuationAcceptsSemanticallyEquivalentInactiveFilterRepresentations(string filters)
    {
        var recipes = Enumerable.Range(0, 4)
            .Select(index => Recipe(Guid.NewGuid(), "Chicken soup", TestNow.AddMinutes(-index)))
            .ToArray();
        await SeedRecipesAsync(recipes);

        using var first = await SearchAsync(new { query = "chicken soup", limit = 1 });
        var cursor = RequiredCursor(first.RootElement);
        var firstPageIds = OrderedIds(first.RootElement).ToHashSet();

        using var response = await PostSearchJsonAsync(
            $$"""{"query":"chicken soup","limit":1,"filters":{{filters}},"continuationToken":"{{cursor}}"}""");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var continuation = await ReadSearchAsync(response);
        Assert.Equal(JsonValueKind.Null, continuation.RootElement.GetProperty("topPick").ValueKind);
        Assert.DoesNotContain(OrderedIds(continuation.RootElement), firstPageIds.Contains);
    }

    [Fact]
    public async Task ContinuationRejectsChangedEffectiveIntent()
    {
        await SeedRecipesAsync(
            Recipe(Guid.NewGuid(), "Newest", TestNow),
            Recipe(Guid.NewGuid(), "Middle", TestNow.AddMinutes(-1)),
            Recipe(Guid.NewGuid(), "Oldest", TestNow.AddMinutes(-2)));

        using var first = await SearchAsync(new { filters = new { newRecipes = true }, limit = 1 });
        var cursor = RequiredCursor(first.RootElement);

        using var response = await PostSearchAsync(new
        {
            filters = new { neverCooked = true },
            limit = 1,
            continuationToken = cursor
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("Restart the search", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task ExplicitContinuationPreservesFrozenOrderAfterHouseholdHistoryAndPlannerChanges()
    {
        var first = Recipe(Guid.NewGuid(), "Chicken casserole", TestNow);
        var second = Recipe(Guid.NewGuid(), "Chicken casserole", TestNow.AddMinutes(-1));
        var third = Recipe(Guid.NewGuid(), "Chicken casserole", TestNow.AddMinutes(-2));
        var fourth = Recipe(Guid.NewGuid(), "Chicken casserole", TestNow.AddMinutes(-3));
        await SeedRecipesAsync(first, second, third, fourth);

        using var pageOne = await SearchAsync(new { query = "chicken casserole", weekOffset = 0, dayIndex = 1, limit = 1 });
        Assert.Equal(new[] { first.Id, second.Id }, OrderedIds(pageOne.RootElement));
        var cursor = RequiredCursor(pageOne.RootElement);

        await UpdateRatingAsync(fourth.Id, RecipeRating.Love);
        await SeedLikeVotesAsync(fourth.Id, 3);
        await SeedHistoricalInterestAsync(fourth.Id);
        await SeedPlannedWeekAsync(third.Id);

        using var pageTwo = await SearchAsync(new
        {
            query = "chicken casserole",
            weekOffset = 0,
            dayIndex = 1,
            limit = 1,
            continuationToken = cursor
        });

        Assert.Equal(JsonValueKind.Null, pageTwo.RootElement.GetProperty("topPick").ValueKind);
        Assert.Equal(new[] { third.Id }, OrderedIds(pageTwo.RootElement));
    }

    [Fact]
    public async Task SimilarContinuationPreservesFrozenOrderAfterHouseholdAndPlannerChanges()
    {
        var source = Recipe(Guid.NewGuid(), "Tomato pasta source", TestNow.AddMinutes(1));
        source.Ingredients = JsonSerializer.Serialize(new[] { "tomato", "pasta", "basil", "garlic" });
        var strongest = SimilarRecipe("Tomato pasta one", TestNow, "tomato", "pasta", "basil", "garlic");
        var next = SimilarRecipe("Tomato pasta two", TestNow.AddMinutes(-1), "tomato", "pasta", "basil");
        var third = SimilarRecipe("Tomato pasta three", TestNow.AddMinutes(-2), "tomato", "pasta");
        var weakest = SimilarRecipe("Tomato pasta four", TestNow.AddMinutes(-3), "tomato");
        await SeedRecipesAsync(source, strongest, next, third, weakest);

        using var pageOne = await SearchAsync(new { similarToRecipeId = source.Id, weekOffset = 0, dayIndex = 1, limit = 1 });
        Assert.Equal(new[] { strongest.Id, next.Id }, OrderedIds(pageOne.RootElement));
        var cursor = RequiredCursor(pageOne.RootElement);

        await UpdateRatingAsync(weakest.Id, RecipeRating.Love);
        await SeedLikeVotesAsync(weakest.Id, 3);
        await SeedPlannedWeekAsync(third.Id);

        using var pageTwo = await SearchAsync(new
        {
            similarToRecipeId = source.Id,
            weekOffset = 0,
            dayIndex = 1,
            limit = 1,
            continuationToken = cursor
        });

        Assert.Equal(JsonValueKind.Null, pageTwo.RootElement.GetProperty("topPick").ValueKind);
        Assert.Equal(new[] { third.Id }, OrderedIds(pageTwo.RootElement));
    }

    [Fact]
    public async Task StrictContinuationNeverRepeatsTopPick()
    {
        var recipes = Enumerable.Range(0, 5)
            .Select(index => Recipe(Guid.NewGuid(), $"Recipe {index}", TestNow.AddMinutes(-index)))
            .ToArray();
        await SeedRecipesAsync(recipes);

        using var pageOne = await SearchAsync(new { filters = new { newRecipes = true }, limit = 1 });
        var topPickId = pageOne.RootElement.GetProperty("topPick").GetProperty("id").GetGuid();
        var seen = OrderedIds(pageOne.RootElement).ToHashSet();
        var cursor = RequiredCursor(pageOne.RootElement);

        while (cursor is not null)
        {
            using var page = await SearchAsync(new
            {
                filters = new { newRecipes = true },
                limit = 1,
                continuationToken = cursor
            });
            Assert.Equal(JsonValueKind.Null, page.RootElement.GetProperty("topPick").ValueKind);
            foreach (var id in OrderedIds(page.RootElement))
            {
                Assert.NotEqual(topPickId, id);
                Assert.True(seen.Add(id), $"Recipe {id} was returned more than once.");
            }
            cursor = page.RootElement.GetProperty("nextCursor").GetString();
        }

        Assert.Equal(recipes.Length, seen.Count);
    }

    [Fact]
    public async Task ContinuationRejectsChangedPlannerRequestIdentity()
    {
        var recipes = Enumerable.Range(0, 4)
            .Select(index => Recipe(Guid.NewGuid(), "Chicken skillet", TestNow.AddMinutes(-index)))
            .ToArray();
        await SeedRecipesAsync(recipes);

        using var first = await SearchAsync(new { query = "chicken skillet", weekOffset = 0, dayIndex = 1, limit = 1 });
        var cursor = RequiredCursor(first.RootElement);

        using var response = await PostSearchAsync(new
        {
            query = "chicken skillet",
            weekOffset = 0,
            dayIndex = 2,
            limit = 1,
            continuationToken = cursor
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task ContinuationRejectsChangedRecoveryGeneration()
    {
        var recipes = Enumerable.Range(0, 4)
            .Select(index => Recipe(Guid.NewGuid(), $"Recovery recipe {index}", TestNow.AddMinutes(-index)))
            .ToArray();
        await SeedRecipesAsync(recipes);

        using var first = await SearchAsync(new { filters = new { newRecipes = true }, limit = 1 });
        var cursor = RequiredCursor(first.RootElement);
        await PublishRecoveryGenerationAsync();

        using var response = await PostSearchAsync(new
        {
            filters = new { newRecipes = true },
            limit = 1,
            continuationToken = cursor
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    private async Task<JsonDocument> SearchAsync(object payload)
    {
        using var response = await PostSearchAsync(payload);
        response.EnsureSuccessStatusCode();
        return await ReadSearchAsync(response);
    }

    private Task<HttpResponseMessage> PostSearchAsync(object payload) =>
        _client.PostAsJsonAsync("/api/recipes/search", payload);

    private async Task<HttpResponseMessage> PostSearchJsonAsync(string payload)
    {
        using var json = JsonDocument.Parse(payload);
        return await _client.PostAsJsonAsync("/api/recipes/search", json.RootElement);
    }

    private static async Task<JsonDocument> ReadSearchAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        using var envelope = JsonDocument.Parse(json);
        return envelope.RootElement.TryGetProperty("data", out var data)
            ? JsonDocument.Parse(data.GetRawText())
            : JsonDocument.Parse(envelope.RootElement.GetRawText());
    }

    private async Task<JsonDocument> SearchJsonAsync(string payload)
    {
        using var json = JsonDocument.Parse(payload);
        return await SearchAsync(json.RootElement);
    }

    private async Task SeedRecipesAsync(params Recipe[] recipes)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        foreach (var recipe in recipes)
        {
            recipe.AddedBy = _factory.DefaultFamilyMemberId;
            recipe.IsReady = true;
            recipe.ImageCount = 1;
        }
        db.Recipes.AddRange(recipes);
        await db.SaveChangesAsync();
    }

    private async Task SeedAffinityAsync(Guid recipeId, int affinity, DateOnly lastCookedOn)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.RecipeSearchAffinityFacts.Add(new RecipeSearchAffinityFact
        {
            RecipeId = recipeId,
            Affinity = affinity,
            LastCookedOn = lastCookedOn,
            GeneratedAt = TestNow
        });
        await db.SaveChangesAsync();
    }

    private async Task SeedLikeVotesAsync(Guid recipeId, int count)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        for (var index = 0; index < count; index++)
        {
            var member = new FamilyMember
            {
                Id = Guid.NewGuid(),
                Name = $"Strict mode voter {index}",
                CreatedAt = TestNow,
                UpdatedAt = TestNow
            };
            db.FamilyMembers.Add(member);
            db.RecipeVotes.Add(new RecipeVote
            {
                RecipeId = recipeId,
                FamilyMemberId = member.Id,
                Vote = VoteType.Like,
                VotedAt = TestNow.AddMinutes(index)
            });
        }
        await db.SaveChangesAsync();
    }

    private async Task SeedHistoricalInterestAsync(Guid recipeId)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.WeeklyHouseholdInterests.Add(new WeeklyHouseholdInterest
        {
            RecipeId = recipeId,
            WeekStartDate = CurrentMonday().AddDays(-7),
            PositiveCount = 1,
            Selected = false,
            CapturedAt = TestNow.AddDays(-1),
            CloseId = Guid.NewGuid()
        });
        await db.SaveChangesAsync();
    }

    private async Task SeedPlannedWeekAsync(Guid recipeId)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.WeeklyPlans.Add(new WeeklyPlan
        {
            Id = Guid.NewGuid(),
            WeekStartDate = CurrentMonday(),
            Status = WeeklyPlanStatus.Draft,
            CreatedAt = TestNow
        });
        db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = CurrentMonday(),
            MealSlot = 0,
            Status = CalendarEventStatus.Planned
        });
        await db.SaveChangesAsync();
    }

    private async Task SeedReportAsync(Guid recipeId)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.RecipeImportReports.Add(new RecipeImportReport
        {
            RecipeId = recipeId,
            Reasons = ["ingredients"],
            Status = RecipeImportReportStatus.Reported,
            ReportedBy = _factory.DefaultFamilyMemberId,
            UpdatedBy = _factory.DefaultFamilyMemberId
        });
        await db.SaveChangesAsync();
    }

    private async Task UpdateRatingAsync(Guid recipeId, RecipeRating rating)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = await db.Recipes.SingleAsync(candidate => candidate.Id == recipeId);
        recipe.Rating = rating;
        await db.SaveChangesAsync();
    }

    private async Task PublishRecoveryGenerationAsync()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.RecoveryPublications.Add(new RecoveryPublication
        {
            OperationId = Guid.NewGuid(),
            SnapshotId = Guid.NewGuid()
        });
        await db.SaveChangesAsync();
    }

    private static DateOnly CurrentMonday()
    {
        var today = DateOnly.FromDateTime(TestNow.UtcDateTime);
        return today.AddDays(-((7 + (int)today.DayOfWeek - (int)DayOfWeek.Monday) % 7));
    }

    private static Recipe Recipe(Guid id, string name, DateTimeOffset createdAt, RecipeRating rating = RecipeRating.Unknown) => new()
    {
        Id = id,
        Name = name,
        Description = "Safe fixture recipe",
        Ingredients = JsonSerializer.Serialize(new[] { "ingredient" }),
        CreatedAt = createdAt,
        UpdatedAt = createdAt,
        Rating = rating
    };

    private static Recipe SimilarRecipe(string name, DateTimeOffset createdAt, params string[] ingredients)
    {
        var recipe = Recipe(Guid.NewGuid(), name, createdAt);
        recipe.Ingredients = JsonSerializer.Serialize(ingredients);
        return recipe;
    }

    private static string RequiredCursor(JsonElement root) =>
        root.GetProperty("nextCursor").GetString() ?? throw new Xunit.Sdk.XunitException("Expected a continuation cursor.");

    private static Guid[] OrderedIds(JsonElement root)
    {
        var ids = new List<Guid>();
        if (root.GetProperty("topPick") is { ValueKind: not JsonValueKind.Null } topPick)
            ids.Add(topPick.GetProperty("id").GetGuid());
        ids.AddRange(root.GetProperty("results").EnumerateArray().Select(result => result.GetProperty("id").GetGuid()));
        return [.. ids];
    }

    private sealed class FixedClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow => now;
    }
}
