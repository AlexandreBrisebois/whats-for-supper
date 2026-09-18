using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Dto;
using System.Text.RegularExpressions;

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
            new("candidateLimit", candidateLimit)
        };
        var matchPredicates = new List<string>();
        AddPattern("phrase", trimmedQuery);
        foreach (var term in Regex.Matches(trimmedQuery, @"[\p{L}\p{N}]+")
                     .Select(match => match.Value)
                     .Distinct(StringComparer.OrdinalIgnoreCase)
                     .Where(term => !string.Equals(term, trimmedQuery, StringComparison.OrdinalIgnoreCase)))
            AddPattern("term" + matchPredicates.Count, term);

        // Each predicate remains trigram-indexable. The whole phrase preserves exact
        // recall while individual meaningful terms admit documents where the words are
        // separated or reordered; word_similarity still ranks the original request.
        var matchPredicate = $"({string.Join(" OR ", matchPredicates)})";
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

        void AddPattern(string name, string value)
        {
            parameters.Add(new NpgsqlParameter(name, $"%{value}%"));
            matchPredicates.Add($"d.document_text ILIKE @{name}");
        }
    }
}

public sealed class RecipeLexicalCandidate
{
    public Guid RecipeId { get; init; }
    public double Score { get; init; }
}
