using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public partial class RecipeSearchService(
    RecipeDbContext db,
    ScheduleService scheduleService,
    InventoryCaptureService inventoryCaptureService,
    IEmbeddingProvider? embeddingProvider = null,
    AgentSearchTranslationService? agentTranslator = null,
    ISearchTelemetry? telemetry = null)
{
    private const double PantryMatchBoost = 0.25;
    private const int DefaultLimit = 6;
    private const int MaxLimit = 50;
    private const int VectorCandidateLimit = 50;
    private const double ReasonThreshold = 0.3;
    private const double MinimumCandidateScore = 0.15;
    private const double SimilarityThreshold = 0.7; // Threshold for "Find Similar" and Vector search
    private const double VectorSimilarityWeight = 0.6;
    private const double LexicalSimilarityWeight = 0.4;
    private const double PlannerGapBoost = 0.20;
    private const double PlannerUrgencyBoost = 0.10;
    private const double NotesMatchBoost = 0.10;
    private const double BoostLove = 0.15;
    private const double BoostLike = 0.08;
    private const double BoostDislike = 0.10;
    private const double BoostVotesMax = 0.15;
    private const double BoostVotesRate = 0.05;
    private const double PlannedDemotion = -10.0;

    public async Task<RecipeSearchResponseDto> SearchAsync(RecipeSearchRequestDto dto, CancellationToken ct = default)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
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

        telemetry?.Emit(SearchTelemetryEvents.SearchRequested, new()
        {
            ["mode"] = searchMode,
            ["hasPlanner"] = dto.WeekOffset is not null,
            ["hasFilters"] = dto.Filters is not null,
            ["hasPantry"] = dto.PantrySnapshotId is not null
        });

        // 1. Build Base Query with Filters
        var recipesQuery = db.Recipes
            .AsNoTracking()
            .Where(recipe =>
                recipe.DeletedAt == null &&
                recipe.Name != null &&
                recipe.Name != "" &&
                (recipe.ImageCount > 0 || recipe.IsSynthesized));

        recipesQuery = ApplyFilters(recipesQuery, appliedFilters);

        // 2. Retrieval
        var candidates = new List<RankedRecipe>();
        var resultPath = "lexical-only";

        if (dto.SimilarToRecipeId is not null)
        {
            // Similar Mode: retrieve based on target recipe embedding
            candidates = await SimilarSearchAsync(dto.SimilarToRecipeId.Value, recipesQuery, ct);
            resultPath = "similar";
        }
        else if (!string.IsNullOrWhiteSpace(query))
        {
            // Standard/Agent/Pantry Hybrid Search
            var lexicalCandidates = await GetLexicalCandidatesAsync(recipesQuery, query, appliedFilters, ct);

            if (embeddingProvider is not null)
            {
                try
                {
                    // Vector Retrieval (300ms budget as per Requirement 13, AC 7)
                    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                    cts.CancelAfter(TimeSpan.FromMilliseconds(300));

                    var vectorCandidates = await VectorSearchAsync(query, recipesQuery, cts.Token);
                    candidates = MergeCandidates(lexicalCandidates, vectorCandidates);
                    resultPath = "hybrid";
                }
                catch (OperationCanceledException)
                {
                    candidates = lexicalCandidates;
                    resultPath = "fallback-lexical";
                    telemetry?.Emit(SearchTelemetryEvents.SearchFallbackServed, new() { ["reason"] = "vector_timeout" });
                }
                catch (Exception)
                {
                    candidates = lexicalCandidates;
                    resultPath = "fallback-lexical";
                    telemetry?.Emit(SearchTelemetryEvents.SearchFallbackServed, new() { ["reason"] = "vector_unavailable" });
                }
            }
            else
            {
                candidates = lexicalCandidates;
            }
        }
        else
        {
            // Default: Browse All (empty query)
            var recipes = await recipesQuery
                .OrderByDescending(recipe => recipe.CreatedAt)
                .Take(MaxLimit)
                .ToListAsync(ct);
            candidates = BuildDefaultCandidates(recipes, appliedFilters);
        }

        // 3. Reranking
        if (dto.WeekOffset is not null && dto.DayIndex is not null)
        {
            candidates = await ApplyPlannerAwareRerankingAsync(candidates, dto.WeekOffset.Value, query, ct);
        }

        candidates = await ApplyFamilyFitRerankingAsync(candidates, ct);
        candidates = await ApplyPantryBoostAsync(candidates, dto.PantrySnapshotId, ct);

        // 4. Map & Limit
        var finalCandidates = candidates
            .OrderByDescending(candidate => candidate.Score)
            .ThenByDescending(candidate => candidate.Recipe.CreatedAt);

        if (dto.Filters?.NotCookedInLongTime == true)
        {
            // If explicitly looking for recipes that have been away longest, prioritize by LastCookedDate ASC.
            finalCandidates = candidates
                .OrderByDescending(c => c.Score)
                .ThenBy(c => c.Recipe.LastCookedDate);
        }

        var topPick = finalCandidates.FirstOrDefault();
        var resultsList = finalCandidates.Skip(topPick != null ? 1 : 0).ToList();

        // 3.5 RAG Pass (Agent Mode Only)
        // If in Agent mode and we have candidates, let the LLM pick the best one and explain why.
        RecipeSearchResultDto? finalTopPick = topPick != null ? MapResult(topPick) : null;
        if (searchMode == "agent" && agentTranslator != null && resultsList.Count > 0 && !string.IsNullOrWhiteSpace(dto.OriginalQuery))
        {
            var candidatesToRerank = resultsList.Take(5).Select(MapResult).ToList();
            if (finalTopPick != null) candidatesToRerank.Insert(0, finalTopPick);

            // Fetch current week context for better variety/RAG recommendations
            var weekContext = new List<string>();
            var recommendations = new List<string>();
            if (dto.WeekOffset.HasValue)
            {
                var context = await GetWeekDietaryContextAsync(dto.WeekOffset.Value, ct);
                weekContext = context.Names;
                recommendations = context.Recommendations;
            }

            var (selectedId, reason) = await agentTranslator.RerankAsync(dto.OriginalQuery, candidatesToRerank, weekContext, recommendations, ct);

            if (selectedId.HasValue)
            {
                // Re-shuffle to put the LLM-selected recipe at the top
                var allFound = resultsList.ToList();
                if (topPick != null) allFound.Insert(0, topPick);

                var selected = allFound.FirstOrDefault(c => c.Recipe.Id == selectedId.Value);
                if (selected != null)
                {
                    finalTopPick = MapResult(selected);
                    finalTopPick.PlannerFitNote = reason; // Use the AI reason as the note

                    resultsList = allFound
                        .Where(c => c.Recipe.Id != selectedId.Value)
                        .ToList();
                }
            }
        }

        var results = resultsList
            .Take(limit)
            .Select(MapResult)
            .ToList();

        if (dto.WeekOffset is not null && results.Count > 0 && string.IsNullOrWhiteSpace(results[0].PlannerFitNote))
        {
            results[0].PlannerFitNote = "Not yet planned this week";
        }

        var response = new RecipeSearchResponseDto
        {
            TopPick = finalTopPick,
            Results = results,
            AppliedFilters = appliedFilters,
            SearchMode = searchMode,
            ResultPath = resultPath
        };

        stopwatch.Stop();
        telemetry?.Emit(SearchTelemetryEvents.SearchCompleted, new()
        {
            ["mode"] = searchMode,
            ["resultPath"] = response.ResultPath,
            ["resultCount"] = results.Count,
            ["topPickPresent"] = response.TopPick is not null,
            ["durationMs"] = stopwatch.ElapsedMilliseconds
        });

        if (results.Count == 0)
        {
            telemetry?.Emit(SearchTelemetryEvents.SearchEmptyResults, new()
            {
                ["mode"] = searchMode,
                ["filtersApplied"] = appliedFilters
            });
        }

        return response;
    }

    private static List<RankedRecipe> BuildDefaultCandidates(List<Recipe> recipes, RecipeSearchFiltersDto? filters)
    {
        var candidates = recipes
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

        if (filters?.QuickOnly == true)
        {
            candidates = candidates.Where(c => IsQuickRecipe(c.Recipe.TotalTime)).ToList();
        }

        return candidates;
    }

    private static List<RankedRecipe> BuildRankedCandidates(List<Recipe> recipes, string query, RecipeSearchFiltersDto? filters)
    {
        var candidates = recipes
            .Select(recipe => RankRecipe(recipe, query))
            .Where(candidate => candidate.Score >= MinimumCandidateScore)
            .ToList();

        if (filters?.QuickOnly == true)
        {
            candidates = candidates.Where(c => IsQuickRecipe(c.Recipe.TotalTime)).ToList();
        }

        return candidates;
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
        var score = Math.Max(documentScore, Math.Max(nameScore, notesScore));

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
            score += NotesMatchBoost;
            reasons.Add(new RecipeSearchReasonDto
            {
                Source = "notes-match",
                Label = "Your notes mention this"
            });
        }

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

    private async Task<List<RankedRecipe>> ApplyFamilyFitRerankingAsync(
        List<RankedRecipe> candidates,
        CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        if (candidates.Count == 0)
        {
            return candidates;
        }

        var candidateIds = candidates.Select(candidate => candidate.Recipe.Id).ToList();
        var voteCounts = await db.RecipeVotes
            .AsNoTracking()
            .Where(vote => candidateIds.Contains(vote.RecipeId) && vote.Vote == VoteType.Like)
            .GroupBy(vote => vote.RecipeId)
            .Select(group => new { RecipeId = group.Key, VoteCount = group.Count() })
            .ToDictionaryAsync(x => x.RecipeId, x => x.VoteCount, ct);

        return candidates
            .Select(candidate => ApplyFamilySignals(candidate, voteCounts.GetValueOrDefault(candidate.Recipe.Id)))
            .ToList();
    }

    private static RankedRecipe ApplyFamilySignals(RankedRecipe candidate, int likeVoteCount)
    {
        var score = candidate.Score;
        var reasons = candidate.Reasons.ToList();

        var (ratingDelta, ratingLabel) = candidate.Recipe.Rating switch
        {
            RecipeRating.Love => (BoostLove, "Loved by your household"),
            RecipeRating.Like => (BoostLike, "Liked by your household"),
            RecipeRating.Dislike => (-BoostDislike, "Previously marked as a dislike"),
            _ => (0d, (string?)null)
        };

        if (ratingDelta != 0 && ratingLabel is not null)
        {
            score += ratingDelta;
            reasons.Add(new RecipeSearchReasonDto
            {
                Source = "rating-boost",
                Label = ratingLabel
            });
        }

        var voteBoost = Math.Min(likeVoteCount * BoostVotesRate, BoostVotesMax);
        if (voteBoost > 0)
        {
            score += voteBoost;
            reasons.Add(new RecipeSearchReasonDto
            {
                Source = "vote-boost",
                Label = "Family has shown interest"
            });
        }

        return candidate with
        {
            Score = score,
            Reasons = reasons
        };
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
            .Select(candidate =>
            {
                var isPlanned = assignedRecipeIds.Contains(candidate.Recipe.Id);
                var updated = ApplyPlannerSignals(candidate, schedule.BalanceSummary, query);
                if (isPlanned)
                {
                    var reasons = updated.Reasons.ToList();
                    reasons.Add(new RecipeSearchReasonDto
                    {
                        Source = "planner-fit",
                        Label = "Already planned for this week"
                    });
                    return updated with { Score = updated.Score + PlannedDemotion, Reasons = reasons };
                }
                return updated;
            })
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
                    Label = gapNote!
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

    private record WeekDietaryContext(List<string> Names, List<string> Recommendations);

    private async Task<WeekDietaryContext> GetWeekDietaryContextAsync(int weekOffset, CancellationToken ct)
    {
        var (monday, sunday) = GetWeekBounds(weekOffset);

        var scheduledRecipes = await db.CalendarEvents
            .AsNoTracking()
            .Where(e => e.Date >= monday && e.Date <= sunday && e.RecipeId != null)
            .Select(e => e.Recipe)
            .ToListAsync(ct);

        var names = scheduledRecipes
            .Where(r => r != null)
            .Select(r => r!.Name!)
            .ToList();

        var profiles = scheduledRecipes
            .Select(r => r?.DietaryProfile != null ? JsonSerializer.Deserialize<RecipeDietaryProfile>(r.DietaryProfile) : null)
            .ToList();

        var balance = WeeklyBalanceScorer.Compute(profiles);

        return new WeekDietaryContext(names, balance.Recommendations.ToList());
    }

    private static (DateOnly Monday, DateOnly Sunday) GetWeekBounds(int weekOffset)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday + weekOffset * 7);
        var sunday = monday.AddDays(6);
        return (monday, sunday);
    }

    private static RecipeSearchResultDto MapResult(RankedRecipe candidate)
    {
        var recipe = candidate.Recipe;
        return new RecipeSearchResultDto
        {
            Id = recipe.Id,
            Name = recipe.Name,
            Description = recipe.Description,
            Score = candidate.Score,
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

    private async Task<List<RankedRecipe>> VectorSearchAsync(
        string query,
        IQueryable<Recipe> recipesQuery,
        CancellationToken ct)
    {
        if (embeddingProvider is null) return [];

        var queryVector = await embeddingProvider.GenerateAsync(query, ct);
        var queryVectorJson = JsonSerializer.Serialize(queryVector);

        var vectorCandidates = await db.RecipeSearchDocuments
            .FromSqlInterpolated($@"
                SELECT * FROM recipe_search_documents
                WHERE embedding IS NOT NULL
                AND embedding <=> ({queryVectorJson})::vector < {1.0 - SimilarityThreshold}
                ORDER BY embedding <=> ({queryVectorJson})::vector
                LIMIT {VectorCandidateLimit}")
            .AsNoTracking()
            .Include(d => d.Recipe)
            .Where(d => recipesQuery.Select(r => r.Id).Contains(d.RecipeId))
            .ToListAsync(ct);

        return vectorCandidates
            .Select(d => new RankedRecipe(
                d.Recipe!,
                CalculateCosineSimilarity(queryVector, d.Embedding),
                [new RecipeSearchReasonDto { Source = "semantic-match", Label = "Matches the meaning of your search" }],
                null))
            .ToList();
    }

    private async Task<List<RankedRecipe>> SimilarSearchAsync(
        Guid similarToId,
        IQueryable<Recipe> recipesQuery,
        CancellationToken ct)
    {
        var targetDoc = await db.RecipeSearchDocuments
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.RecipeId == similarToId, ct);

        if (targetDoc?.EmbeddingJson is null)
        {
            // Fallback to lexical if no embedding
            var targetRecipe = await db.Recipes.FindAsync([similarToId], ct);
            if (targetRecipe is null) return [];
            return await GetLexicalCandidatesAsync(recipesQuery.Where(r => r.Id != similarToId), targetRecipe.Name ?? "", null, ct);
        }

        var candidates = await db.RecipeSearchDocuments
            .FromSqlInterpolated($@"
                SELECT * FROM recipe_search_documents
                WHERE recipe_id != {similarToId}
                AND embedding IS NOT NULL
                AND embedding <=> ({targetDoc.EmbeddingJson})::vector < {1.0 - SimilarityThreshold}
                ORDER BY embedding <=> ({targetDoc.EmbeddingJson})::vector
                LIMIT {VectorCandidateLimit}")
            .AsNoTracking()
            .Include(d => d.Recipe)
            .Where(d => recipesQuery.Select(r => r.Id).Contains(d.RecipeId))
            .ToListAsync(ct);

        var targetVector = targetDoc.Embedding;

        return candidates
            .Select(d => new RankedRecipe(
                d.Recipe!,
                CalculateCosineSimilarity(targetVector, d.Embedding),
                [new RecipeSearchReasonDto { Source = "semantic-match", Label = "Similar to " + (targetDoc.Recipe?.Name ?? "original") }],
                null))
            .ToList();
    }

    private static double CalculateCosineSimilarity(float[]? vector1, float[]? vector2)
    {
        if (vector1 == null || vector2 == null || vector1.Length != vector2.Length)
        {
            return 0;
        }

        double dotProduct = 0;
        double magnitude1 = 0;
        double magnitude2 = 0;

        for (int i = 0; i < vector1.Length; i++)
        {
            dotProduct += vector1[i] * vector2[i];
            magnitude1 += vector1[i] * vector1[i];
            magnitude2 += vector2[i] * vector2[i];
        }

        magnitude1 = Math.Sqrt(magnitude1);
        magnitude2 = Math.Sqrt(magnitude2);

        if (magnitude1 == 0 || magnitude2 == 0)
        {
            return 0;
        }

        return dotProduct / (magnitude1 * magnitude2);
    }

    private async Task<List<RankedRecipe>> GetLexicalCandidatesAsync(
        IQueryable<Recipe> recipesQuery,
        string query,
        RecipeSearchFiltersDto? filters,
        CancellationToken ct)
    {
        var recipes = await recipesQuery.ToListAsync(ct);
        return BuildRankedCandidates(recipes, query, filters);
    }

    private List<RankedRecipe> MergeCandidates(
        List<RankedRecipe> lexical,
        List<RankedRecipe> vector)
    {
        var all = new Dictionary<Guid, RankedRecipe>();

        foreach (var l in lexical)
        {
            all[l.Recipe.Id] = l with { Score = l.Score * LexicalSimilarityWeight };
        }

        foreach (var v in vector)
        {
            if (all.TryGetValue(v.Recipe.Id, out var existing))
            {
                var mergedReasons = existing.Reasons.ToList();
                if (!mergedReasons.Any(r => r.Source == "semantic-match"))
                    mergedReasons.AddRange(v.Reasons);

                all[v.Recipe.Id] = existing with
                {
                    Score = existing.Score + (v.Score * VectorSimilarityWeight),
                    Reasons = mergedReasons
                };
            }
            else
            {
                all[v.Recipe.Id] = v with { Score = v.Score * VectorSimilarityWeight };
            }
        }

        return all.Values.ToList();
    }

    private IQueryable<Recipe> ApplyFilters(IQueryable<Recipe> query, RecipeSearchFiltersDto filters)
    {
        if (filters.NewRecipes == true)
        {
            var thirtyDaysAgo = DateTimeOffset.UtcNow.AddDays(-30);
            query = query.Where(r => r.CreatedAt >= thirtyDaysAgo);
            // Additional constraint: not cooked more than twice (requires joining schedule, skipping for now as per v2 spec simple def)
        }

        if (filters.NeverCooked == true)
        {
            query = query.Where(r => r.LastCookedDate == null);
        }

        if (filters.FamilyFavorite == true)
        {
            query = query.Where(r => (int)r.Rating >= 2 && (r.IsDiscoverable || r.Notes != null));
        }

        if (filters.QuickOnly == true)
        {
            // We'll filter this in memory in the service after fetching,
            // but we can do a coarse filter here if we want.
            // For now, let's keep it broad and filter in RankRecipe or BuildRankedCandidates.
        }

        if (filters.NotCookedInLongTime == true)
        {
            query = query.Where(r => r.LastCookedDate != null);
        }

        if (filters.DiscoverableOnly == true)
        {
            query = query.Where(r => r.IsDiscoverable);
        }

        if (filters.HealthyOnly == true)
        {
            query = query.Where(r => r.IsHealthyChoice);
        }

        return query;
    }

    private async Task<List<RankedRecipe>> ApplyPantryBoostAsync(
        List<RankedRecipe> candidates,
        Guid? pantrySnapshotId,
        CancellationToken ct)
    {
        if (pantrySnapshotId == null || candidates.Count == 0) return candidates;

        var snapshot = inventoryCaptureService.GetSnapshot(pantrySnapshotId.Value);
        if (snapshot == null || snapshot.InferredIngredients.Count == 0) return candidates;

        var pantryIngredients = snapshot.InferredIngredients
            .Select(Normalize)
            .ToHashSet();

        return candidates.Select(candidate =>
        {
            var ingredientsJson = candidate.Recipe.Ingredients;
            if (string.IsNullOrWhiteSpace(ingredientsJson)) return candidate;

            var recipeIngredients = DeserializeIngredients(ingredientsJson)
                .Select(Normalize)
                .ToList();

            var matches = recipeIngredients.Where(pantryIngredients.Contains).ToList();
            if (matches.Count > 0)
            {
                var score = candidate.Score + PantryMatchBoost;
                var reasons = candidate.Reasons.ToList();
                reasons.Add(new RecipeSearchReasonDto
                {
                    Source = "inventory-fit",
                    Label = $"Uses {matches.Count} ingredients from your camera photos"
                });

                return candidate with { Score = score, Reasons = reasons };
            }

            return candidate;
        }).ToList();
    }

    private sealed record RankedRecipe(
        Recipe Recipe,
        double Score,
        List<RecipeSearchReasonDto> Reasons,
        string? PlannerFitNote);
}
