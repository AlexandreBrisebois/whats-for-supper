using System.Text.Json.Serialization;
using RecipeApi.Services;

namespace RecipeApi.Dto;

/// <summary>Materialized vocabulary served to the Search filter sheet.</summary>
public sealed class RecipeSearchFilterDiscoveryDto
{
    public static readonly string[] FixedMealTypes = ["Supper", "Lunch", "Breakfast", "Dessert"];

    [JsonPropertyName("generatedAt")]
    public required DateTimeOffset? GeneratedAt { get; init; }

    [JsonPropertyName("main")]
    public required List<RecipeSearchMainDefinitionDto> Main { get; init; }

    [JsonPropertyName("mealTypes")]
    public required List<string> MealTypes { get; init; }

    [JsonPropertyName("cuisines")]
    public required RecipeSearchCuisineOptionsDto Cuisines { get; init; }

    /// <summary>Safe response when Dreaming has not produced cuisine state.</summary>
    public static RecipeSearchFilterDiscoveryDto CreateFallback(RecipeSearchFilterOptions options) => new()
    {
        GeneratedAt = null,
        Main = options.Main.Select(definition => new RecipeSearchMainDefinitionDto
        {
            Id = definition.Id,
            Concept = definition.Concept,
            Label = definition.Label
        }).ToList(),
        MealTypes = [.. FixedMealTypes],
        Cuisines = new RecipeSearchCuisineOptionsDto { Promoted = [], All = [] }
    };
}

public sealed class RecipeSearchMainDefinitionDto
{
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    [JsonPropertyName("concept")]
    public required string Concept { get; init; }

    /// <summary>Only custom Main IDs carry a configured display label.</summary>
    [JsonPropertyName("label")]
    public string? Label { get; init; }
}

public sealed class RecipeSearchCuisineOptionsDto
{
    [JsonPropertyName("promoted")]
    public required List<string> Promoted { get; init; }

    [JsonPropertyName("all")]
    public required List<string> All { get; init; }
}
