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
    public async Task FindSimilar_UnavailableSemanticRetrievalFallsBackWithStableContinuations()
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
        // All four candidates have equal structured scores. Exercise the meaningful
        // creation/name tie-breakers, with the newest pair deliberately inserted after index 0.
        var createdAt = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
        aligned[0].CreatedAt = createdAt.AddDays(1);
        aligned[1].CreatedAt = createdAt.AddDays(2);
        aligned[2].CreatedAt = createdAt.AddDays(2);
        aligned[3].CreatedAt = createdAt;
        var expected = new[] { aligned[1].Id, aligned[2].Id, aligned[0].Id, aligned[3].Id };
        await _db.SaveChangesAsync();

        var service = CreateSimilarService(useSemanticRepository: false);
        var request = new RecipeSearchRequestDto { SimilarToRecipeId = source.Id, Limit = 1 };
        var first = await service.SearchAsync(request);
        Assert.Equal("similar", first.SearchMode);
        Assert.Equal(expected[0], first.TopPick?.Id);
        Assert.Equal(expected[1], Assert.Single(first.Results).Id);
        Assert.NotNull(first.NextCursor);
        var initialScore = first.TopPick!.Score;
        Assert.All(first.Results.Append(first.TopPick!), result =>
        {
            Assert.Equal(initialScore, result.Score);
            Assert.Contains(result.Reasons, reason => reason.Source == "lexical-match");
        });

        // A fresh search would now rank the last candidate first. Continuations
        // must keep the original snapshot order instead of reranking the tail.
        aligned[3].CreatedAt = createdAt.AddDays(3);
        await _db.SaveChangesAsync();
        // ResultIds is a set-oriented helper that appends Top Pick after Results;
        // traverse the serving order explicitly here.
        var served = new[] { first.TopPick!.Id }.Concat(first.Results.Select(result => result.Id)).ToList();
        var continuationPages = 0;
        while (first.NextCursor is not null)
        {
            Assert.True(++continuationPages <= 2, "Expected exactly two remaining one-result pages.");
            request.ContinuationToken = first.NextCursor;
            first = await service.SearchAsync(request);
            Assert.Null(first.TopPick);
            Assert.Single(first.Results);
            Assert.Equal(initialScore, first.Results[0].Score);
            Assert.Contains(first.Results[0].Reasons, reason => reason.Source == "lexical-match");
            served.AddRange(ResultIds(first));
        }

        Assert.Equal(2, continuationPages);
        Assert.Equal(expected, served);
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
        var grocery = new GroceryRecomputeService(_db, new AisleMapper(), NullLogger<GroceryRecomputeService>.Instance, new SystemClock(), new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager()), RecipeApi.Tests.Infrastructure.TestGroceryCoordinator.Create(_db));
        var schedule = new ScheduleService(_db, NullLogger<ScheduleService>.Instance, new Mock<IScheduleEventPublisher>().Object, grocery, new SystemClock(), new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager()), RecipeApi.Tests.Infrastructure.TestHistoricalInterest.Create(_db, new SystemClock(), new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager())), RecipeApi.Tests.Infrastructure.TestGroceryCoordinator.Create(_db));
        return new RecipeSearchService(new SystemClock(), RecipeApi.Tests.Infrastructure.TestHistoricalInterest.Create(_db, new SystemClock(), new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager())), _db, schedule, lexicalRepository: new RecipeLexicalSearchRepository(_db, new RecipeApi.Services.SystemClock()), semanticRepository: semanticRepository ?? (useSemanticRepository ? new RecipeSemanticSearchRepository(_db, new RecipeApi.Services.SystemClock()) : null), rolloutOptions: SearchOptions(candidateLimit), continuationStore: new RecipeSearchContinuationStore(new RecipeApi.Services.SystemClock()));
    }

    private sealed class FailingSemanticRepository(RecipeDbContext db) : RecipeSemanticSearchRepository(db, new SystemClock())
    {
        public override Task<IReadOnlyList<RecipeSemanticCandidate>> SearchAsync(
            float[] queryEmbedding,
            RecipeSearchFiltersDto filters,
            RecipeSemanticSearchOptions options,
            Guid? excludedRecipeId,
            CancellationToken ct = default) => throw new InvalidOperationException("semantic retrieval unavailable");
    }
}
