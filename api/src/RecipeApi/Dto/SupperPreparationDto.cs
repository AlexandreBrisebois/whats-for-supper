using System.Text.Json.Serialization;
namespace RecipeApi.Dto;

public record SupperPreparationDto
{
    [JsonPropertyName("preparedOn")] public required DateOnly PreparedOn { get; init; }
    [JsonPropertyName("preparedAtUtc")] public required DateTimeOffset PreparedAtUtc { get; init; }
    [JsonPropertyName("servings")] public required int? Servings { get; init; }
    [JsonPropertyName("portionContext")] public required string PortionContext { get; init; }
    [JsonPropertyName("originalServings")] public required int? OriginalServings { get; init; }
    [JsonPropertyName("planToken")] public required string PlanToken { get; init; }
    [JsonPropertyName("servingVersion")] public required string ServingVersion { get; init; }
}
public record PrepareSupperRequestDto(Guid ExpectedOccurrenceId, Guid RecipeId, string ExpectedPlanToken, string ExpectedServingVersion);
public record PrepareSupperResultDto(Guid OccurrenceId, Guid RecipeId, DateOnly SupperDate, SupperPreparationDto Preparation);
