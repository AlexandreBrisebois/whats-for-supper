namespace RecipeApi.Dto;

public record PreSelectedRecipeDto(
    Guid RecipeId,
    string? Name,
    string HeroImageUrl,
    int VoteCount,
    bool UnanimousVote,
    int DayIndex,
    bool IsLocked
);

public record OpenSlotDto(int DayIndex);

public record SmartDefaultsDto(
    int WeekOffset,
    int FamilySize,
    int ConsensusThreshold,
    List<PreSelectedRecipeDto> PreSelectedRecipes,
    List<OpenSlotDto> OpenSlots,
    int ConsensusRecipesCount
);
