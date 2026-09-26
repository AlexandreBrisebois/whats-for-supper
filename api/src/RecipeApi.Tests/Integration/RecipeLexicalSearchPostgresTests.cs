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

/// <summary>Isolated PostgreSQL coverage for Task 3 database lexical retrieval.</summary>
public partial class RecipeLexicalSearchPostgresTests : IAsyncLifetime
{
    private const string ConnectionVariable = "WFS_TEST_POSTGRES_CONNECTION";
    private readonly string _databaseName = $"wfs_lexical_{Guid.NewGuid():N}";
    private NpgsqlConnection _admin = null!;
    private NpgsqlConnectionStringBuilder _connection = null!;
    private RecipeDbContext _db = null!;

    public async Task InitializeAsync()
    {
        _connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable(ConnectionVariable)) { Pooling = false };
        _admin = new NpgsqlConnection(_connection.ConnectionString);
        await _admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {_databaseName}", _admin).ExecuteNonQueryAsync();
        _connection.Database = _databaseName;
        _db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(_connection.ConnectionString).Options);

        await using var schemaConnection = new NpgsqlConnection(_connection.ConnectionString);
        await schemaConnection.OpenAsync();
        await new NpgsqlCommand(ReadDatabaseFile("schema.sql"), schemaConnection).ExecuteNonQueryAsync();
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
    public async Task SearchAsync_ReturnsBoundedCanonicalMatches_WithEligibilityAndHardFilters()
    {
        var chicken = await SeedReadyDocumentAsync("Poulet rôti au citron", "[\"poulet\",\"citron\"]");
        var reorderedPhrase = await SeedReadyDocumentAsync("Lemon chicken skillet", "[\"chicken\",\"lemon\"]");
        await SeedReadyDocumentAsync("Hidden chicken", "[\"chicken\"]", deleted: true);
        await SeedReadyDocumentAsync("Not ready chicken", "[\"chicken\"]", ready: false);
        for (var index = 0; index < 60; index++)
            await SeedReadyDocumentAsync($"Chicken candidate {index}", "[\"chicken\"]");

        var repository = new RecipeLexicalSearchRepository(_db);
        var accented = await repository.SearchAsync("rôti", new RecipeSearchFiltersDto(), 50);
        var bounded = await repository.SearchAsync("chicken", new RecipeSearchFiltersDto(), 5);
        var partial = await repository.SearchAsync("chic", new RecipeSearchFiltersDto(), 50);
        var shortQuery = await repository.SearchAsync("ch", new RecipeSearchFiltersDto(), 50);
        var phrase = await repository.SearchAsync("chicken lemon", new RecipeSearchFiltersDto(), 50);

        Assert.Contains(accented, candidate => candidate.RecipeId == chicken.Id);
        Assert.Equal(5, bounded.Count);
        Assert.All(bounded, candidate => Assert.True(candidate.Score > 0));
        Assert.NotEmpty(partial);
        Assert.NotEmpty(shortQuery);
        Assert.Contains(phrase, candidate => candidate.RecipeId == reorderedPhrase.Id);
    }

    [PostgresFact]
    public async Task SearchAsync_UsesTrigramIndex_AtRepresentativeScale()
    {
        await using var connection = new NpgsqlConnection(_connection.ConnectionString);
        await connection.OpenAsync();
        await new NpgsqlCommand("""
            INSERT INTO recipes (id, rating, is_discoverable, is_vegetarian, is_ready, name)
            SELECT gen_random_uuid(), 0, TRUE, FALSE, TRUE, 'Candidate ' || series
            FROM generate_series(1, 100000) AS series;
            INSERT INTO recipe_search_documents (recipe_id, document_text, embedding_model, index_status)
            SELECT id,
                   CASE WHEN name = 'Candidate 5000' THEN 'Chicken lemon skillet dinner' ELSE 'Unrelated dinner candidate ' || name END,
                   'test',
                   'ready'
            FROM recipes;
            ANALYZE recipes;
            ANALYZE recipe_search_documents;
            """, connection).ExecuteNonQueryAsync();

        await using var command = new NpgsqlCommand("""
            EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
            SELECT d.recipe_id, word_similarity(@query, d.document_text) AS score
            FROM recipe_search_documents d
            INNER JOIN recipes r ON r.id = d.recipe_id
            WHERE r.deleted_at IS NULL
              AND r.is_ready = TRUE
              AND d.index_status = 'ready'
              AND d.document_text <> ''
              AND d.document_text ILIKE @pattern
            ORDER BY word_similarity(@query, d.document_text) DESC
            LIMIT 50;
            """, connection);
        command.Parameters.AddWithValue("query", "chicken lemon skillet");
        command.Parameters.AddWithValue("pattern", "%chicken lemon skillet%");
        var lines = new List<string>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) lines.Add(reader.GetString(0));
        var plan = string.Join(Environment.NewLine, lines);

        Assert.Contains("idx_recipe_search_documents_document_trgm", plan, StringComparison.Ordinal);
    }

    [PostgresFact]
    public async Task SearchAsync_ReturnsDatabaseLexicalResults_WhenEmbeddingProviderFails()
    {
        var recipe = await SeedReadyDocumentAsync("Chicken soup", "[\"chicken\"]");
        var inventory = new InventoryCaptureService(new StubChatClient(null), NullLogger<InventoryCaptureService>.Instance);
        var grocery = new GroceryRecomputeService(_db, new AisleMapper(), NullLogger<GroceryRecomputeService>.Instance);
        var schedule = new ScheduleService(_db, NullLogger<ScheduleService>.Instance, new Mock<IScheduleEventPublisher>().Object, grocery);
        var service = new RecipeSearchService(
            _db,
            schedule,
            inventory,
            new FailingEmbeddingProvider(),
            lexicalRepository: new RecipeLexicalSearchRepository(_db),
            semanticRepository: new RecipeSemanticSearchRepository(_db),
            rolloutOptions: SearchOptions());

        var response = await service.SearchAsync(new RecipeSearchRequestDto { Query = "chicken" });

        Assert.Equal("fallback-lexical", response.ResultPath);
        Assert.Contains(response.Results.Append(response.TopPick).Where(result => result is not null), result => result!.Id == recipe.Id);
    }

    [PostgresFact]
    public async Task SearchAsync_UsesOnlyCurrentCompatibleVectors_AndBoundsSemanticRetrieval()
    {
        var relevantFrench = await SeedReadyDocumentAsync("Boeuf braisé", "[\"boeuf\"]", embedding: UnitVector(0), embeddingModel: "task4", embeddingVersion: "v1");
        var relevantEnglish = await SeedReadyDocumentAsync("Beef stew", "[\"beef\"]", embedding: UnitVector(0), embeddingModel: "task4", embeddingVersion: "v1");
        await SeedReadyDocumentAsync("Stale beef", "[\"beef\"]", embedding: UnitVector(0), embeddingModel: "task4", embeddingVersion: "v1", embeddingFingerprint: "stale");
        await SeedReadyDocumentAsync("Wrong model beef", "[\"beef\"]", embedding: UnitVector(0), embeddingModel: "other", embeddingVersion: "v1");
        await SeedReadyDocumentAsync("Pending beef", "[\"beef\"]", embedding: UnitVector(0), embeddingModel: "task4", embeddingVersion: "v1", embeddingStatus: "pending");

        var semantic = new RecipeSemanticSearchRepository(_db);
        var semanticCandidates = await semantic.SearchAsync(UnitVector(0), new RecipeSearchFiltersDto(), SearchOptions(2).Semantic, null);
        var service = CreateService(new FixedEmbeddingProvider(UnitVector(0)), candidateLimit: 2);
        var response = await service.SearchAsync(new RecipeSearchRequestDto { Query = "beef", Limit = 10 });
        var ids = response.Results.Append(response.TopPick).Where(result => result is not null).Select(result => result!.Id).ToArray();

        Assert.Equal("hybrid", response.ResultPath);
        Assert.Equal(2, semanticCandidates.Count);
        Assert.All(semanticCandidates, candidate => Assert.Contains(candidate.RecipeId, new[] { relevantFrench.Id, relevantEnglish.Id }));
        Assert.Contains(relevantFrench.Id, ids);
        Assert.Contains(relevantEnglish.Id, ids);
    }

    [PostgresFact]
    public async Task SearchAsync_SemanticTimeoutOrProviderFailure_ReturnsLexicalResults_AndCallerCancellationPropagates()
    {
        var recipe = await SeedReadyDocumentAsync("Chicken soup", "[\"chicken\"]");
        var timeout = CreateService(new DelayedEmbeddingProvider());
        var started = System.Diagnostics.Stopwatch.StartNew();
        var fallback = await timeout.SearchAsync(new RecipeSearchRequestDto { Query = "chicken" });
        started.Stop();

        Assert.Equal("fallback-lexical", fallback.ResultPath);
        Assert.Contains(fallback.Results.Append(fallback.TopPick).Where(result => result is not null), result => result!.Id == recipe.Id);
        Assert.InRange(started.ElapsedMilliseconds, 250, 1500);

        using var cancelled = new CancellationTokenSource();
        cancelled.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => timeout.SearchAsync(new RecipeSearchRequestDto { Query = "chicken" }, cancelled.Token));
    }

    private RecipeSearchService CreateService(IEmbeddingProvider provider, int candidateLimit = 50)
    {
        using var inventory = new InventoryCaptureService(new StubChatClient(null), NullLogger<InventoryCaptureService>.Instance);
        var grocery = new GroceryRecomputeService(_db, new AisleMapper(), NullLogger<GroceryRecomputeService>.Instance);
        var schedule = new ScheduleService(_db, NullLogger<ScheduleService>.Instance, new Mock<IScheduleEventPublisher>().Object, grocery);
        return new RecipeSearchService(_db, schedule, inventory, provider, lexicalRepository: new RecipeLexicalSearchRepository(_db), semanticRepository: new RecipeSemanticSearchRepository(_db), rolloutOptions: SearchOptions(candidateLimit));
    }

    private static RecipeSearchRolloutOptions SearchOptions(int candidateLimit = 50) => new()
    {
        Semantic = new RecipeSemanticSearchOptions { CandidateLimit = candidateLimit, EmbeddingModel = "task4", EmbeddingVersion = "v1" }
    };

    private async Task<Recipe> SeedReadyDocumentAsync(string name, string ingredients, bool ready = true, bool deleted = false, float[]? embedding = null, string embeddingModel = "task4", string? embeddingVersion = "v1", string? embeddingFingerprint = null, string embeddingStatus = "ready")
    {
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = name,
            Ingredients = ingredients,
            IsReady = ready,
            IsDiscoverable = true,
            DeletedAt = deleted ? DateTimeOffset.UtcNow : null,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        var content = new RecipeSearchDocumentBuilder().Build(recipe);
        _db.Recipes.Add(recipe);
        _db.RecipeSearchDocuments.Add(new RecipeSearchDocument
        {
            RecipeId = recipe.Id,
            DocumentText = content.DocumentText,
            SearchMetadata = content.SearchMetadata,
            IndexStatus = "ready",
            EmbeddingStatus = embeddingStatus,
            Embedding = embedding,
            EmbeddingModel = embeddingModel,
            EmbeddingVersion = embeddingVersion,
            SourceFingerprint = "current",
            EmbeddingFingerprint = embeddingFingerprint ?? "current",
            SchemaVersion = RecipeSearchDocumentBuilder.CurrentSchemaVersion,
            LastIndexedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();
        return recipe;
    }

    private static string ReadDatabaseFile(string filename)
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "api", "database"))) root = root.Parent;
        return File.ReadAllText(Path.Combine(root?.FullName ?? throw new DirectoryNotFoundException("Repository root not found."), "api", "database", filename));
    }

    private sealed class FailingEmbeddingProvider : IEmbeddingProvider
    {
        public Task<float[]> GenerateAsync(string text, CancellationToken ct = default) => throw new InvalidOperationException("provider unavailable");
    }

    private sealed class FixedEmbeddingProvider(float[] embedding) : IEmbeddingProvider
    {
        public Task<float[]> GenerateAsync(string text, CancellationToken ct = default) => Task.FromResult(embedding);
    }

    private sealed class DelayedEmbeddingProvider : IEmbeddingProvider
    {
        public async Task<float[]> GenerateAsync(string text, CancellationToken ct = default)
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, ct);
            return [];
        }
    }

    private static float[] UnitVector(int dimension)
    {
        var vector = new float[1536];
        vector[dimension] = 1;
        return vector;
    }

    private sealed class PostgresFactAttribute : FactAttribute
    {
        public PostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(ConnectionVariable)))
                Skip = $"Set {ConnectionVariable} to run isolated PostgreSQL lexical verification.";
        }
    }
}
