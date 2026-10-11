using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public record NonCookingPlanDto(
    [property: JsonPropertyName("kind")] string Kind,
    [property: JsonPropertyName("customLabel")] string? CustomLabel = null);
