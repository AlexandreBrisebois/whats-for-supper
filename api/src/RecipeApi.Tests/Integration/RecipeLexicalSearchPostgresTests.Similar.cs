using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class RecipeLexicalSearchPostgresTests
{
    [PostgresFact]
    public async Task FindSimilar_AppliesSemanticFiltersAndSourceExclusionBeforeCandidateLimit()
    {
        var source = await SeedReadyDocumentAsync("Source chili", "[\"beans\"]", embedding: UnitVector(0));
        var excludedByFilter = await SeedReadyDocumentAsync("Closest chili", "[\"beef\"]", embedding: UnitVector(0));
        excludedByFilter.CuisineType = "French";
        var allowed = await SeedReadyDocumentAsync("Japanese chili", "[\"beans\"]", embedding: UnitVector(1));
        allowed.CuisineType = "Japanese";
        await _db.SaveChangesAsync();

        var response = await CreateSimilarService(candidateLimit: 1).SearchAsync(new()
        {
            SimilarToRecipeId = source.Id,
            Filters = new RecipeSearchFiltersDto { Cuisines = ["Japanese"] }
        });

        Assert.Equal([allowed.Id], ResultIds(response));
        Assert.DoesNotContain(source.Id, ResultIds(response));
    }

    [PostgresFact]
    public async Task FindSimilar_LexicalFallbackAppliesFiltersAndSourceExclusionBeforeCandidateLimit()
    {
        var source = await SeedReadyDocumentAsync("Chili Supper", "[\"beans\"]");
        for (var index = 0; index < 51; index++)
        {
            var excludedByFilter = await SeedReadyDocumentAsync($"Chili Supper {index}", "[\"beef\"]");
            excludedByFilter.CuisineType = "French";
        }
        var allowed = await SeedReadyDocumentAsync("Chili", "[\"beans\"]");
        allowed.CuisineType = "Japanese";
        await _db.SaveChangesAsync();

        var response = await CreateSimilarService(useSemanticRepository: false).SearchAsync(new()
        {
            SimilarToRecipeId = source.Id,
            Filters = new RecipeSearchFiltersDto { Cuisines = ["Japanese"] }
        });

        Assert.Equal([allowed.Id], ResultIds(response));
        Assert.DoesNotContain(source.Id, ResultIds(response));
    }

    [PostgresFact]
    public async Task FindSimilar_RanksSemanticCandidatesByStructuredScore()
    {
        var source = await SeedReadyDocumentAsync("Tomato pasta", "[\"tomato\", \"basil\", \"pasta\"]", embedding: UnitVector(0));
        source.CuisineType = "Italian";
        source.Category = "Dinner";
        source.MealTypes = ["Supper"];
        source.IsVegetarian = true;
        source.TotalTime = "30 min";
        var weak = await SeedReadyDocumentAsync("Closest unrelated", "[\"beef\"]", embedding: UnitVector(0));
        var aligned = await SeedReadyDocumentAsync("Garden pasta", "[\"pasta\", \"basil\", \"tomato\"]", embedding: UnitVector(1));
        aligned.CuisineType = "Italian";
        aligned.Category = "Dinner";
        aligned.MealTypes = ["Supper"];
        aligned.IsVegetarian = true;
        aligned.TotalTime = "30 min";
        await _db.SaveChangesAsync();

        var response = await CreateSimilarService(candidateLimit: 2).SearchAsync(new() { SimilarToRecipeId = source.Id });

        Assert.Equal(aligned.Id, response.TopPick?.Id);
        Assert.Contains(weak.Id, ResultIds(response));
    }

    [PostgresFact]
    public async Task FindSimilar_UnavailableSemanticRetrievalFallsBackWithZeroSemanticContributionAndStableContinuations()
    {
        var source = await SeedReadyDocumentAsync("Tomato pasta", "[\"tomato\", \"basil\", \"pasta\"]");
        source.CuisineType = "Italian";
        var aligned = new List<Recipe>();
        for (var index = 0; index < 4; index++)
        {
            var recipe = await SeedReadyDocumentAsync($"Tomato pasta {index}", "[\"pasta\", \"basil\", \"tomato\"]");
            recipe.CuisineType = "Italian";
            aligned.Add(recipe);
        }
        await _db.SaveChangesAsync();

        var service = CreateSimilarService(useSemanticRepository: false);
        var request = new RecipeSearchRequestDto { SimilarToRecipeId = source.Id, Limit = 1 };
        var first = await service.SearchAsync(request);
        var served = ResultIds(first).ToList();
        while (first.NextCursor is not null)
        {
            request.ContinuationToken = first.NextCursor;
            first = await service.SearchAsync(request);
            served.AddRange(ResultIds(first));
        }

        Assert.Equal(aligned[0].Id, served[0]);
        Assert.Equal(served.Count, served.Distinct().Count());
        Assert.DoesNotContain(source.Id, served);
    }

    [PostgresFact]
    public async Task FindSimilar_SemanticFailureFallsBackToBoundedLexicalRetrieval()
    {
        var source = await SeedReadyDocumentAsync("Tomato pasta", "[\"tomato\", \"basil\"]", embedding: UnitVector(0));
        var aligned = await SeedReadyDocumentAsync("Tomato basil pasta", "[\"basil\", \"tomato\"]");

        var response = await CreateSimilarService(semanticRepository: new FailingSemanticRepository(_db)).SearchAsync(new()
        {
            SimilarToRecipeId = source.Id
        });

        Assert.Contains(aligned.Id, ResultIds(response));
        Assert.DoesNotContain(source.Id, ResultIds(response));
    }

    [PostgresFact]
    public async Task FindSimilar_PropagatesCallerCancellation()
    {
        var source = await SeedReadyDocumentAsync("Tomato pasta", "[\"tomato\"]");
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            CreateSimilarService(useSemanticRepository: false).SearchAsync(new() { SimilarToRecipeId = source.Id }, cancellation.Token));
    }

    private RecipeSearchService CreateSimilarService(
        int candidateLimit = 50,
        bool useSemanticRepository = true,
        RecipeSemanticSearchRepository? semanticRepository = null)
    {
        var inventory = new InventoryCaptureService(new StubChatClient(null), NullLogger<InventoryCaptureService>.Instance);
        var grocery = new GroceryRecomputeService(_db, new AisleMapper(), NullLogger<GroceryRecomputeService>.Instance);
        var schedule = new ScheduleService(_db, NullLogger<ScheduleService>.Instance, new Mock<IScheduleEventPublisher>().Object, grocery);
        return new RecipeSearchService(_db, schedule, inventory,
            lexicalRepository: new RecipeLexicalSearchRepository(_db), semanticRepository: semanticRepository ?? (useSemanticRepository ? new RecipeSemanticSearchRepository(_db) : null),
            rolloutOptions: SearchOptions(candidateLimit), continuationStore: new RecipeSearchContinuationStore());
    }

    private sealed class FailingSemanticRepository(RecipeDbContext db) : RecipeSemanticSearchRepository(db)
    {
        public override Task<IReadOnlyList<RecipeSemanticCandidate>> SearchAsync(
            float[] queryEmbedding,
            RecipeSearchFiltersDto filters,
            RecipeSemanticSearchOptions options,
            Guid? excludedRecipeId,
            CancellationToken ct = default) => throw new InvalidOperationException("semantic retrieval unavailable");
    }
}
