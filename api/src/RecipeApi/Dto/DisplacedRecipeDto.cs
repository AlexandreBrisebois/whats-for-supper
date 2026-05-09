using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public record DisplacedRecipeDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("movedToWeekOffset")] int MovedToWeekOffset,
    [property: JsonPropertyName("movedToDayIndex")] int MovedToDayIndex);
