using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public sealed record GroceryItemMutationDto(Guid? RowId, DateOnly? WeekStartDate, string? ExpectedRowVersion, bool? Checked, Guid? ClientMutationId);
public sealed record GroceryBulkMutationDto(DateOnly? WeekStartDate, string? ExpectedListVersion, Dictionary<string, bool>? Checks, Guid? ClientMutationId);

public sealed record GroceryMutationResult(
    [property: JsonPropertyName("updatedAt")] DateTimeOffset UpdatedAt,
    [property: JsonPropertyName("weekStartDate")] DateOnly WeekStartDate,
    [property: JsonPropertyName("listVersion")] string ListVersion,
    [property: JsonPropertyName("checks")] Dictionary<string, bool> Checks,
    [property: JsonPropertyName("rows")] List<GroceryLineItemDto> Rows,
    [property: JsonPropertyName("rowId"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? RowId = null,
    [property: JsonPropertyName("rowVersion"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? RowVersion = null,
    [property: JsonPropertyName("checked"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] bool? Checked = null)
{
    [JsonPropertyName("presentationVersion")] public string PresentationVersion { get; init; } = "0";
    [JsonPropertyName("presentationEpoch")] public Guid PresentationEpoch { get; init; }
}

public sealed record GroceryMutationReceipt(string InputHash, GroceryMutationResult Outcome);
