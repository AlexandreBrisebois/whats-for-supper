using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Integration.Fixtures;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>Opt-in, isolated PostgreSQL baseline for Task 1. It does not alter search serving.</summary>
public class HybridRecipeSearchBaselinePostgresTests : IAsyncLifetime
{
    private const string ConnectionVariable = "WFS_TEST_POSTGRES_CONNECTION";
    private readonly string _databaseName = $"wfs_hybrid_baseline_{Guid.NewGuid():N}";
    private NpgsqlConnection _admin = null!;
    private RecipeDbContext _db = null!;

    public async Task InitializeAsync()
    {
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable(ConnectionVariable)) { Pooling = false };
        _admin = new NpgsqlConnection(connection.ConnectionString);
        await _admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {_databaseName}", _admin).ExecuteNonQueryAsync();
        connection.Database = _databaseName;
        _db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(connection.ConnectionString).Options);
        await using var schemaConnection = new NpgsqlConnection(connection.ConnectionString);
        await schemaConnection.OpenAsync();
        await new NpgsqlCommand(ReadDatabaseFile("schema.sql"), schemaConnection).ExecuteNonQueryAsync();
        await SeedAsync();
    }

    public async Task DisposeAsync()
    {
        if (_db is not null) await _db.DisposeAsync();
        if (_admin is not null)
        {
            if (_admin.State == System.Data.ConnectionState.Open)
                await new NpgsqlCommand($"DROP DATABASE IF EXISTS {_databaseName} WITH (FORCE)", _admin).ExecuteNonQueryAsync();
            await _admin.DisposeAsync();
        }
    }

    [PostgresFact]
    public async Task BaselineHarness_RecordsVersionedRelevanceMeasurements()
    {
        using var inventory = new InventoryCaptureService(new StubChatClient(null), NullLogger<InventoryCaptureService>.Instance);
        var grocery = new GroceryRecomputeService(_db, new AisleMapper(), NullLogger<GroceryRecomputeService>.Instance);
        var schedule = new ScheduleService(_db, NullLogger<ScheduleService>.Instance, new Mock<IScheduleEventPublisher>().Object, grocery);
        var service = new RecipeSearchService(_db, schedule, inventory, new FixtureEmbeddingProvider());

        var reports = new List<BaselineReport>();
        foreach (var fixtureCase in HybridRecipeSearchBaselineFixture.Cases)
        {
            var started = System.Diagnostics.Stopwatch.StartNew();
            var response = await service.SearchAsync(new RecipeSearchRequestDto { Query = fixtureCase.Query, Limit = 20 });
            started.Stop();
            var ids = new[] { response.TopPick?.Id }.Concat(response.Results.Select(result => (Guid?)result.Id)).Where(id => id.HasValue).Select(id => id!.Value).ToArray();
            reports.Add(new(
                fixtureCase.Query,
                ids.Take(5).ToArray(),
                ids.Take(20).ToArray(),
                response.ResultPath,
                ids.Length,
                started.ElapsedMilliseconds,
                started.ElapsedMilliseconds,
                response.ResultPath == "fallback-lexical"));
            Assert.Contains(ids.Take(5), id => fixtureCase.RelevantRecipeIds.Contains(id));
        }

        Assert.All(reports, report =>
        {
            Assert.NotEmpty(report.Top5Ids);
            Assert.NotEmpty(report.Top20Ids);
            Assert.False(string.IsNullOrWhiteSpace(report.Path));
            Assert.True(report.PathLatencyMilliseconds >= 0);
            Assert.True(report.TotalLatencyMilliseconds >= 0);
        });
    }

    private async Task SeedAsync()
    {
        foreach (var fixture in HybridRecipeSearchBaselineFixture.Recipes)
        {
            var recipe = new Recipe { Id = fixture.Id, Name = fixture.Name, Ingredients = fixture.IngredientsJson, CuisineType = fixture.Cuisine, MealTypes = fixture.MealTypes, Category = fixture.Category, TotalTime = fixture.TotalTime, RawMetadata = fixture.RawMetadata, IsReady = true, IsDiscoverable = true, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
            _db.Recipes.Add(recipe);
            _db.RecipeSearchDocuments.Add(new RecipeSearchDocument { RecipeId = recipe.Id, DocumentText = $"{recipe.Name}. Ingredients: {string.Join(", ", HybridRecipeSearchBaselineFixture.NormalizeIncludedIngredients(recipe.Ingredients))}.", SearchMetadata = "{}", Embedding = HybridRecipeSearchBaselineFixture.EmbeddingFor(fixture.SemanticGroup), EmbeddingModel = "fixture-v1", IndexStatus = "ready", SourceFingerprint = "fixture", LastIndexedAt = DateTimeOffset.UtcNow });
        }
        await _db.SaveChangesAsync();
    }

    private static string ReadDatabaseFile(string filename)
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "api", "database"))) root = root.Parent;
        return File.ReadAllText(Path.Combine(root?.FullName ?? throw new DirectoryNotFoundException("Repository root not found."), "api", "database", filename));
    }

    private sealed class FixtureEmbeddingProvider : IEmbeddingProvider
    {
        public Task<float[]> GenerateAsync(string text, CancellationToken ct = default)
        {
            // Precomputed fixture-model outputs are attached to versioned cases;
            // this test double has no translation, synonym, or alias logic.
            var fixtureCase = HybridRecipeSearchBaselineFixture.Cases.Single(item => item.Query == text);
            return Task.FromResult(HybridRecipeSearchBaselineFixture.EmbeddingFor(fixtureCase.EmbeddingSampleGroup));
        }
    }

    private sealed record BaselineReport(
        string Query,
        IReadOnlyList<Guid> Top5Ids,
        IReadOnlyList<Guid> Top20Ids,
        string Path,
        int CandidateCount,
        long PathLatencyMilliseconds,
        long TotalLatencyMilliseconds,
        bool SemanticFallback);

    private sealed class PostgresFactAttribute : FactAttribute
    {
        public PostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(ConnectionVariable)))
                Skip = $"Set {ConnectionVariable} to run isolated PostgreSQL baseline verification.";
        }
    }
}
