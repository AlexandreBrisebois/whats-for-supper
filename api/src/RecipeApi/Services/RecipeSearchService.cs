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
    ISearchTelemetry? telemetry = null,
    RecipeLexicalSearchRepository? lexicalRepository = null,
    RecipeSemanticSearchRepository? semanticRepository = null,
    RecipeSearchRolloutOptions? rolloutOptions = null)
{
    private const double PantryMatchBoost = 0.25;
    private const int DefaultLimit = 6;
    private const int MaxLimit = 50;
    private const int LexicalCandidateLimit = 50;
    private const double ReasonThreshold = 0.3;
    private const double MinimumCandidateScore = 0.15;
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
                recipe.IsReady);

        recipesQuery = RecipeSearchPredicate.Apply(recipesQuery, appliedFilters, db);

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

            if (embeddingProvider is not null && semanticRepository is not null && SemanticOptions.Enabled)
            {
                try
                {
                    // The provider call and PostgreSQL vector query share one 300 ms budget.
                    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                    cts.CancelAfter(TimeSpan.FromMilliseconds(300));

                    var vectorCandidates = await VectorSearchAsync(query, recipesQuery, appliedFilters, cts.Token);
                    candidates = MergeCandidates(lexicalCandidates, vectorCandidates);
                    resultPath = "hybrid";
                }
                catch (OperationCanceledException) when (ct.IsCancellationRequested)
                {
                    throw;
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
            .ThenByDescending(candidate => candidate.Recipe.CreatedAt)
            .ThenBy(candidate => candidate.Recipe.Id)
            .ToList();

        if (dto.Filters?.NotCookedInLongTime == true)
        {
            // If explicitly looking for recipes that have been away longest, prioritize by LastCookedDate ASC.
            finalCandidates = candidates
                .OrderByDescending(c => c.Score)
                .ThenBy(c => c.Recipe.LastCookedDate)
                .ThenBy(c => c.Recipe.Id)
                .ToList();
        }

        var candidateIds = finalCandidates.Select(candidate => candidate.Recipe.Id).ToList();
        var reportStatuses = candidateIds.Count == 0
            ? new Dictionary<Guid, RecipeImportReportStatus>()
            : await db.RecipeImportReports
                .AsNoTracking()
                .Where(report => candidateIds.Contains(report.RecipeId))
                .ToDictionaryAsync(report => report.RecipeId, report => report.Status, ct);

        var reviewFilterActive = appliedFilters.ReportedOnly == true || appliedFilters.ReadyToReviewOnly == true;
        var promotionCandidates = reviewFilterActive
            ? []
            : finalCandidates
                .Where(candidate => !reportStatuses.ContainsKey(candidate.Recipe.Id))
                .ToList();
        var topPick = promotionCandidates.FirstOrDefault();
        var resultsList = finalCandidates
            .Where(candidate => candidate.Recipe.Id != topPick?.Recipe.Id)
            .ToList();

        // 3.5 RAG Pass (Agent Mode Only)
        // If in Agent mode and we have candidates, let the LLM pick the best one and explain why.
        RecipeSearchResultDto? finalTopPick = topPick != null ? MapResult(topPick, reportStatuses) : null;
        if (searchMode == "agent" && agentTranslator != null && promotionCandidates.Count > 1 && !string.IsNullOrWhiteSpace(dto.OriginalQuery))
        {
            var candidatesToRerank = promotionCandidates
                .Take(6)
                .Select(candidate => MapResult(candidate, reportStatuses))
                .ToList();

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
                var selected = promotionCandidates.FirstOrDefault(c => c.Recipe.Id == selectedId.Value);
                if (selected != null)
                {
                    finalTopPick = MapResult(selected, reportStatuses);
                    finalTopPick.PlannerFitNote = reason; // Use the AI reason as the note

                    resultsList = finalCandidates
                        .Where(c => c.Recipe.Id != selectedId.Value)
                        .ToList();
                }
            }
        }

        var results = resultsList
            .Take(limit)
            .Select(candidate => MapResult(candidate, reportStatuses))
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
            Reasons = reasons,
            ScoreComponents = WithComponents(candidate.ScoreComponents, ("family.rating", ratingDelta), ("family.votes", voteBoost))
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
                    return updated with { Score = updated.Score + PlannedDemotion, Reasons = reasons, ScoreComponents = WithComponents(updated.ScoreComponents, ("schedule.already-planned", PlannedDemotion)) };
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
            PlannerFitNote = plannerFitNote,
            ScoreComponents = WithComponents(candidate.ScoreComponents, ("planner.balance", balanceSummary is null ? 0 : GetBalanceGapAdjustment(balanceSummary, dietaryProfile).Boost), ("planner.urgency", IsUrgentQuery(query) && IsQuickRecipe(candidate.Recipe.TotalTime) ? PlannerUrgencyBoost : 0))
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

    private static RecipeSearchResultDto MapResult(
        RankedRecipe candidate,
        IReadOnlyDictionary<Guid, RecipeImportReportStatus> reportStatuses)
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
            Rating = (int)recipe.Rating,
            IsDiscoverable = recipe.IsDiscoverable,
            Notes = recipe.Notes,
            Reasons = candidate.Reasons,
            PlannerFitNote = candidate.PlannerFitNote,
            ImportIssueStatus = reportStatuses.TryGetValue(recipe.Id, out var status)
                ? status == RecipeImportReportStatus.ReadyToReview ? "readyToReview" : "reported"
                : null
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

    private RecipeSemanticSearchOptions SemanticOptions => rolloutOptions?.Semantic ?? new RecipeSemanticSearchOptions();

    private async Task<List<RankedRecipe>> VectorSearchAsync(
        string query,
        IQueryable<Recipe> recipesQuery,
        RecipeSearchFiltersDto filters,
        CancellationToken ct)
    {
        if (embeddingProvider is null || semanticRepository is null) return [];

        var queryVector = await embeddingProvider.GenerateAsync(query, ct);
        var vectorCandidates = await semanticRepository.SearchAsync(queryVector, filters, SemanticOptions, null, ct);
        var ids = vectorCandidates.Select(candidate => candidate.RecipeId).ToArray();
        var recipes = ids.Length == 0
            ? new Dictionary<Guid, Recipe>()
            : await recipesQuery.Where(recipe => ids.Contains(recipe.Id)).ToDictionaryAsync(recipe => recipe.Id, ct);

        return vectorCandidates
            .Where(candidate => recipes.ContainsKey(candidate.RecipeId))
            .Select(candidate => new RankedRecipe(
                recipes[candidate.RecipeId],
                candidate.Score,
                [new RecipeSearchReasonDto { Source = "semantic-match", Label = "Matches the meaning of your search" }],
                null,
                new Dictionary<string, double> { ["retrieval.semantic.raw"] = candidate.Score }))
            .ToList();
    }

    private async Task<List<RankedRecipe>> SimilarSearchAsync(
        Guid similarToId,
        IQueryable<Recipe> recipesQuery,
        CancellationToken ct)
    {
        var targetDoc = await db.RecipeSearchDocuments
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.RecipeId == similarToId
                && d.IndexStatus == "ready"
                && d.EmbeddingStatus == "ready"
                && d.EmbeddingFingerprint == d.SourceFingerprint
                && d.EmbeddingModel == SemanticOptions.EmbeddingModel
                && d.EmbeddingVersion == SemanticOptions.EmbeddingVersion, ct);

        if (targetDoc?.EmbeddingJson is null)
        {
            // Fallback to lexical if no embedding
            var targetRecipe = await db.Recipes.FindAsync([similarToId], ct);
            if (targetRecipe is null) return [];
            return await GetLexicalCandidatesAsync(recipesQuery.Where(r => r.Id != similarToId), targetRecipe.Name ?? "", null, ct);
        }

        if (semanticRepository is null || targetDoc.Embedding is null || targetDoc.Embedding.Length != SemanticOptions.EmbeddingDimensions) return [];

        try
        {
            using var semanticBudget = CancellationTokenSource.CreateLinkedTokenSource(ct);
            semanticBudget.CancelAfter(TimeSpan.FromMilliseconds(300));

            var semanticCandidates = await semanticRepository.SearchAsync(
                targetDoc.Embedding,
                new RecipeSearchFiltersDto(),
                SemanticOptions,
                similarToId,
                semanticBudget.Token);
            var ids = semanticCandidates.Select(candidate => candidate.RecipeId).ToArray();
            var recipes = ids.Length == 0
                ? new Dictionary<Guid, Recipe>()
                : await recipesQuery.Where(recipe => ids.Contains(recipe.Id)).ToDictionaryAsync(recipe => recipe.Id, ct);

            return semanticCandidates
                .Where(candidate => recipes.ContainsKey(candidate.RecipeId))
                .Select(candidate => new RankedRecipe(
                    recipes[candidate.RecipeId],
                    candidate.Score,
                    [new RecipeSearchReasonDto { Source = "semantic-match", Label = "Similar to original" }],
                    null))
                .ToList();
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception)
        {
            var sourceRecipe = await db.Recipes
                .AsNoTracking()
                .FirstOrDefaultAsync(recipe => recipe.Id == similarToId, ct);
            if (sourceRecipe is null)
            {
                return [];
            }

            return await GetLexicalCandidatesAsync(
                recipesQuery.Where(recipe => recipe.Id != similarToId),
                sourceRecipe.Name ?? string.Empty,
                null,
                ct);
        }
    }

    private async Task<List<RankedRecipe>> GetLexicalCandidatesAsync(
        IQueryable<Recipe> recipesQuery,
        string query,
        RecipeSearchFiltersDto? filters,
        CancellationToken ct)
    {
        if (lexicalRepository is not null && rolloutOptions?.DatabaseLexicalEnabled == true)
        {
            var databaseCandidates = await lexicalRepository.SearchAsync(query, filters ?? new RecipeSearchFiltersDto(), LexicalCandidateLimit, ct);
            var candidateIds = databaseCandidates.Select(candidate => candidate.RecipeId).ToArray();
            var recipesById = candidateIds.Length == 0
                ? new Dictionary<Guid, Recipe>()
                : await recipesQuery.Where(recipe => candidateIds.Contains(recipe.Id)).ToDictionaryAsync(recipe => recipe.Id, ct);

            return databaseCandidates
                .Where(candidate => recipesById.ContainsKey(candidate.RecipeId))
                .Select(candidate => new RankedRecipe(
                    recipesById[candidate.RecipeId],
                    candidate.Score,
                    [new RecipeSearchReasonDto { Source = "name-match", Label = "Matches your search" }],
                    null,
                    new Dictionary<string, double> { ["retrieval.lexical.raw"] = candidate.Score }))
                .ToList();
        }

        var recipes = await recipesQuery.ToListAsync(ct);
        var legacyCandidates = BuildRankedCandidates(recipes, query, filters);
        if (lexicalRepository is not null && rolloutOptions?.DatabaseLexicalShadowEnabled == true)
        {
            var databaseCandidates = await lexicalRepository.SearchAsync(query, filters ?? new RecipeSearchFiltersDto(), LexicalCandidateLimit, ct);
            var databaseIds = databaseCandidates.Select(candidate => candidate.RecipeId).ToHashSet();
            var legacyIds = legacyCandidates.Select(candidate => candidate.Recipe.Id).ToHashSet();
            telemetry?.Emit(SearchTelemetryEvents.SearchLexicalShadowCompared, new()
            {
                ["databaseCandidateCount"] = databaseIds.Count,
                ["legacyCandidateCount"] = legacyIds.Count,
                ["overlapCount"] = databaseIds.Intersect(legacyIds).Count()
            });
        }

        return legacyCandidates;
    }

    private List<RankedRecipe> MergeCandidates(
        List<RankedRecipe> lexical,
        List<RankedRecipe> vector)
    {
        var all = new Dictionary<Guid, RankedRecipe>();

        foreach (var l in lexical)
        {
            var normalized = NormalizeLexicalScore(l.Score);
            all[l.Recipe.Id] = l with { Score = normalized * SemanticOptions.LexicalWeight, ScoreComponents = WithComponents(l.ScoreComponents, ("retrieval.lexical.normalized", normalized), ("retrieval.lexical.weighted", normalized * SemanticOptions.LexicalWeight)) };
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
                    Score = existing.Score + (NormalizeSemanticScore(v.Score) * SemanticOptions.SemanticWeight),
                    Reasons = mergedReasons,
                    ScoreComponents = WithComponents(existing.ScoreComponents, ("retrieval.semantic.raw", v.Score), ("retrieval.semantic.normalized", NormalizeSemanticScore(v.Score)), ("retrieval.semantic.weighted", NormalizeSemanticScore(v.Score) * SemanticOptions.SemanticWeight))
                };
            }
            else
            {
                var normalized = NormalizeSemanticScore(v.Score);
                all[v.Recipe.Id] = v with { Score = normalized * SemanticOptions.SemanticWeight, ScoreComponents = WithComponents(v.ScoreComponents, ("retrieval.semantic.normalized", normalized), ("retrieval.semantic.weighted", normalized * SemanticOptions.SemanticWeight)) };
            }
        }

        return all.Values.OrderBy(candidate => candidate.Recipe.Id).ToList();
    }

    // Lexical similarity is already a 0-1 score. Cosine similarity is -1 to 1;
    // map it to the same 0-1 fusion scale before applying configured weights.
    private static double NormalizeLexicalScore(double score) => Math.Clamp(score, 0, 1);
    private static double NormalizeSemanticScore(double score) => Math.Clamp((score + 1) / 2, 0, 1);

    private static IReadOnlyDictionary<string, double> WithComponents(IReadOnlyDictionary<string, double>? current, params (string Name, double Value)[] additions)
    {
        var components = current is null ? new Dictionary<string, double>() : new Dictionary<string, double>(current);
        foreach (var (name, value) in additions) components[name] = value;
        return components;
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

                return candidate with { Score = score, Reasons = reasons, ScoreComponents = WithComponents(candidate.ScoreComponents, ("pantry.match", PantryMatchBoost)) };
            }

            return candidate;
        }).ToList();
    }

    private sealed record RankedRecipe(
        Recipe Recipe,
        double Score,
        List<RecipeSearchReasonDto> Reasons,
        string? PlannerFitNote,
        IReadOnlyDictionary<string, double>? ScoreComponents = null);
}
