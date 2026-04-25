using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public record PreSelectedRecipeDto(
    [property: JsonPropertyName("recipeId")] Guid RecipeId,
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("heroImageUrl")] string HeroImageUrl,
    [property: JsonPropertyName("voteCount")] int VoteCount,
    [property: JsonPropertyName("familySize")] int FamilySize,
    [property: JsonPropertyName("unanimousVote")] bool UnanimousVote,
    [property: JsonPropertyName("dayIndex")] int DayIndex,
    [property: JsonPropertyName("isLocked")] bool IsLocked
);

public record OpenSlotDto([property: JsonPropertyName("dayIndex")] int DayIndex);

public record SmartDefaultsDto(
    [property: JsonPropertyName("weekOffset")] int WeekOffset,
    [property: JsonPropertyName("familySize")] int FamilySize,
    [property: JsonPropertyName("consensusThreshold")] int ConsensusThreshold,
    [property: JsonPropertyName("preSelectedRecipes")] List<PreSelectedRecipeDto> PreSelectedRecipes,
    [property: JsonPropertyName("openSlots")] List<OpenSlotDto> OpenSlots,
    [property: JsonPropertyName("consensusRecipesCount")] int ConsensusRecipesCount
);
