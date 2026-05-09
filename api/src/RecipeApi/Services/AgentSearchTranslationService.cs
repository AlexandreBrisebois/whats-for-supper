using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.AI;
using RecipeApi.Dto;
#pragma warning disable CS8601

namespace RecipeApi.Services;

/// <summary>
/// Thin server-side translation layer for agent-mode search.
/// Receives a free-form query with mode="agent" and asks the LLM to rewrite it
/// into a structured RecipeSearchRequestDto. The translated request then flows
/// through the identical RecipeSearchService pipeline — no fork in ranking logic.
/// </summary>
public class AgentSearchTranslationService(IChatClient chatClient)
{
    private static readonly string SystemPrompt =
        """
        You are a recipe search query translator. Given a free-form natural-language
        request for a recipe, extract a structured search intent.

        Respond ONLY with valid JSON in this exact shape (no markdown, no preamble):
        {
          "query": "<concise keyword query, may be empty string>",
          "filters": {
            "quickOnly": <true or omit>,
            "neverCooked": <true or omit>,
            "familyFavorite": <true or omit>,
            "newRecipes": <true or omit>,
            "notCookedInLongTime": <true or omit>,
            "healthyOnly": <true or omit>
          }
        }

        Rules:
        - "query" should be 1-3 CONCISE keywords distilled from the intent (e.g. "spicy pasta", not "I want a spicy pasta dish").
        - Only include filter fields that clearly apply. Omit the rest.
        - Never invent recipe names. Never respond with a chat message.
        - If the intent is unclear, return {"query": "<original text>", "filters": {}}.
        """;

    private static readonly string RerankPrompt =
        """
        You are a master chef and personal dietician. You are helping a user pick the best
        recipe from a short list of candidates based on their specific request.

        Original User Request: {0}
        
        Planned for this week (Avoid repeating these if possible):
        {1}
        
        Dietary Goals for this week:
        {2}

        Candidate Recipes:
        {3}

        Respond ONLY with valid JSON in this exact shape:
        {
          "selectedRecipeId": "<guid>",
          "reason": "<short, engaging 1-sentence explanation of why this was picked>"
        }
        """;

    public async Task<RecipeSearchRequestDto> TranslateAsync(
        RecipeSearchRequestDto input,
        CancellationToken ct = default)
    {
        var prompt = $"{SystemPrompt}\n\nUser query: {input.Query ?? string.Empty}";

        try
        {
            var completion = await chatClient.GetResponseAsync(prompt, cancellationToken: ct);
            var responseText = completion.Text?.Trim() ?? string.Empty;

            var parsed = JsonSerializer.Deserialize<AgentTranslationResult>(
                responseText,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (parsed is null)
            {
                return FallbackRequest(input);
            }

            return new RecipeSearchRequestDto
            {
                Query = parsed.Query ?? input.Query,
                Mode = "agent",
                Filters = BuildFilters(parsed.Filters),
                WeekOffset = input.WeekOffset,
                DayIndex = input.DayIndex,
                SimilarToRecipeId = input.SimilarToRecipeId,
                PantrySnapshotId = input.PantrySnapshotId,
                Limit = input.Limit
            };
        }
        catch (Exception)
        {
            return FallbackRequest(input);
        }
    }

    /// <summary>
    /// RAG Pass: Takes the original natural language query and the top candidates
    /// from retrieval, and asks the LLM to select the absolute best fit.
    /// </summary>
    public async Task<(Guid? SelectedId, string? Reason)> RerankAsync(
        string originalQuery,
        List<RecipeSearchResultDto> candidates,
        List<string>? weekContext = null,
        List<string>? recommendations = null,
        CancellationToken ct = default)
    {
        if (candidates.Count == 0) return (null, null);

        var candidateList = string.Join("\n", candidates.Select(c =>
            $"- [{c.Id}] {c.Name}: {c.Description} (Match Score: {c.Score:F2})"));

        var plannedList = (weekContext == null || weekContext.Count == 0)
            ? "Nothing planned yet."
            : string.Join(", ", weekContext);

        var goalsList = (recommendations == null || recommendations.Count == 0)
            ? "All dietary targets met! Focus on variety."
            : string.Join("\n- ", recommendations);

        var prompt = string.Format(RerankPrompt, originalQuery, plannedList, goalsList, candidateList);

        try
        {
            var completion = await chatClient.GetResponseAsync(prompt, cancellationToken: ct);
            var responseText = completion.Text?.Trim() ?? string.Empty;

            var parsed = JsonSerializer.Deserialize<AgentRerankResult>(
                responseText,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return (parsed?.SelectedRecipeId, parsed?.Reason);
        }
        catch (Exception)
        {
            // If re-ranking fails, let the caller fall back to the first candidate
            return (null, null);
        }
    }

    private static RecipeSearchRequestDto FallbackRequest(RecipeSearchRequestDto input) =>
        new()
        {
            Query = input.Query,
            Mode = "agent",
            Filters = input.Filters,
            WeekOffset = input.WeekOffset,
            DayIndex = input.DayIndex,
            SimilarToRecipeId = input.SimilarToRecipeId,
            PantrySnapshotId = input.PantrySnapshotId,
            Limit = input.Limit
        };

    private static RecipeSearchFiltersDto? BuildFilters(AgentTranslationFilters? filters)
    {
        if (filters is null) return null;
        var dto = new RecipeSearchFiltersDto
        {
            QuickOnly = filters.QuickOnly,
            NeverCooked = filters.NeverCooked,
            FamilyFavorite = filters.FamilyFavorite,
            NewRecipes = filters.NewRecipes,
            NotCookedInLongTime = filters.NotCookedInLongTime,
            HealthyOnly = filters.HealthyOnly
        };
        return dto;
    }

    private sealed class AgentTranslationResult
    {
        [JsonPropertyName("query")]
        public string? Query { get; set; }

        [JsonPropertyName("filters")]
        public AgentTranslationFilters? Filters { get; set; }
    }

    private sealed class AgentTranslationFilters
    {
        [JsonPropertyName("quickOnly")]
        public bool? QuickOnly { get; set; }

        [JsonPropertyName("neverCooked")]
        public bool? NeverCooked { get; set; }

        [JsonPropertyName("familyFavorite")]
        public bool? FamilyFavorite { get; set; }

        [JsonPropertyName("newRecipes")]
        public bool? NewRecipes { get; set; }

        [JsonPropertyName("notCookedInLongTime")]
        public bool? NotCookedInLongTime { get; set; }

        [JsonPropertyName("healthyOnly")]
        public bool? HealthyOnly { get; set; }
    }

    private sealed class AgentRerankResult
    {
        [JsonPropertyName("selectedRecipeId")]
        public Guid? SelectedRecipeId { get; set; }

        [JsonPropertyName("reason")]
        public string? Reason { get; set; }
    }
}
