using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class RecipeSearchService(RecipeDbContext db)
{
    private const int DefaultLimit = 5;
    private const int MaxLimit = 5;
    private const double ReasonThreshold = 0.3;

    public async Task<RecipeSearchResponseDto> SearchAsync(RecipeSearchRequestDto dto, CancellationToken ct = default)
    {
        var query = dto.Query?.Trim() ?? string.Empty;
        var limit = Math.Clamp(dto.Limit ?? DefaultLimit, 1, MaxLimit);
        var appliedFilters = dto.Filters ?? new RecipeSearchFiltersDto();

        var searchMode = dto.PantrySnapshotId is not null
            ? "pantry-assisted"
            : dto.SimilarToRecipeId is not null
                ? "similar"
                : string.Equals(dto.Mode, "agent", StringComparison.OrdinalIgnoreCase)
                    ? "agent"
                    : "standard";

        var recipes = await db.Recipes
            .AsNoTracking()
            .OrderByDescending(recipe => recipe.CreatedAt)
            .ToListAsync(ct);

        var results = string.IsNullOrWhiteSpace(query)
            ? BuildDefaultResults(recipes, limit)
            : BuildRankedResults(recipes, query, limit);

        return new RecipeSearchResponseDto
        {
            TopPick = results.FirstOrDefault(),
            Results = results,
            AppliedFilters = appliedFilters,
            SearchMode = searchMode,
            ResultPath = "lexical-only"
        };
    }

    private static List<RecipeSearchResultDto> BuildDefaultResults(List<Recipe> recipes, int limit)
    {
        return recipes
            .Take(limit)
            .Select(recipe => MapResult(recipe, [new RecipeSearchReasonDto
            {
                Source = "name-match",
                Label = "Ready to revisit from your library"
            }]))
            .ToList();
    }

    private static List<RecipeSearchResultDto> BuildRankedResults(List<Recipe> recipes, string query, int limit)
    {
        var rankedResults = recipes
            .Select(recipe => RankRecipe(recipe, query))
            .Where(candidate => candidate.Score > 0)
            .OrderByDescending(candidate => candidate.Score)
            .ThenByDescending(candidate => candidate.Recipe.CreatedAt)
            .Take(limit)
            .Select(candidate => MapResult(candidate.Recipe, candidate.Reasons))
            .ToList();

        return rankedResults;
    }

    private static RankedRecipe RankRecipe(Recipe recipe, string query)
    {
        var normalizedQuery = Normalize(query);
        var normalizedName = Normalize(recipe.Name);
        var normalizedNotes = Normalize(recipe.Notes);
        var normalizedDocument = Normalize(BuildDocumentText(recipe));

        var nameScore = TrigramSimilarity(normalizedQuery, normalizedName);
        var notesScore = TrigramSimilarity(normalizedQuery, normalizedNotes);
        var documentScore = TrigramSimilarity(normalizedQuery, normalizedDocument);

        var reasons = new List<RecipeSearchReasonDto>();

        if (nameScore >= ReasonThreshold)
        {
            reasons.Add(new RecipeSearchReasonDto
            {
                Source = "name-match",
                Label = "Name matches your search"
            });
        }

        if (notesScore >= ReasonThreshold)
        {
            reasons.Add(new RecipeSearchReasonDto
            {
                Source = "notes-match",
                Label = "Your notes mention this"
            });
        }

        var score = Math.Max(documentScore, Math.Max(nameScore, notesScore));
        if (score <= 0)
        {
            return new RankedRecipe(recipe, 0, reasons);
        }

        if (reasons.Count == 0)
        {
            reasons.Add(new RecipeSearchReasonDto
            {
                Source = "name-match",
                Label = "Matches your search"
            });
        }

        return new RankedRecipe(recipe, score, reasons);
    }

    private static RecipeSearchResultDto MapResult(Recipe recipe, List<RecipeSearchReasonDto> reasons)
    {
        return new RecipeSearchResultDto
        {
            Id = recipe.Id,
            Name = recipe.Name,
            ImageUrl = $"/api/recipes/{recipe.Id}/hero",
            TotalTime = recipe.TotalTime,
            Difficulty = recipe.Difficulty,
            Rating = (int)recipe.Rating,
            IsDiscoverable = recipe.IsDiscoverable,
            Notes = recipe.Notes,
            Reasons = reasons,
            PlannerFitNote = null
        };
    }

    private static string BuildDocumentText(Recipe recipe)
    {
        var ingredients = string.Join(
            ", ",
            DeserializeIngredients(recipe.Ingredients));

        return $"{recipe.Name}. {recipe.Description}. Ingredients: {ingredients}. Notes: {recipe.Notes}.";
    }

    private static IReadOnlyList<string> DeserializeIngredients(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim().ToLowerInvariant();
    }

    private static double TrigramSimilarity(string left, string right)
    {
        if (string.IsNullOrWhiteSpace(left) || string.IsNullOrWhiteSpace(right))
        {
            return 0;
        }

        if (right.Contains(left, StringComparison.Ordinal))
        {
            return 1;
        }

        var leftTrigrams = BuildTrigrams(left);
        var rightTrigrams = BuildTrigrams(right);
        if (leftTrigrams.Count == 0 || rightTrigrams.Count == 0)
        {
            return 0;
        }

        var intersectionCount = leftTrigrams.Intersect(rightTrigrams).Count();
        return (2d * intersectionCount) / (leftTrigrams.Count + rightTrigrams.Count);
    }

    private static HashSet<string> BuildTrigrams(string value)
    {
        var padded = $"  {value}  ";
        var trigrams = new HashSet<string>();

        for (var index = 0; index <= padded.Length - 3; index++)
        {
            trigrams.Add(padded.Substring(index, 3));
        }

        return trigrams;
    }

    private sealed record RankedRecipe(Recipe Recipe, double Score, List<RecipeSearchReasonDto> Reasons);
}
