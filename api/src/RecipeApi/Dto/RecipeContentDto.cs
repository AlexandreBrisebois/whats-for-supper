using System.Text.Json;
using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

// Exact quantities intentionally share the existing scalar/range wire representation.
public sealed record RecipeUnitDto(
    [property: JsonPropertyName("text")] string Text,
    [property: JsonPropertyName("definitionId"), JsonRequired] string? DefinitionId);

public sealed record RecipePackageCapacityDto(
    [property: JsonPropertyName("amount")] GroceryQuantity Amount,
    [property: JsonPropertyName("unit")] RecipeUnitDto Unit);

public sealed record RecipePackageDto(
    [property: JsonPropertyName("countUnit")] RecipeUnitDto CountUnit,
    [property: JsonPropertyName("capacity")] RecipePackageCapacityDto Capacity,
    [property: JsonPropertyName("basis")] string Basis);

public sealed record RecipeShoppingAssociationDto(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("foodId"), JsonRequired] Guid? FoodId,
    [property: JsonPropertyName("mappingRevision"), JsonRequired] string? MappingRevision);

public sealed record RecipeIngredientProvenanceDto(
    [property: JsonPropertyName("origin")] string Origin,
    [property: JsonPropertyName("sourceRef"), JsonRequired] string? SourceRef,
    [property: JsonPropertyName("protectedFields")] IReadOnlyList<string> ProtectedFields);

public record RecipeIngredientFactsDto
{
    [JsonPropertyName("description")] public required string Description { get; init; }
    [JsonPropertyName("amount")] public required GroceryQuantity? Amount { get; init; }
    [JsonPropertyName("amountText")] public required string? AmountText { get; init; }
    [JsonPropertyName("unit")] public required RecipeUnitDto? Unit { get; init; }
    [JsonPropertyName("scaling")] public required string Scaling { get; init; }
    [JsonPropertyName("package")] public required RecipePackageDto? Package { get; init; }
    [JsonPropertyName("shopping")] public required RecipeShoppingAssociationDto Shopping { get; init; }
}

public sealed record RecipeIngredientLineDto : RecipeIngredientFactsDto
{
    [JsonPropertyName("id")] public required Guid Id { get; init; }
    [JsonPropertyName("provenance")] public required RecipeIngredientProvenanceDto Provenance { get; init; }
}

public sealed record RecipeIngredientLineInput : RecipeIngredientFactsDto
{
    [JsonPropertyName("id"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public Guid? Id { get; init; }
    [JsonPropertyName("clientId"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public string? ClientId { get; init; }
}

public sealed record RecipeInstructionStepDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("text")] string Text,
    [property: JsonPropertyName("textRevision")] string TextRevision,
    [property: JsonPropertyName("bindings")] IReadOnlyList<JsonElement> Bindings);

public sealed record RecipeInstructionSectionDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("name"), JsonRequired] string? Name,
    [property: JsonPropertyName("steps")] IReadOnlyList<RecipeInstructionStepDto> Steps);

public sealed record RecipeContentConflictDto(
    [property: JsonPropertyName("code")] string Code,
    [property: JsonPropertyName("currentContentRevision")] string CurrentContentRevision,
    [property: JsonPropertyName("upgradeRequired")] bool UpgradeRequired);
