using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public record DeferScheduleDto(
    [property: JsonPropertyName("sourceDate")] DateOnly SourceDate,
    [property: JsonPropertyName("recipeId")] Guid RecipeId);

public record DeferScheduleResultDto(
    [property: JsonPropertyName("scheduledDate")] DateOnly ScheduledDate,
    [property: JsonPropertyName("scheduledWeekOffset")] int ScheduledWeekOffset,
    [property: JsonPropertyName("message")] string Message);

public sealed class DeferScheduleConflictException(string message) : Exception(message);
