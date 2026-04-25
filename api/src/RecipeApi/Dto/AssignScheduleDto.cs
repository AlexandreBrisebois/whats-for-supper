using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public record AssignScheduleDto(
    [property: JsonPropertyName("weekOffset")] int WeekOffset,
    [property: JsonPropertyName("dayIndex")] int DayIndex,
    [property: JsonPropertyName("recipeId")] Guid RecipeId);
