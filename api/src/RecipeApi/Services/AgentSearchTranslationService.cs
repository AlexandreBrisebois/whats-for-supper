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
            "notCookedInLongTime": <true or omit>
          }
        }

        Rules:
        - "query" should be 1-5 keywords distilled from the intent.
        - Only include filter fields that clearly apply. Omit the rest.
        - Never invent recipe names. Never respond with a chat message.
        - If the intent is unclear, return {"query": "<original text>", "filters": {}}.
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
            NotCookedInLongTime = filters.NotCookedInLongTime
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
    }
}
