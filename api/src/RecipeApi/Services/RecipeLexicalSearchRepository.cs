using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Dto;

namespace RecipeApi.Services;

/// <summary>Bounded PostgreSQL lexical candidate query over published canonical documents.</summary>
public sealed class RecipeLexicalSearchRepository(RecipeDbContext db)
{
    public async Task<IReadOnlyList<RecipeLexicalCandidate>> SearchAsync(
        string query,
        RecipeSearchFiltersDto filters,
        int candidateLimit,
        CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);
        var trimmedQuery = query.Trim();
        var parameters = new List<NpgsqlParameter>
        {
            new("query", trimmedQuery),
            new("pattern", $"%{trimmedQuery}%"),
            new("candidateLimit", candidateLimit)
        };
        // A substring predicate keeps exact, partial, accented, and short queries
        // indexable through gin_trgm_ops. PostgreSQL still computes a text score
        // after the index admits the bounded candidate set.
        const string matchPredicate = "d.document_text ILIKE @pattern";
        var hardFilters = RecipeSearchPredicate.BuildSql(filters, parameters);

        var sql = $"""
            SELECT d.recipe_id AS "RecipeId", word_similarity(@query, d.document_text) AS "Score"
            FROM recipe_search_documents d
            INNER JOIN recipes r ON r.id = d.recipe_id
            WHERE r.deleted_at IS NULL
              AND r.is_ready = TRUE
              AND d.index_status = 'ready'
              AND d.document_text <> ''
              AND {matchPredicate}{hardFilters}
            ORDER BY word_similarity(@query, d.document_text) DESC, d.recipe_id
            LIMIT @candidateLimit
            """;

        return await db.Database.SqlQueryRaw<RecipeLexicalCandidate>(sql, parameters.Cast<object>().ToArray())
            .ToListAsync(ct);
    }
}

public sealed class RecipeLexicalCandidate
{
    public Guid RecipeId { get; init; }
    public double Score { get; init; }
}
