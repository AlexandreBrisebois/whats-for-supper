using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public record MoveScheduleDto(
    [property: JsonPropertyName("weekOffset")] int WeekOffset,
    [property: JsonPropertyName("recipeId")] Guid RecipeId,
    [property: JsonPropertyName("toIndex")] int ToIndex,
    [property: JsonPropertyName("intent")] string? Intent = "swap",
    [property: JsonPropertyName("targetWeekOffset")] int? TargetWeekOffset = null,
    [property: JsonPropertyName("fromIndex")] int? FromIndex = null);
