using System.Text.Json;
using System.Security.Cryptography;
using System.Text;
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
    ISearchTelemetry? telemetry = null,
    RecipeLexicalSearchRepository? lexicalRepository = null,
    RecipeSemanticSearchRepository? semanticRepository = null,
    RecipeSearchRolloutOptions? rolloutOptions = null,
    RecipeSearchContinuationStore? continuationStore = null,
    IClock? clock = null,
    RecipeSearchFilterOptions? filterOptions = null)
{
    private const double PantryMatchBoost = 0.25;
    private const int DefaultLimit = 12;
    private const int MaxLimit = 50;
    private const int LexicalCandidateLimit = 50;
    private const string QuickRecipePattern = "^(?:\\s*)(?:pt(?:0h(?:[0-2]?\\d|30)m?|(?:[0-2]?\\d|30)m)|(?:[1-9]|[12]\\d|30)\\s*(?:m|min|mins|minute|minutes))(?:\\s*)$";
    private const double BoostLove = 0.15;
    private const double BoostLike = 0.08;
    private const double BoostDislike = 0.10;
    private const double BoostVotesMax = 0.15;
    private const double BoostVotesRate = 0.05;
    private const double PlannedDemotion = -10.0;
    private readonly IClock _clock = clock ?? new SystemClock();
    private readonly RecipeSearchFilterOptions? _filterOptions = filterOptions;

    public async Task<RecipeSearchResponseDto> SearchAsync(RecipeSearchRequestDto dto, CancellationToken ct = default)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var correlationId = Guid.NewGuid().ToString();
        var configurationVersion = rolloutOptions?.ConfigurationVersion ?? "hybrid-search-v1";
        long lexicalDurationMs = 0;
        long semanticAttemptDurationMs = 0;
        long rerankingDurationMs = 0;
        string? failureClass = null;
        var query = dto.Query?.Trim() ?? string.Empty;
        var concepts = NormalizeConcepts(dto.Preferences?.Concepts);
        var semanticQuery = CreateSemanticQuery(query, concepts);
        var limit = Math.Clamp(dto.Limit ?? DefaultLimit, 1, MaxLimit);
        var appliedFilters = dto.Filters ?? new RecipeSearchFiltersDto();
        var continuationFingerprint = CreateContinuationFingerprint(dto, query);

        var searchMode = dto.PantrySnapshotId is not null
            ? "pantry-assisted"
            : dto.SimilarToRecipeId is not null
                ? "similar"
                : "standard";

        telemetry?.Emit(SearchTelemetryEvents.SearchRequested, new()
        {
            ["correlationId"] = correlationId,
            ["configurationVersion"] = configurationVersion,
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

        if (!string.IsNullOrWhiteSpace(dto.ContinuationToken))
            return await ContinueAsync(dto.ContinuationToken, continuationFingerprint, recipesQuery, limit, ct);

        if (string.IsNullOrWhiteSpace(semanticQuery) && dto.SimilarToRecipeId is null)
            return await BrowseAsync(recipesQuery, appliedFilters, searchMode, limit, continuationFingerprint, dto.WeekOffset, ct);

        // 2. Retrieval
        var candidates = new List<RankedRecipe>();
        var resultPath = "lexical-only";

        if (dto.SimilarToRecipeId is not null)
        {
            // Similar Mode: retrieve based on target recipe embedding
            candidates = await SimilarSearchAsync(dto.SimilarToRecipeId.Value, recipesQuery, ct);
            resultPath = "similar";
        }
        else
        {
            // Standard/Agent/Pantry Hybrid Search
            var conceptOnly = string.IsNullOrWhiteSpace(query);
            var lexicalCandidates = new List<RankedRecipe>();
            if (!conceptOnly)
            {
                var lexicalStopwatch = System.Diagnostics.Stopwatch.StartNew();
                lexicalCandidates = await GetLexicalCandidatesAsync(recipesQuery, query, appliedFilters, ct);
                lexicalStopwatch.Stop();
                lexicalDurationMs = lexicalStopwatch.ElapsedMilliseconds;
            }

            if (embeddingProvider is not null && semanticRepository is not null && SemanticOptions.Enabled)
            {
                var semanticAttemptStopwatch = System.Diagnostics.Stopwatch.StartNew();
                try
                {
                    // The provider call and PostgreSQL vector query share one 300 ms budget.
                    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                    cts.CancelAfter(TimeSpan.FromMilliseconds(300));

                    var vectorCandidates = await VectorSearchAsync(semanticQuery, recipesQuery, appliedFilters, cts.Token);
                    candidates = conceptOnly ? vectorCandidates : MergeCandidates(lexicalCandidates, vectorCandidates);
                    resultPath = conceptOnly ? "semantic-only" : "hybrid";
                }
                catch (OperationCanceledException) when (ct.IsCancellationRequested)
                {
                    throw;
                }
                catch (OperationCanceledException)
                {
                    candidates = conceptOnly
                        ? await GetLexicalCandidatesAsync(recipesQuery, semanticQuery, appliedFilters, ct)
                        : lexicalCandidates;
                    resultPath = "fallback-lexical";
                    failureClass = "semantic_budget_exhausted";
                    telemetry?.Emit(SearchTelemetryEvents.SearchFallbackServed, new()
                    {
                        ["correlationId"] = correlationId,
                        ["configurationVersion"] = configurationVersion,
                        ["failureClass"] = failureClass
                    });
                }
                catch (Exception)
                {
                    candidates = conceptOnly
                        ? await GetLexicalCandidatesAsync(recipesQuery, semanticQuery, appliedFilters, ct)
                        : lexicalCandidates;
                    resultPath = "fallback-lexical";
                    failureClass = "semantic_provider_or_vector_error";
                    telemetry?.Emit(SearchTelemetryEvents.SearchFallbackServed, new()
                    {
                        ["correlationId"] = correlationId,
                        ["configurationVersion"] = configurationVersion,
                        ["failureClass"] = failureClass
                    });
                }
                finally
                {
                    semanticAttemptStopwatch.Stop();
                    semanticAttemptDurationMs = semanticAttemptStopwatch.ElapsedMilliseconds;
                }
            }
            else
            {
                candidates = conceptOnly
                    ? await GetLexicalCandidatesAsync(recipesQuery, semanticQuery, appliedFilters, ct)
                    : lexicalCandidates;
                resultPath = conceptOnly ? "fallback-lexical" : resultPath;
            }
        }
        // 3. Reranking
        var rerankingStopwatch = System.Diagnostics.Stopwatch.StartNew();
        if (dto.WeekOffset is not null && dto.DayIndex is not null)
        {
            candidates = await ApplyPlannerAwareRerankingAsync(candidates, dto.WeekOffset.Value, ct);
        }

        candidates = await ApplyFamilyFitRerankingAsync(candidates, ct);
        candidates = await ApplyPantryBoostAsync(candidates, dto.PantrySnapshotId, ct);
        rerankingStopwatch.Stop();
        rerankingDurationMs = rerankingStopwatch.ElapsedMilliseconds;

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

        RecipeSearchResultDto? finalTopPick = topPick != null ? MapResult(topPick, reportStatuses) : null;

        var results = resultsList
            .Take(limit)
            .Select(candidate => MapResult(candidate, reportStatuses))
            .ToList();

        var response = new RecipeSearchResponseDto
        {
            TopPick = finalTopPick,
            Results = results,
            AppliedFilters = appliedFilters,
            SearchMode = searchMode,
            ResultPath = resultPath
        };

        var remainingResults = resultsList
            .Skip(limit)
            .Select(candidate => MapResult(candidate, reportStatuses))
            .ToList();
        if (remainingResults.Count > 0)
        {
            var store = continuationStore ?? throw new InvalidOperationException("Search continuation storage must be registered.");
            response.NextCursor = store.StoreRanked(continuationFingerprint, remainingResults, response);
        }

        stopwatch.Stop();
        var coverage = await GetIndexCoverageAsync(ct);
        telemetry?.Emit(SearchTelemetryEvents.SearchCompleted, new()
        {
            ["correlationId"] = correlationId,
            ["configurationVersion"] = configurationVersion,
            ["mode"] = searchMode,
            ["resultPath"] = response.ResultPath,
            ["servingPath"] = GetTelemetryPath(response.ResultPath),
            ["latencyPopulation"] = GetLatencyPopulation(response.ResultPath),
            ["failureClass"] = failureClass ?? "none",
            ["resultCount"] = results.Count,
            ["topPickPresent"] = response.TopPick is not null,
            ["durationMs"] = stopwatch.ElapsedMilliseconds,
            ["lexicalDurationMs"] = lexicalDurationMs,
            ["semanticAttemptDurationMs"] = semanticAttemptDurationMs,
            ["rerankingDurationMs"] = rerankingDurationMs,
            ["eligibleRecipeCount"] = coverage.EligibleRecipeCount,
            ["readyDocumentCount"] = coverage.ReadyDocumentCount,
            ["readyEmbeddingCount"] = coverage.ReadyEmbeddingCount
        });

        if (results.Count == 0)
        {
            telemetry?.Emit(SearchTelemetryEvents.SearchEmptyResults, new()
            {
                ["correlationId"] = correlationId,
                ["configurationVersion"] = configurationVersion,
                ["mode"] = searchMode,
                ["hasFilters"] = dto.Filters is not null
            });
        }

        return response;
    }

    private async Task<RecipeSearchResponseDto> ContinueAsync(
        string token,
        string fingerprint,
        IQueryable<Recipe> recipesQuery,
        int limit,
        CancellationToken ct)
    {
        var store = continuationStore ?? throw new InvalidOperationException("Search continuation storage must be registered.");
        var continuation = store.Get(token, fingerprint);
        return continuation switch
        {
            RecipeSearchContinuationStore.RankedContinuation ranked => await ContinueRankedAsync(ranked, fingerprint, recipesQuery, limit, store, ct),
            RecipeSearchContinuationStore.BrowseContinuation browse => await ContinueBrowseAsync(browse, fingerprint, recipesQuery, limit, store, ct),
            _ => throw new RecipeSearchContinuationExpiredException()
        };
    }

    private async Task<RecipeSearchResponseDto> ContinueRankedAsync(
        RecipeSearchContinuationStore.RankedContinuation continuation,
        string fingerprint,
        IQueryable<Recipe> recipesQuery,
        int limit,
        RecipeSearchContinuationStore store,
        CancellationToken ct)
    {
        var ids = continuation.Results.Select(result => result.Id).ToArray();
        var eligibleIds = await recipesQuery.Where(recipe => ids.Contains(recipe.Id)).Select(recipe => recipe.Id).ToHashSetAsync(ct);
        var eligible = continuation.Results.Where(result => eligibleIds.Contains(result.Id)).ToList();
        var page = eligible.Take(limit).Select(RecipeSearchContinuationStore.Clone).ToList();
        var response = RecipeSearchContinuationStore.Clone(continuation.Response);
        response.TopPick = null;
        response.Results = page;
        response.NextCursor = eligible.Count > limit
            ? store.StoreRanked(fingerprint, eligible.Skip(limit).ToList(), response)
            : null;
        return response;
    }

    private async Task<RecipeSearchResponseDto> BrowseAsync(
        IQueryable<Recipe> recipesQuery,
        RecipeSearchFiltersDto filters,
        string searchMode,
        int limit,
        string fingerprint,
        int? weekOffset,
        CancellationToken ct)
    {
        var ranked = await GetBrowseRankedRecipesAsync(recipesQuery, filters, weekOffset, ct);
        var recipes = ranked.Take(limit + 2).Select(candidate => candidate.Recipe).ToList();
        var candidates = BuildDefaultCandidates(recipes, filters);
        var promotionEligibleIds = ranked.Where(candidate => candidate.IsPromotionEligible).Select(candidate => candidate.Recipe.Id).ToHashSet();
        var reportStatuses = await GetReportStatusesAsync(candidates.Select(candidate => candidate.Recipe.Id), ct);
        var reviewFilterActive = filters.ReportedOnly == true || filters.ReadyToReviewOnly == true;
        var topPick = reviewFilterActive ? null : candidates.FirstOrDefault(candidate =>
            promotionEligibleIds.Contains(candidate.Recipe.Id) && !reportStatuses.ContainsKey(candidate.Recipe.Id));
        var alternatives = candidates.Where(candidate => candidate.Recipe.Id != topPick?.Recipe.Id).ToList();
        var results = alternatives.Take(limit).Select(candidate => MapResult(candidate, reportStatuses, promotionEligibleIds.Contains(candidate.Recipe.Id))).ToList();
        var response = new RecipeSearchResponseDto
        {
            TopPick = topPick is null ? null : MapResult(topPick, reportStatuses, true),
            Results = results,
            AppliedFilters = filters,
            SearchMode = searchMode,
            ResultPath = "browse"
        };

        if (alternatives.Count > limit && results.Count > 0)
        {
            var last = alternatives[limit - 1].Recipe;
            var store = continuationStore ?? throw new InvalidOperationException("Search continuation storage must be registered.");
            response.NextCursor = store.StoreBrowse(
                fingerprint,
                new RecipeSearchContinuationStore.BrowsePosition(last.LastCookedDate, last.CreatedAt, last.Id, weekOffset),
                topPick?.Recipe.Id,
                response);
        }

        return response;
    }

    private async Task<RecipeSearchResponseDto> ContinueBrowseAsync(
        RecipeSearchContinuationStore.BrowseContinuation continuation,
        string fingerprint,
        IQueryable<Recipe> recipesQuery,
        int limit,
        RecipeSearchContinuationStore store,
        CancellationToken ct)
    {
        var ranked = await GetBrowseRankedRecipesAsync(recipesQuery, continuation.Response.AppliedFilters, continuation.Position.WeekOffset, ct);
        var afterPosition = ranked.SkipWhile(candidate => candidate.Recipe.Id != continuation.Position.Id).Skip(1);
        if (continuation.TopPickId is Guid topPickId)
            afterPosition = afterPosition.Where(candidate => candidate.Recipe.Id != topPickId);
        var recipes = afterPosition.Take(limit + 1).Select(candidate => candidate.Recipe).ToList();
        var candidates = BuildDefaultCandidates(recipes, continuation.Response.AppliedFilters);
        var promotionEligibleIds = ranked.Where(candidate => candidate.IsPromotionEligible).Select(candidate => candidate.Recipe.Id).ToHashSet();
        var reportStatuses = await GetReportStatusesAsync(candidates.Select(candidate => candidate.Recipe.Id), ct);
        var results = candidates.Take(limit).Select(candidate => MapResult(candidate, reportStatuses, promotionEligibleIds.Contains(candidate.Recipe.Id))).ToList();
        var response = RecipeSearchContinuationStore.Clone(continuation.Response);
        response.TopPick = null;
        response.Results = results;
        response.NextCursor = candidates.Count > limit && results.Count > 0
            ? store.StoreBrowse(fingerprint, new RecipeSearchContinuationStore.BrowsePosition(candidates[limit - 1].Recipe.LastCookedDate, candidates[limit - 1].Recipe.CreatedAt, candidates[limit - 1].Recipe.Id), continuation.TopPickId, response)
            : null;
        return response;
    }

    private static IOrderedQueryable<Recipe> BrowseOrder(IQueryable<Recipe> recipes) => recipes
        .OrderBy(recipe => recipe.LastCookedDate.HasValue ? 1 : 0)
        .ThenBy(recipe => recipe.LastCookedDate)
        .ThenByDescending(recipe => recipe.CreatedAt)
        .ThenBy(recipe => recipe.Id);

    private static IQueryable<Recipe> AfterBrowsePosition(IQueryable<Recipe> recipes, RecipeSearchContinuationStore.BrowsePosition position) =>
        position.LastCookedDate is null
            ? recipes.Where(recipe => recipe.LastCookedDate != null ||
                (recipe.LastCookedDate == null && (recipe.CreatedAt < position.CreatedAt ||
                    (recipe.CreatedAt == position.CreatedAt && recipe.Id.CompareTo(position.Id) > 0))))
            : recipes.Where(recipe => recipe.LastCookedDate != null &&
                (recipe.LastCookedDate > position.LastCookedDate ||
                    (recipe.LastCookedDate == position.LastCookedDate && (recipe.CreatedAt < position.CreatedAt ||
                        (recipe.CreatedAt == position.CreatedAt && recipe.Id.CompareTo(position.Id) > 0)))));

    private static IQueryable<Recipe> ApplyBrowseQuickEligibility(IQueryable<Recipe> recipes, RecipeSearchFiltersDto filters) =>
        filters.QuickOnly == true
            ? recipes.Where(recipe => recipe.TotalTime != null && Regex.IsMatch(recipe.TotalTime, QuickRecipePattern, RegexOptions.IgnoreCase))
            : recipes;

    private static IQueryable<Recipe> BrowseProjection(IQueryable<Recipe> recipes) => recipes.Select(recipe => new Recipe
    {
        Id = recipe.Id,
        Name = recipe.Name,
        Description = recipe.Description,
        TotalTime = recipe.TotalTime,
        Rating = recipe.Rating,
        IsDiscoverable = recipe.IsDiscoverable,
        Notes = recipe.Notes,
        CreatedAt = recipe.CreatedAt,
        LastCookedDate = recipe.LastCookedDate
    });

    private async Task<List<BrowseRankedRecipe>> GetBrowseRankedRecipesAsync(
        IQueryable<Recipe> recipesQuery,
        RecipeSearchFiltersDto filters,
        int? selectedWeekOffset,
        CancellationToken ct)
    {
        var now = _clock.UtcNow;
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var weekOffset = selectedWeekOffset ?? 0;
        var (monday, sunday) = GetWeekBounds(weekOffset, today);
        var intervalStart = today.AddDays(-(_filterOptions?.RediscoveryIntervalDays ?? RecipeSearchFilterOptions.DefaultRediscoveryIntervalDays));
        var recipes = await BrowseProjection(ApplyBrowseQuickEligibility(recipesQuery, filters)).ToListAsync(ct);
        var recipeIds = recipes.Select(recipe => recipe.Id).ToArray();
        var facts = await db.RecipeSearchAffinityFacts.AsNoTracking()
            .Where(fact => recipeIds.Contains(fact.RecipeId))
            .ToDictionaryAsync(fact => fact.RecipeId, ct);
        var blocked = await db.CalendarEvents.AsNoTracking()
            .Where(@event => @event.RecipeId != null && recipeIds.Contains(@event.RecipeId.Value) &&
                ((@event.Date >= today && (@event.Status == CalendarEventStatus.Planned || @event.Status == CalendarEventStatus.Locked || @event.Status == CalendarEventStatus.AwaitingConsensus)) ||
                 (@event.Date >= monday && @event.Date <= sunday && @event.Status == CalendarEventStatus.Cooked)))
            .Select(@event => @event.RecipeId!.Value)
            .ToHashSetAsync(ct);

        return recipes
            .Select(recipe =>
            {
                facts.TryGetValue(recipe.Id, out var fact);
                var calendarEligible = !blocked.Contains(recipe.Id);
                var eligible = calendarEligible && fact is { Affinity: > 0, LastCookedOn: not null } && fact.LastCookedOn <= intervalStart;
                return new BrowseRankedRecipe(recipe, fact?.Affinity ?? 0, fact?.LastCookedOn, eligible, calendarEligible);
            })
            .OrderByDescending(candidate => candidate.IsPromotionEligible)
            .ThenByDescending(candidate => candidate.IsPromotionEligible ? candidate.Affinity : 0)
            .ThenBy(candidate => candidate.IsPromotionEligible ? candidate.AffinityLastCookedOn : null)
            .ThenBy(candidate => candidate.Recipe.LastCookedDate.HasValue ? 1 : 0)
            .ThenBy(candidate => candidate.Recipe.LastCookedDate)
            .ThenByDescending(candidate => candidate.Recipe.CreatedAt)
            .ThenBy(candidate => candidate.Recipe.Id)
            .ToList();
    }

    private static (DateOnly Monday, DateOnly Sunday) GetWeekBounds(int weekOffset, DateOnly today)
    {
        var monday = today.AddDays(-((int)today.DayOfWeek + 6) % 7 + weekOffset * 7);
        return (monday, monday.AddDays(6));
    }

    private async Task<Dictionary<Guid, RecipeImportReportStatus>> GetReportStatusesAsync(IEnumerable<Guid> recipeIds, CancellationToken ct)
    {
        var ids = recipeIds.Distinct().ToArray();
        return ids.Length == 0
            ? []
            : await db.RecipeImportReports.AsNoTracking().Where(report => ids.Contains(report.RecipeId))
                .ToDictionaryAsync(report => report.RecipeId, report => report.Status, ct);
    }

    private static string CreateContinuationFingerprint(RecipeSearchRequestDto dto, string query)
    {
        var serialized = JsonSerializer.Serialize(new { query, dto.SimilarToRecipeId, dto.PantrySnapshotId, dto.WeekOffset, dto.DayIndex, dto.Filters, dto.Preferences }, JsonDefaults.CamelCase);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(serialized)));
    }

    private static string[] NormalizeConcepts(IEnumerable<string>? concepts) => concepts?
        .Where(concept => !string.IsNullOrWhiteSpace(concept))
        .Select(concept => concept.Trim())
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray() ?? [];

    private static string CreateSemanticQuery(string query, IEnumerable<string> concepts) => string.Join(
        " ",
        new[] { query }.Concat(concepts).Where(value => !string.IsNullOrWhiteSpace(value)));

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
                }]))
            .ToList();

        return candidates;
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
                if (isPlanned)
                {
                    var reasons = candidate.Reasons.ToList();
                    reasons.Add(new RecipeSearchReasonDto
                    {
                        Source = "planner-fit",
                        Label = "Already planned for this week"
                    });
                    return candidate with { Score = candidate.Score + PlannedDemotion, Reasons = reasons, ScoreComponents = WithComponents(candidate.ScoreComponents, ("schedule.already-planned", PlannedDemotion)) };
                }
                return candidate;
            })
            .ToList();

        return reranked;
    }


    private static RecipeSearchResultDto MapResult(
        RankedRecipe candidate,
        IReadOnlyDictionary<Guid, RecipeImportReportStatus> reportStatuses,
        bool isPromotionEligible = false)
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
            ImportIssueStatus = reportStatuses.TryGetValue(recipe.Id, out var status)
                ? status == RecipeImportReportStatus.ReadyToReview ? "readyToReview" : "reported"
                : null,
            IsPromotionEligible = isPromotionEligible
        };
    }


    private static string Normalize(string? value) => RecipeSearchDocumentBuilder.Normalize(value) ?? string.Empty;

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
                    [new RecipeSearchReasonDto { Source = "semantic-match", Label = "Similar to original" }]))
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
        if (lexicalRepository is null)
        {
            if (db.Database.IsRelational())
                throw new InvalidOperationException("Database lexical retrieval must be registered.");

            // The integration factory uses EF's in-memory provider, which cannot execute
            // PostgreSQL's trigram query. This branch is deliberately unavailable to
            // relational serving and keeps the public endpoint testable there.
            var recipes = await recipesQuery.ToListAsync(ct);
            return BuildInMemoryTestCandidates(recipes, query).Take(LexicalCandidateLimit).ToList();
        }

        var repository = lexicalRepository;
        var databaseCandidates = await repository.SearchAsync(query, filters ?? new RecipeSearchFiltersDto(), LexicalCandidateLimit, ct);
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
                new Dictionary<string, double> { ["retrieval.lexical.raw"] = candidate.Score }))
            .ToList();
    }

    private static List<RankedRecipe> BuildInMemoryTestCandidates(IEnumerable<Recipe> recipes, string query)
    {
        var normalizedQuery = Normalize(query);
        return recipes
            .Select(recipe =>
            {
                var normalizedName = Normalize(recipe.Name);
                var normalizedNotes = Normalize(recipe.Notes);
                var normalizedDocument = Normalize($"{recipe.Name}. {recipe.Description}. {recipe.Ingredients}. {recipe.Notes}.");
                var nameScore = TrigramSimilarity(normalizedQuery, normalizedName);
                var notesScore = TrigramSimilarity(normalizedQuery, normalizedNotes);
                var score = Math.Max(nameScore, Math.Max(notesScore, TrigramSimilarity(normalizedQuery, normalizedDocument)));
                var reasons = new List<RecipeSearchReasonDto>();
                if (nameScore >= 0.3)
                    reasons.Add(new RecipeSearchReasonDto { Source = "name-match", Label = "Name matches your search" });
                if (notesScore >= 0.3)
                {
                    score += 0.10;
                    reasons.Add(new RecipeSearchReasonDto { Source = "notes-match", Label = "Your notes mention this" });
                }
                if (reasons.Count == 0)
                    reasons.Add(new RecipeSearchReasonDto { Source = "name-match", Label = "Matches your search" });
                return new RankedRecipe(recipe, score, reasons, new Dictionary<string, double> { ["retrieval.lexical.raw"] = score });
            })
            .Where(candidate => candidate.Score >= 0.15)
            .OrderByDescending(candidate => candidate.Score)
            .ThenByDescending(candidate => candidate.Recipe.CreatedAt)
            .ToList();
    }

    private static double TrigramSimilarity(string left, string right)
    {
        if (string.IsNullOrWhiteSpace(left) || string.IsNullOrWhiteSpace(right)) return 0;
        if (right.Contains(left, StringComparison.Ordinal)) return 1;
        var leftTrigrams = BuildTrigrams(left);
        var rightTrigrams = BuildTrigrams(right);
        return leftTrigrams.Count == 0 || rightTrigrams.Count == 0
            ? 0
            : (2d * leftTrigrams.Intersect(rightTrigrams).Count()) / (leftTrigrams.Count + rightTrigrams.Count);
    }

    private static HashSet<string> BuildTrigrams(string value)
    {
        var padded = $"  {value}  ";
        var trigrams = new HashSet<string>();
        for (var index = 0; index <= padded.Length - 3; index++) trigrams.Add(padded.Substring(index, 3));
        return trigrams;
    }

    private async Task<SearchIndexCoverage> GetIndexCoverageAsync(CancellationToken ct)
    {
        var eligibleRecipeCount = await db.Recipes.AsNoTracking()
            .CountAsync(recipe => recipe.DeletedAt == null && recipe.IsReady, ct);
        var readyDocuments = db.RecipeSearchDocuments.AsNoTracking()
            .Join(db.Recipes.AsNoTracking(), document => document.RecipeId, recipe => recipe.Id, (document, recipe) => new { document, recipe })
            .Where(item => item.recipe.DeletedAt == null && item.recipe.IsReady && item.document.IndexStatus == "ready");
        var readyDocumentCount = await readyDocuments.CountAsync(ct);
        var readyEmbeddingCount = await readyDocuments
            .CountAsync(item => item.document.EmbeddingStatus == "ready" && item.document.EmbeddingFingerprint == item.document.SourceFingerprint, ct);
        return new SearchIndexCoverage(eligibleRecipeCount, readyDocumentCount, readyEmbeddingCount);
    }

    private static string GetLatencyPopulation(string resultPath) => resultPath switch
    {
        "hybrid" => "hybrid",
        "fallback-lexical" => "semantic-failure-fallback",
        _ => "lexical-only"
    };

    private static string GetTelemetryPath(string resultPath) => resultPath switch
    {
        "lexical-only" => "lexical",
        _ => resultPath
    };

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

            var recipeIngredients = RecipeService.DeserializeIngredients(ingredientsJson)
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

    private sealed record BrowseRankedRecipe(
        Recipe Recipe,
        int Affinity,
        DateOnly? AffinityLastCookedOn,
        bool IsPromotionEligible,
        bool IsCalendarEligible);

    private sealed record RankedRecipe(
        Recipe Recipe,
        double Score,
        List<RecipeSearchReasonDto> Reasons,
        IReadOnlyDictionary<string, double>? ScoreComponents = null);

    private sealed record SearchIndexCoverage(
        int EligibleRecipeCount,
        int ReadyDocumentCount,
        int ReadyEmbeddingCount);
}
