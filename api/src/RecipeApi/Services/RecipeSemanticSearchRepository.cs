using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Dto;

namespace RecipeApi.Services;

/// <summary>Bounded PostgreSQL nearest-vector retrieval over current canonical documents.</summary>
public sealed class RecipeSemanticSearchRepository(RecipeDbContext db)
{
    public async Task<IReadOnlyList<RecipeSemanticCandidate>> SearchAsync(
        float[] queryEmbedding,
        RecipeSearchFiltersDto filters,
        RecipeSemanticSearchOptions options,
        Guid? excludedRecipeId,
        CancellationToken ct = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(options.CandidateLimit);
        if (queryEmbedding.Length != options.EmbeddingDimensions)
            throw new ArgumentException("The query embedding dimensions are incompatible with the configured semantic index.", nameof(queryEmbedding));

        var parameters = new List<NpgsqlParameter>
        {
            new("queryEmbedding", System.Text.Json.JsonSerializer.Serialize(queryEmbedding)),
            new("embeddingModel", options.EmbeddingModel),
            new("embeddingVersion", (object?)options.EmbeddingVersion ?? DBNull.Value),
            new("embeddingDimensions", options.EmbeddingDimensions),
            new("candidateLimit", options.CandidateLimit),
            new("excludedRecipeId", (object?)excludedRecipeId ?? DBNull.Value)
        };
        var hardFilters = RecipeSearchPredicate.BuildSql(filters, parameters);

        var sql = $"""
            SELECT d.recipe_id AS "RecipeId",
                   1 - (d.embedding <=> CAST(@queryEmbedding AS vector)) AS "Score"
            FROM recipe_search_documents d
            INNER JOIN recipes r ON r.id = d.recipe_id
            WHERE r.deleted_at IS NULL
              AND r.is_ready = TRUE
              AND d.index_status = 'ready'
              AND d.embedding_status = 'ready'
              AND d.embedding IS NOT NULL
              AND d.embedding_fingerprint = d.source_fingerprint
              AND d.embedding_model = @embeddingModel
              AND d.embedding_version IS NOT DISTINCT FROM @embeddingVersion
              AND vector_dims(d.embedding) = @embeddingDimensions
              AND (@excludedRecipeId::uuid IS NULL OR d.recipe_id <> @excludedRecipeId)
              {hardFilters}
            ORDER BY d.embedding <=> CAST(@queryEmbedding AS vector), d.recipe_id
            LIMIT @candidateLimit
            """;

        return await db.Database.SqlQueryRaw<RecipeSemanticCandidate>(sql, parameters.Cast<object>().ToArray())
            .ToListAsync(ct);
    }
}

public sealed class RecipeSemanticCandidate
{
    public Guid RecipeId { get; init; }
    public double Score { get; init; }
}

public sealed class RecipeSemanticSearchOptions
{
    public bool Enabled { get; init; } = true;
    public int CandidateLimit { get; init; } = 50;
    public int EmbeddingDimensions { get; init; } = 1536;
    public string EmbeddingModel { get; init; } = "gemini-embedding-2";
    public string? EmbeddingVersion { get; init; }
    public double LexicalWeight { get; init; } = 0.4;
    public double SemanticWeight { get; init; } = 0.6;
}
