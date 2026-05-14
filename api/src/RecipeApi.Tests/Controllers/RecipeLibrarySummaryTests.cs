using System.Net;
using System.Text.Json;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace RecipeApi.Tests.Controllers;

/// <summary>
/// Unit tests for GET /api/recipes/library-summary.
/// Validates Requirements 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9.
/// </summary>
public class RecipeLibrarySummaryTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client  = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task SeedRecipesAsync(IEnumerable<Recipe> recipes)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.Recipes.AddRange(recipes);
        await db.SaveChangesAsync();
    }

    private Recipe MakeRecipe(
        RecipeRating rating = RecipeRating.Unknown,
        DateTimeOffset? lastCookedDate = null,
        DateTimeOffset? deletedAt = null)
    {
        var now = DateTimeOffset.UtcNow;
        return new Recipe
        {
            Id             = Guid.NewGuid(),
            AddedBy        = _factory.DefaultFamilyMemberId,
            ImageCount     = 0,
            IsReady        = true,
            Rating         = rating,
            LastCookedDate = lastCookedDate,
            DeletedAt      = deletedAt,
            CreatedAt      = now,
            UpdatedAt      = now
        };
    }

    private static async Task<JsonElement> GetSummaryDataAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        // Response is wrapped: { "data": { "total": ..., "neverCooked": ..., "ratings": { ... } } }
        return doc.RootElement.GetProperty("data").Clone();
    }

    // ── GET /api/recipes/library-summary — shape ──────────────────────────────

    [Fact]
    public async Task LibrarySummary_Returns_200_With_Expected_Shape()
    {
        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var data = await GetSummaryDataAsync(response);
        Assert.True(data.TryGetProperty("total",      out _), "missing 'total'");
        Assert.True(data.TryGetProperty("neverCooked", out _), "missing 'neverCooked'");
        Assert.True(data.TryGetProperty("ratings",    out var ratings), "missing 'ratings'");
        Assert.True(ratings.TryGetProperty("love",    out _), "missing 'ratings.love'");
        Assert.True(ratings.TryGetProperty("like",    out _), "missing 'ratings.like'");
        Assert.True(ratings.TryGetProperty("dislike", out _), "missing 'ratings.dislike'");
        Assert.True(ratings.TryGetProperty("unrated", out _), "missing 'ratings.unrated'");
    }

    [Fact]
    public async Task LibrarySummary_EmptyLibrary_Returns_All_Zeros()
    {
        // No recipes seeded — all counts should be zero
        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var data = await GetSummaryDataAsync(response);
        Assert.Equal(0, data.GetProperty("total").GetInt32());
        Assert.Equal(0, data.GetProperty("neverCooked").GetInt32());
        var ratings = data.GetProperty("ratings");
        Assert.Equal(0, ratings.GetProperty("love").GetInt32());
        Assert.Equal(0, ratings.GetProperty("like").GetInt32());
        Assert.Equal(0, ratings.GetProperty("dislike").GetInt32());
        Assert.Equal(0, ratings.GetProperty("unrated").GetInt32());
    }

    // ── Requirement 7.3: total excludes soft-deleted recipes ─────────────────

    [Fact]
    public async Task Total_ExcludesSoftDeletedRecipes()
    {
        // Arrange: 3 active + 2 soft-deleted
        await SeedRecipesAsync([
            MakeRecipe(),
            MakeRecipe(),
            MakeRecipe(),
            MakeRecipe(deletedAt: DateTimeOffset.UtcNow.AddDays(-1)),
            MakeRecipe(deletedAt: DateTimeOffset.UtcNow.AddDays(-2)),
        ]);

        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var data = await GetSummaryDataAsync(response);
        Assert.Equal(3, data.GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task Total_IsZero_WhenAllRecipesAreSoftDeleted()
    {
        await SeedRecipesAsync([
            MakeRecipe(deletedAt: DateTimeOffset.UtcNow),
            MakeRecipe(deletedAt: DateTimeOffset.UtcNow),
        ]);

        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var data = await GetSummaryDataAsync(response);
        Assert.Equal(0, data.GetProperty("total").GetInt32());
    }

    // ── Requirement 7.4: neverCooked count ───────────────────────────────────

    [Fact]
    public async Task NeverCooked_CountsRecipesWithNullLastCookedDate()
    {
        var now = DateTimeOffset.UtcNow;
        await SeedRecipesAsync([
            MakeRecipe(lastCookedDate: null),          // never cooked
            MakeRecipe(lastCookedDate: null),          // never cooked
            MakeRecipe(lastCookedDate: now.AddDays(-5)), // cooked
        ]);

        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var data = await GetSummaryDataAsync(response);
        Assert.Equal(2, data.GetProperty("neverCooked").GetInt32());
    }

    [Fact]
    public async Task NeverCooked_ExcludesSoftDeletedRecipes()
    {
        // Arrange: 1 active never-cooked + 1 soft-deleted never-cooked
        await SeedRecipesAsync([
            MakeRecipe(lastCookedDate: null),
            MakeRecipe(lastCookedDate: null, deletedAt: DateTimeOffset.UtcNow),
        ]);

        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var data = await GetSummaryDataAsync(response);
        Assert.Equal(1, data.GetProperty("neverCooked").GetInt32());
    }

    // ── Requirement 7.5: ratings.love (rating == 3) ───────────────────────────

    [Fact]
    public async Task Ratings_Love_CountsRecipesWithRatingLove()
    {
        await SeedRecipesAsync([
            MakeRecipe(rating: RecipeRating.Love),
            MakeRecipe(rating: RecipeRating.Love),
            MakeRecipe(rating: RecipeRating.Like),
        ]);

        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var ratings = (await GetSummaryDataAsync(response)).GetProperty("ratings");
        Assert.Equal(2, ratings.GetProperty("love").GetInt32());
    }

    [Fact]
    public async Task Ratings_Love_ExcludesSoftDeletedRecipes()
    {
        await SeedRecipesAsync([
            MakeRecipe(rating: RecipeRating.Love),
            MakeRecipe(rating: RecipeRating.Love, deletedAt: DateTimeOffset.UtcNow),
        ]);

        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var ratings = (await GetSummaryDataAsync(response)).GetProperty("ratings");
        Assert.Equal(1, ratings.GetProperty("love").GetInt32());
    }

    // ── Requirement 7.6: ratings.like (rating == 2) ───────────────────────────

    [Fact]
    public async Task Ratings_Like_CountsRecipesWithRatingLike()
    {
        await SeedRecipesAsync([
            MakeRecipe(rating: RecipeRating.Like),
            MakeRecipe(rating: RecipeRating.Like),
            MakeRecipe(rating: RecipeRating.Like),
            MakeRecipe(rating: RecipeRating.Love),
        ]);

        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var ratings = (await GetSummaryDataAsync(response)).GetProperty("ratings");
        Assert.Equal(3, ratings.GetProperty("like").GetInt32());
    }

    [Fact]
    public async Task Ratings_Like_ExcludesSoftDeletedRecipes()
    {
        await SeedRecipesAsync([
            MakeRecipe(rating: RecipeRating.Like),
            MakeRecipe(rating: RecipeRating.Like, deletedAt: DateTimeOffset.UtcNow),
        ]);

        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var ratings = (await GetSummaryDataAsync(response)).GetProperty("ratings");
        Assert.Equal(1, ratings.GetProperty("like").GetInt32());
    }

    // ── Requirement 7.7: ratings.dislike (rating == 1) ────────────────────────

    [Fact]
    public async Task Ratings_Dislike_CountsRecipesWithRatingDislike()
    {
        await SeedRecipesAsync([
            MakeRecipe(rating: RecipeRating.Dislike),
            MakeRecipe(rating: RecipeRating.Love),
        ]);

        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var ratings = (await GetSummaryDataAsync(response)).GetProperty("ratings");
        Assert.Equal(1, ratings.GetProperty("dislike").GetInt32());
    }

    [Fact]
    public async Task Ratings_Dislike_ExcludesSoftDeletedRecipes()
    {
        await SeedRecipesAsync([
            MakeRecipe(rating: RecipeRating.Dislike),
            MakeRecipe(rating: RecipeRating.Dislike, deletedAt: DateTimeOffset.UtcNow),
        ]);

        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var ratings = (await GetSummaryDataAsync(response)).GetProperty("ratings");
        Assert.Equal(1, ratings.GetProperty("dislike").GetInt32());
    }

    // ── Requirement 7.8: ratings.unrated (rating == 0) ────────────────────────

    [Fact]
    public async Task Ratings_Unrated_CountsRecipesWithRatingUnknown()
    {
        await SeedRecipesAsync([
            MakeRecipe(rating: RecipeRating.Unknown),
            MakeRecipe(rating: RecipeRating.Unknown),
            MakeRecipe(rating: RecipeRating.Love),
        ]);

        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var ratings = (await GetSummaryDataAsync(response)).GetProperty("ratings");
        Assert.Equal(2, ratings.GetProperty("unrated").GetInt32());
    }

    [Fact]
    public async Task Ratings_Unrated_ExcludesSoftDeletedRecipes()
    {
        await SeedRecipesAsync([
            MakeRecipe(rating: RecipeRating.Unknown),
            MakeRecipe(rating: RecipeRating.Unknown, deletedAt: DateTimeOffset.UtcNow),
        ]);

        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var ratings = (await GetSummaryDataAsync(response)).GetProperty("ratings");
        Assert.Equal(1, ratings.GetProperty("unrated").GetInt32());
    }

    // ── Requirement 7.9: all counts exclude soft-deleted (combined scenario) ──

    [Fact]
    public async Task AllCounts_ExcludeSoftDeletedRecipes_CombinedScenario()
    {
        // Arrange: a mix of active and soft-deleted recipes across all rating/cooked states
        var now = DateTimeOffset.UtcNow;
        await SeedRecipesAsync([
            // Active recipes
            MakeRecipe(rating: RecipeRating.Love,    lastCookedDate: null),
            MakeRecipe(rating: RecipeRating.Like,    lastCookedDate: now.AddDays(-3)),
            MakeRecipe(rating: RecipeRating.Dislike, lastCookedDate: null),
            MakeRecipe(rating: RecipeRating.Unknown, lastCookedDate: null),

            // Soft-deleted — must not appear in any count
            MakeRecipe(rating: RecipeRating.Love,    lastCookedDate: null,           deletedAt: now),
            MakeRecipe(rating: RecipeRating.Like,    lastCookedDate: now.AddDays(-1), deletedAt: now),
            MakeRecipe(rating: RecipeRating.Dislike, lastCookedDate: null,           deletedAt: now),
            MakeRecipe(rating: RecipeRating.Unknown, lastCookedDate: null,           deletedAt: now),
        ]);

        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var data    = await GetSummaryDataAsync(response);
        var ratings = data.GetProperty("ratings");

        Assert.Equal(4, data.GetProperty("total").GetInt32());
        Assert.Equal(3, data.GetProperty("neverCooked").GetInt32()); // love + dislike + unrated (active)
        Assert.Equal(1, ratings.GetProperty("love").GetInt32());
        Assert.Equal(1, ratings.GetProperty("like").GetInt32());
        Assert.Equal(1, ratings.GetProperty("dislike").GetInt32());
        Assert.Equal(1, ratings.GetProperty("unrated").GetInt32());
    }

    // ── Requirement 7.9: rating counts sum to total ───────────────────────────

    [Fact]
    public async Task RatingCounts_SumToTotal()
    {
        // Arrange: one recipe of each rating type, all active
        await SeedRecipesAsync([
            MakeRecipe(rating: RecipeRating.Love),
            MakeRecipe(rating: RecipeRating.Like),
            MakeRecipe(rating: RecipeRating.Dislike),
            MakeRecipe(rating: RecipeRating.Unknown),
        ]);

        var response = await _client.GetAsync("/api/recipes/library-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var data    = await GetSummaryDataAsync(response);
        var ratings = data.GetProperty("ratings");

        var total   = data.GetProperty("total").GetInt32();
        var ratingSum = ratings.GetProperty("love").GetInt32()
                      + ratings.GetProperty("like").GetInt32()
                      + ratings.GetProperty("dislike").GetInt32()
                      + ratings.GetProperty("unrated").GetInt32();

        Assert.Equal(total, ratingSum);
    }
}
