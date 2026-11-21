using System.Text.Json;
using System.Text.Json.Serialization;
namespace RecipeApi.Dto;

public record SupperServingDayDto(DateOnly Date, int? Servings, int? OverrideServings, bool Editable);
public record ServingGroceryRefreshDto(
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("version")] string Version,
    [property: JsonPropertyName("appliedVersion")] string? AppliedVersion,
    [property: JsonPropertyName("resetSummaryVersion")] string? ResetSummaryVersion,
    [property: JsonPropertyName("workflowId")] Guid? WorkflowId);
public record SupperServingsDto
{
    public required DateOnly ReferenceWeekStartDate { get; set; }
    public required int WeekOffset { get; set; }
    public required DateOnly WeekStartDate { get; set; }
    public required int? DefaultServings { get; set; }
    public required string DefaultServingsSource { get; set; }
    public required string Version { get; set; }
    public required List<SupperServingDayDto> Days { get; set; }
    public required ServingGroceryRefreshDto GroceryRefresh { get; set; }
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public DateOnly[]? AffectedWeekStartDates { get; set; }
}

public record SupperServingChangeDto(DateOnly Date, JsonElement Servings);
// JsonElement intentionally preserves undefined versus explicit null at this sparse boundary.
public record SupperServingsSaveDto(DateOnly ReferenceWeekStartDate, int WeekOffset, string ExpectedVersion, List<SupperServingChangeDto>? Days, JsonElement DefaultServings);
public record SupperServingsRefreshDto(List<DateOnly>? WeekStartDates);
