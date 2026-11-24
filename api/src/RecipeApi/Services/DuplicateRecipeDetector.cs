using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed record DuplicateRecipeMatch(Guid RecipeId, string MatchKind, double Score);

/// <summary>
/// Deterministic, model-free duplicate detector over ready non-deleted household recipes.
/// Evaluates normalized SourceUrl equality and normalized title + ingredient Jaccard overlap.
/// </summary>
public sealed class DuplicateRecipeDetector
{
    private const double UrlMatchScore = 1.0;
    private const double ExactTitleMatchScore = 0.95;
    private const double MinTitleJaccard = 0.6;
    private const double MinIngredientJaccard = 0.5;
    private const double MinCombinedOverlapScore = 0.65;

    private static readonly HashSet<string> TrackingQueryParams = new(StringComparer.OrdinalIgnoreCase)
    {
        "fbclid",
        "gclid"
    };

    public static async Task<DuplicateRecipeMatch?> FindBestMatchAsync(
        RecipeDbContext db,
        Recipe target,
        CancellationToken ct = default)
    {
        var targetUrl = NormalizeUrl(target.SourceUrl);
        var targetTitle = RecipeSearchDocumentBuilder.Normalize(target.Name);
        var targetTitleTokens = Tokenize(targetTitle);
        var targetIngredients = NormalizeIngredients(target.Ingredients);

        if (targetUrl is null && targetTitle is null)
            return null;

        var candidates = await db.Recipes.AsNoTracking()
            .Where(r => r.Id != target.Id && r.IsReady && r.DeletedAt == null)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.SourceUrl,
                r.Ingredients,
                r.CreatedAt
            })
            .ToListAsync(ct);

        DuplicateRecipeMatch? best = null;
        DateTimeOffset bestCreatedAt = default;

        foreach (var candidate in candidates)
        {
            var match = EvaluateCandidate(
                candidate.Id,
                candidate.SourceUrl,
                candidate.Name,
                candidate.Ingredients,
                targetUrl,
                targetTitle,
                targetTitleTokens,
                targetIngredients);

            if (match is null)
                continue;

            if (best is null
                || match.Score > best.Score
                || (match.Score == best.Score && candidate.CreatedAt < bestCreatedAt)
                || (match.Score == best.Score && candidate.CreatedAt == bestCreatedAt && candidate.Id.CompareTo(best.RecipeId) < 0))
            {
                best = match;
                bestCreatedAt = candidate.CreatedAt;
            }
        }

        return best;
    }

    internal static DuplicateRecipeMatch? EvaluateCandidate(
        Guid candidateId,
        string? candidateSourceUrl,
        string? candidateName,
        string? candidateIngredientsJson,
        string? targetUrl,
        string? targetTitle,
        HashSet<string> targetTitleTokens,
        HashSet<string> targetIngredients)
    {
        if (targetUrl is not null)
        {
            var candidateUrl = NormalizeUrl(candidateSourceUrl);
            if (candidateUrl is not null && string.Equals(targetUrl, candidateUrl, StringComparison.Ordinal))
                return new DuplicateRecipeMatch(candidateId, "url", UrlMatchScore);
        }

        var candidateTitle = RecipeSearchDocumentBuilder.Normalize(candidateName);
        if (targetTitle is not null && candidateTitle is not null)
        {
            if (string.Equals(targetTitle, candidateTitle, StringComparison.Ordinal))
                return new DuplicateRecipeMatch(candidateId, "exact_title", ExactTitleMatchScore);

            if (targetTitleTokens.Count > 0 && targetIngredients.Count > 0)
            {
                var candidateTitleTokens = Tokenize(candidateTitle);
                var titleJaccard = Jaccard(targetTitleTokens, candidateTitleTokens);
                if (titleJaccard >= MinTitleJaccard)
                {
                    var candidateIngredients = NormalizeIngredients(candidateIngredientsJson);
                    var ingredientJaccard = Jaccard(targetIngredients, candidateIngredients);
                    var combined = 0.5 * titleJaccard + 0.5 * ingredientJaccard;
                    if (ingredientJaccard >= MinIngredientJaccard && combined >= MinCombinedOverlapScore)
                        return new DuplicateRecipeMatch(candidateId, "title_ingredients", combined);
                }
            }
        }

        return null;
    }

    public static string? NormalizeUrl(string? rawUrl)
    {
        if (string.IsNullOrWhiteSpace(rawUrl))
            return null;

        var trimmed = rawUrl.Trim();
        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
            return trimmed.TrimEnd('/').ToLowerInvariant();

        var scheme = uri.Scheme.ToLowerInvariant();
        var host = uri.Host.ToLowerInvariant();
        var port = uri.IsDefaultPort ? string.Empty : $":{uri.Port}";
        var path = uri.AbsolutePath.TrimEnd('/');

        var keptQuery = new List<string>();
        if (!string.IsNullOrEmpty(uri.Query))
        {
            var rawQuery = uri.Query.TrimStart('?');
            foreach (var part in rawQuery.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var eq = part.IndexOf('=');
                var key = eq >= 0 ? part[..eq] : part;
                if (key.StartsWith("utm_", StringComparison.OrdinalIgnoreCase)
                    || TrackingQueryParams.Contains(key))
                    continue;
                keptQuery.Add(part);
            }
            keptQuery.Sort(StringComparer.Ordinal);
        }

        var query = keptQuery.Count > 0 ? "?" + string.Join('&', keptQuery) : string.Empty;
        return $"{scheme}://{host}{port}{path}{query}";
    }

    private static HashSet<string> Tokenize(string? normalized)
    {
        if (string.IsNullOrWhiteSpace(normalized))
            return [];

        var tokens = new HashSet<string>(StringComparer.Ordinal);
        var current = new List<char>();
        foreach (var ch in normalized)
        {
            if (char.IsLetterOrDigit(ch))
            {
                current.Add(ch);
            }
            else if (current.Count > 0)
            {
                tokens.Add(new string([.. current]));
                current.Clear();
            }
        }
        if (current.Count > 0)
            tokens.Add(new string([.. current]));
        return tokens;
    }

    private static HashSet<string> NormalizeIngredients(string? ingredientsJson)
    {
        var set = new HashSet<string>(StringComparer.Ordinal);
        foreach (var item in RecipeSearchDocumentBuilder.ReadIngredients(ingredientsJson))
        {
            var normalized = RecipeSearchDocumentBuilder.Normalize(item);
            if (normalized is not null)
                set.Add(normalized);
        }
        return set;
    }

    private static double Jaccard(HashSet<string> left, HashSet<string> right)
    {
        if (left.Count == 0 || right.Count == 0)
            return 0.0;

        var intersection = 0;
        foreach (var item in left)
        {
            if (right.Contains(item))
                intersection++;
        }

        var union = left.Count + right.Count - intersection;
        return union == 0 ? 0.0 : (double)intersection / union;
    }
}
