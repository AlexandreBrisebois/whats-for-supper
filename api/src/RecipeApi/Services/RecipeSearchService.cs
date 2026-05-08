using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public partial class RecipeSearchService(RecipeDbContext db, ScheduleService scheduleService)
{
    private const int DefaultLimit = 5;
    private const int MaxLimit = 5;
    private const double ReasonThreshold = 0.3;
    private const double PlannerGapBoost = 0.20;
    private const double PlannerUrgencyBoost = 0.10;

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

        var candidates = string.IsNullOrWhiteSpace(query)
            ? BuildDefaultCandidates(recipes)
            : BuildRankedCandidates(recipes, query);

        if (dto.WeekOffset is not null && dto.DayIndex is not null)
        {
            candidates = await ApplyPlannerAwareRerankingAsync(candidates, dto.WeekOffset.Value, query, ct);
        }

        var results = candidates
            .OrderByDescending(candidate => candidate.Score)
            .ThenByDescending(candidate => candidate.Recipe.CreatedAt)
            .Take(limit)
            .Select(MapResult)
            .ToList();

        if (dto.WeekOffset is not null && results.Count > 0 && string.IsNullOrWhiteSpace(results[0].PlannerFitNote))
        {
            results[0].PlannerFitNote = "Not yet planned this week";
        }

        return new RecipeSearchResponseDto
        {
            TopPick = results.FirstOrDefault(),
            Results = results,
            AppliedFilters = appliedFilters,
            SearchMode = searchMode,
            ResultPath = "lexical-only"
        };
    }

    private static List<RankedRecipe> BuildDefaultCandidates(List<Recipe> recipes)
    {
        return recipes
            .Select(recipe => new RankedRecipe(
                recipe,
                0,
                [new RecipeSearchReasonDto
                {
                    Source = "name-match",
                    Label = "Ready to revisit from your library"
                }],
                null))
            .ToList();
    }

    private static List<RankedRecipe> BuildRankedCandidates(List<Recipe> recipes, string query)
    {
        return recipes
            .Select(recipe => RankRecipe(recipe, query))
            .Where(candidate => candidate.Score > 0)
            .ToList();
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
            return new RankedRecipe(recipe, 0, reasons, null);
        }

        if (reasons.Count == 0)
        {
            reasons.Add(new RecipeSearchReasonDto
            {
                Source = "name-match",
                Label = "Matches your search"
            });
        }

        return new RankedRecipe(recipe, score, reasons, null);
    }

    private async Task<List<RankedRecipe>> ApplyPlannerAwareRerankingAsync(
        List<RankedRecipe> candidates,
        int weekOffset,
        string query,
        CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        var schedule = await scheduleService.GetScheduleAsync(weekOffset);
        var assignedRecipeIds = schedule.Days
            .Where(day => day.Recipe is not null)
            .Select(day => day.Recipe!.Id)
            .ToHashSet();

        var reranked = candidates
            .Where(candidate => !assignedRecipeIds.Contains(candidate.Recipe.Id))
            .Select(candidate => ApplyPlannerSignals(candidate, schedule.BalanceSummary, query))
            .ToList();

        return reranked;
    }

    private static RankedRecipe ApplyPlannerSignals(
        RankedRecipe candidate,
        WeeklyBalanceSummaryDto? balanceSummary,
        string query)
    {
        var score = candidate.Score;
        var plannerFitNote = candidate.PlannerFitNote;
        var reasons = candidate.Reasons.ToList();
        var dietaryProfile = DeserializeDietaryProfile(candidate.Recipe.DietaryProfile);

        if (balanceSummary is not null)
        {
            var (gapBoost, gapNote) = GetBalanceGapAdjustment(balanceSummary, dietaryProfile);
            if (gapBoost > 0)
            {
                score += gapBoost;
                plannerFitNote ??= gapNote;
                reasons.Add(new RecipeSearchReasonDto
                {
                    Source = "planner-fit",
                    Label = gapNote
                });
            }
        }

        if (IsUrgentQuery(query) && IsQuickRecipe(candidate.Recipe.TotalTime))
        {
            score += PlannerUrgencyBoost;
            plannerFitNote = "Quick option for tonight";
            reasons.Add(new RecipeSearchReasonDto
            {
                Source = "planner-fit",
                Label = "Quick option for tonight"
            });
        }

        return candidate with
        {
            Score = score,
            Reasons = reasons,
            PlannerFitNote = plannerFitNote
        };
    }

    private static (double Boost, string? Note) GetBalanceGapAdjustment(
        WeeklyBalanceSummaryDto balanceSummary,
        RecipeDietaryProfile? dietaryProfile)
    {
        if (dietaryProfile is null)
        {
            return (0, null);
        }

        if (balanceSummary.VeggieDays < 4 && SupportsFoodGroup(dietaryProfile, "VegetablesAndFruits"))
        {
            return (PlannerGapBoost, "Helps add vegetables to this week");
        }

        if (balanceSummary.ProteinDays < 3 && SupportsFoodGroup(dietaryProfile, "ProteinFoods"))
        {
            return (PlannerGapBoost, "Helps add protein to this week");
        }

        if (balanceSummary.GrainDays < 2 && SupportsWholeGrains(dietaryProfile))
        {
            return (PlannerGapBoost, "Helps add whole grains to this week");
        }

        if (balanceSummary.PlantProteinDays < 1 && SupportsPlantProtein(dietaryProfile))
        {
            return (PlannerGapBoost, "Helps add a plant-protein night this week");
        }

        return (0, null);
    }

    private static bool SupportsFoodGroup(RecipeDietaryProfile dietaryProfile, string foodGroup)
    {
        return string.Equals(dietaryProfile.PrimaryFoodGroup, foodGroup, StringComparison.OrdinalIgnoreCase)
            || dietaryProfile.SecondaryFoodGroups.Contains(foodGroup, StringComparer.OrdinalIgnoreCase);
    }

    private static bool SupportsWholeGrains(RecipeDietaryProfile dietaryProfile)
    {
        return dietaryProfile.WholeGrainConfident
            && SupportsFoodGroup(dietaryProfile, "WholeGrains");
    }

    private static bool SupportsPlantProtein(RecipeDietaryProfile dietaryProfile)
    {
        return string.Equals(dietaryProfile.ProteinSource, "PlantProtein", StringComparison.OrdinalIgnoreCase)
            || string.Equals(dietaryProfile.ProteinSource, "Mixed", StringComparison.OrdinalIgnoreCase);
    }

    private static RecipeSearchResultDto MapResult(RankedRecipe candidate)
    {
        var recipe = candidate.Recipe;
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
            Reasons = candidate.Reasons,
            PlannerFitNote = candidate.PlannerFitNote
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

    private static RecipeDietaryProfile? DeserializeDietaryProfile(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<RecipeDietaryProfile>(json, JsonDefaults.CamelCase);
        }
        catch (JsonException)
        {
            return null;
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

    private static bool IsUrgentQuery(string query)
    {
        var normalizedQuery = Normalize(query);
        return normalizedQuery.Contains("quick", StringComparison.Ordinal)
            || normalizedQuery.Contains("fast", StringComparison.Ordinal)
            || normalizedQuery.Contains("tonight", StringComparison.Ordinal);
    }

    private static bool IsQuickRecipe(string? totalTime)
    {
        if (string.IsNullOrWhiteSpace(totalTime))
        {
            return false;
        }

        var match = TotalMinutesRegex().Match(totalTime);
        return match.Success && int.TryParse(match.Groups[1].Value, out var minutes) && minutes <= 30;
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

    [GeneratedRegex(@"(\d+)")]
    private static partial Regex TotalMinutesRegex();

    private sealed record RankedRecipe(
        Recipe Recipe,
        double Score,
        List<RecipeSearchReasonDto> Reasons,
        string? PlannerFitNote);
}
