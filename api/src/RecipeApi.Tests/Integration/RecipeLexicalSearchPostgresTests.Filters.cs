using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class RecipeLexicalSearchPostgresTests
{
    [PostgresTheory]
    [InlineData("lexical")]
    [InlineData("vector")]
    public async Task VegetarianOnly_IsAppliedBeforeCandidateLimit_OnEveryDatabaseRetrievalPath(string path)
    {
        var vegetarian = await SeedFilterRecipe("Vegetarian chili", null, null);
        vegetarian.IsVegetarian = true;
        var nonVegetarian = await SeedFilterRecipe("Beef chili", null, null);
        nonVegetarian.IsVegetarian = false;
        await _db.SaveChangesAsync();

        var filters = new RecipeSearchFiltersDto { VegetarianOnly = true };
        var candidateIds = path == "lexical"
            ? (await new RecipeLexicalSearchRepository(_db).SearchAsync("chili", filters, 1)).Select(candidate => candidate.RecipeId)
            : (await new RecipeSemanticSearchRepository(_db).SearchAsync(UnitVector(0), filters, SearchOptions(1).Semantic, null)).Select(candidate => candidate.RecipeId);

        Assert.Equal([vegetarian.Id], candidateIds);
    }

    // SFD-1 reconciliation coverage, implemented by SFD-5.
    [PostgresTheory]
    [InlineData("lexical", "cuisine")]
    [InlineData("lexical", "meal")]
    [InlineData("lexical", "both")]
    [InlineData("vector", "cuisine")]
    [InlineData("vector", "meal")]
    [InlineData("vector", "both")]
    public async Task Sfd1_HardGroups_UseOrWithinAndAcross_BeforeCandidateLimit(string path, string group)
    {
        var first = await SeedFilterRecipe("fish", "Japanese", ["Supper"]);
        var second = await SeedFilterRecipe("fish", "Italian", ["Breakfast", "Lunch"]);
        var wrongCuisine = await SeedFilterRecipe("fish", "French", ["Supper"]);
        var wrongMeal = await SeedFilterRecipe("fish", "Japanese", ["Dessert"]);
        await SeedFilterRecipe("fish", null, null);
        var filters = new RecipeSearchFiltersDto
        {
            Cuisines = group == "meal" ? null : ["Japanese", "Italian"],
            MealTypes = group == "cuisine" ? null : ["Supper", "Lunch"]
        };
        var expected = new List<Guid> { first.Id, second.Id };
        if (group == "meal") expected.Add(wrongCuisine.Id);
        if (group == "cuisine") expected.Add(wrongMeal.Id);

        async Task<Guid[]> Retrieve(int limit) => path == "lexical"
            ? (await new RecipeLexicalSearchRepository(_db).SearchAsync("fish", filters, limit)).Select(x => x.RecipeId).ToArray()
            : (await new RecipeSemanticSearchRepository(_db).SearchAsync(UnitVector(0), filters, SearchOptions(limit).Semantic, null)).Select(x => x.RecipeId).ToArray();

        Assert.Equal(expected.Order(), (await Retrieve(50)).Order());
        // A post-limit filter can underfill when an ineligible row sorts first.
        Assert.Equal(expected.Order(), (await Retrieve(expected.Count)).Order());
    }

    [PostgresFact]
    public async Task Sfd1_TypedConcept_ChangesSemanticRanking_WithoutExactIngredientFilteringOrQueryMutation()
    {
        var fish = await SeedFilterRecipe("Saumon", "Japanese", ["Supper"]);
        var other = await SeedFilterRecipe("Roast", "Japanese", ["Supper"], UnitVector(1));
        var provider = new ConceptEmbeddingProvider();
        var service = CreateFilterService(provider, candidateLimit: 1);
        var request = new RecipeSearchRequestDto { Query = "dinner", Limit = 10 };
        var plain = await service.SearchAsync(request);
        request.Preferences = new RecipeSearchPreferencesDto { Concepts = [" fish ", "", "fish"] };
        var preferred = await service.SearchAsync(request);

        Assert.Contains(other.Id, ResultIds(plain));
        Assert.Contains(fish.Id, ResultIds(preferred));
        Assert.DoesNotContain(other.Id, ResultIds(preferred));
        Assert.Contains(provider.Texts, text => text.Contains("dinner") && text.Contains("fish"));
        Assert.Equal("dinner", request.Query);
        Assert.Null(request.Filters?.IncludedIngredients);
    }

    [PostgresTheory]
    [InlineData("disabled")]
    [InlineData("unavailable")]
    [InlineData("timeout")]
    [InlineData("error")]
    public async Task Sfd1_ConceptOnly_FallsBackToConceptLexicalText_WithHardFilters(string failure)
    {
        var fish = await SeedFilterRecipe("fish", "Japanese", ["Supper"]);
        await SeedFilterRecipe("fish", "French", ["Dessert"]);
        await SeedFilterRecipe("Roast", "Japanese", ["Supper"]);
        IEmbeddingProvider? provider = failure switch
        {
            "unavailable" => null,
            "timeout" => new DelayedEmbeddingProvider(),
            "error" => new FailingEmbeddingProvider(),
            _ => new ConceptEmbeddingProvider()
        };
        var request = new RecipeSearchRequestDto
        {
            Query = "  ", Preferences = new() { Concepts = [" fish ", ""] },
            Filters = new() { Cuisines = ["Japanese"], MealTypes = ["Supper"] }
        };
        var response = await CreateFilterService(provider, enabled: failure != "disabled").SearchAsync(request);

        Assert.Equal(new[] { fish.Id }, ResultIds(response));
        Assert.NotEqual("browse", response.ResultPath);
        Assert.Equal("  ", request.Query);
    }

    [PostgresFact]
    public async Task Sfd1_ConceptOnly_SemanticSuccessWithNoVectors_StaysEmpty()
    {
        // A lexical match exists, but no compatible vector does: zero-match is not failure.
        await SeedReadyDocumentAsync("fish", "[]");
        var provider = new ConceptEmbeddingProvider();
        var response = await CreateFilterService(provider).SearchAsync(new()
        {
            Preferences = new() { Concepts = ["fish"] }
        });

        Assert.Empty(ResultIds(response));
        Assert.Single(provider.Texts);
    }

    [PostgresFact]
    public async Task Sfd1_ConceptOnly_SemanticRetrieval_RespectsHardGroups()
    {
        var allowed = await SeedFilterRecipe("Saumon", "Japanese", ["Supper"]);
        await SeedFilterRecipe("Truite", "French", ["Supper"]);
        await SeedFilterRecipe("Morue", "Japanese", ["Dessert"]);
        var provider = new ConceptEmbeddingProvider();
        var response = await CreateFilterService(provider).SearchAsync(new()
        {
            Preferences = new() { Concepts = ["fish"] },
            Filters = new() { Cuisines = ["Japanese"], MealTypes = ["Supper"] }
        });

        Assert.Equal(new[] { allowed.Id }, ResultIds(response));
        Assert.Single(provider.Texts);
    }

    [PostgresTheory]
    [InlineData("")]
    [InlineData("fish")]
    public async Task Sfd1_Continuation_RechecksCuisineAndMealEligibility(string query)
    {
        for (var i = 0; i < 5; i++) await SeedFilterRecipe("fish", "Japanese", ["Supper"]);
        var service = CreateFilterService(null);
        var request = new RecipeSearchRequestDto
        {
            Query = query, Limit = 1, Filters = new() { Cuisines = ["Japanese"], MealTypes = ["Supper"] }
        };
        var first = await service.SearchAsync(request);
        Assert.NotNull(first.NextCursor);
        var served = ResultIds(first);
        foreach (var recipe in _db.Recipes.Local.Where(recipe => !served.Contains(recipe.Id)))
        {
            recipe.CuisineType = "French";
            recipe.MealTypes = ["Dessert"];
        }
        await _db.SaveChangesAsync();
        request.ContinuationToken = first.NextCursor;
        Assert.Empty(ResultIds(await service.SearchAsync(request)));
    }

    [PostgresFact]
    public async Task Sfd1_BlankConcepts_KeepBrowse_AndPreferenceChangeInvalidatesContinuation()
    {
        for (var i = 0; i < 5; i++) await SeedFilterRecipe("fish", "Japanese", ["Supper"]);
        var provider = new ConceptEmbeddingProvider();
        var service = CreateFilterService(provider);
        var request = new RecipeSearchRequestDto { Limit = 1, Preferences = new() { Concepts = ["", "  "] } };
        var response = await service.SearchAsync(request);
        Assert.Equal("browse", response.ResultPath);
        Assert.Empty(provider.Texts);
        Assert.NotNull(response.NextCursor);
        request.ContinuationToken = response.NextCursor;
        request.Preferences.Concepts = ["fish"];
        await Assert.ThrowsAsync<RecipeSearchContinuationExpiredException>(() => service.SearchAsync(request));
    }

    [PostgresFact]
    public async Task Sfd5a_SparseQuickBrowse_TraversesEveryEligibleRecipeBeyondNonmatchingPages()
    {
        var expected = new List<Guid>();
        for (var index = 0; index < 30; index++)
        {
            var recipe = await SeedFilterRecipe($"Browse {index}", null, null);
            recipe.CreatedAt = DateTimeOffset.UtcNow.AddMinutes(index);
            recipe.TotalTime = index % 7 == 0 ? "30 min" : "45 min";
            if (index % 7 == 0) expected.Add(recipe.Id);
        }
        await _db.SaveChangesAsync();

        var service = CreateFilterService(null);
        var request = new RecipeSearchRequestDto { Limit = 2, Filters = new() { QuickOnly = true } };
        var returned = new List<Guid>();

        do
        {
            var response = await service.SearchAsync(request);
            returned.AddRange(ResultIds(response));
            request.ContinuationToken = response.NextCursor;
        } while (request.ContinuationToken is not null);

        Assert.Equal(expected.Order(), returned.Order());
        Assert.Equal(returned.Count, returned.Distinct().Count());
    }

    private async Task<Recipe> SeedFilterRecipe(string name, string? cuisine, string[]? meals, float[]? vector = null)
    {
        var recipe = await SeedReadyDocumentAsync(name, "[]", embedding: vector ?? UnitVector(0));
        recipe.CuisineType = cuisine;
        recipe.MealTypes = meals;
        await _db.SaveChangesAsync();
        return recipe;
    }

    private RecipeSearchService CreateFilterService(IEmbeddingProvider? provider, bool enabled = true, int candidateLimit = 50)
    {
        var inventory = new InventoryCaptureService(new StubChatClient(null), NullLogger<InventoryCaptureService>.Instance);
        var grocery = new GroceryRecomputeService(_db, new AisleMapper(), NullLogger<GroceryRecomputeService>.Instance);
        var schedule = new ScheduleService(_db, NullLogger<ScheduleService>.Instance, new Mock<IScheduleEventPublisher>().Object, grocery);
        return new RecipeSearchService(_db, schedule, inventory, provider,
            lexicalRepository: new RecipeLexicalSearchRepository(_db), semanticRepository: new RecipeSemanticSearchRepository(_db),
            rolloutOptions: new() { Semantic = new() { Enabled = enabled, CandidateLimit = candidateLimit, EmbeddingModel = "task4", EmbeddingVersion = "v1" } },
            continuationStore: new RecipeSearchContinuationStore());
    }

    private static Guid[] ResultIds(RecipeSearchResponseDto response) => response.Results
        .Concat(response.TopPick is null ? [] : new[] { response.TopPick }).Select(result => result.Id).ToArray();

    private sealed class ConceptEmbeddingProvider : IEmbeddingProvider
    {
        public List<string> Texts { get; } = [];
        public Task<float[]> GenerateAsync(string text, CancellationToken ct = default)
        {
            Texts.Add(text);
            return Task.FromResult(UnitVector(text.Contains("fish", StringComparison.OrdinalIgnoreCase) ? 0 : 1));
        }
    }

    private sealed class PostgresTheoryAttribute : TheoryAttribute
    {
        public PostgresTheoryAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(ConnectionVariable)))
                Skip = $"Set {ConnectionVariable} to run isolated PostgreSQL filter verification.";
        }
    }
}
