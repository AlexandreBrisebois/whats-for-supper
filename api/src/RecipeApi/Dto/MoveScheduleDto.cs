using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public record MoveScheduleDto(
    [property: JsonPropertyName("weekOffset")] int WeekOffset,
    [property: JsonPropertyName("recipeId")] Guid RecipeId,
    [property: JsonPropertyName("toIndex")] int? ToIndex = null,
    [property: JsonPropertyName("intent")] string? Intent = "swap",
    [property: JsonPropertyName("targetWeekOffset")] int? TargetWeekOffset = null,
    [property: JsonPropertyName("fromIndex")] int? FromIndex = null,
    [property: JsonPropertyName("sourceDisposition")] string? SourceDisposition = null,
    [property: JsonPropertyName("sourceNonCooking")] NonCookingPlanDto? SourceNonCooking = null,
    [property: JsonPropertyName("sourceDate")] DateOnly? SourceDate = null,
    [property: JsonPropertyName("cookedDisposition")] string? CookedDisposition = null);


public sealed record MoveScheduleResultDto(
    string Message,
    bool Moved,
    DateOnly SourceDate,
    DateOnly DestinationDate,
    IReadOnlyList<DateOnly> AffectedWeekStartDates,
    bool RefreshComplete,
    int? ScheduledWeekOffset = null);

public sealed class TomorrowMoveConflictException(string message) : Exception(message);

public sealed class DeferScheduleConflictException(string message) : Exception(message);
