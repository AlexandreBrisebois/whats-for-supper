using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public sealed record DeploymentCalendarContext(
    [property: JsonPropertyName("timeZone")] string TimeZone,
    [property: JsonPropertyName("capturedAtUtc")] DateTimeOffset CapturedAtUtc,
    [property: JsonPropertyName("today")] DateOnly Today,
    [property: JsonPropertyName("currentWeekStartDate")] DateOnly CurrentWeekStartDate,
    [property: JsonPropertyName("referenceWeekStartDate")] DateOnly ReferenceWeekStartDate,
    [property: JsonPropertyName("nextDayAtUtc")] DateTimeOffset NextDayAtUtc)
{
    public DateOnly WeekStart(int offset) => ReferenceWeekStartDate.AddDays(checked(offset * 7));
}
