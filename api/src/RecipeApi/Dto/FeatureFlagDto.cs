namespace RecipeApi.Dto;

public record FeatureFlagDto(
    string Key,
    bool Enabled,
    string Mode,
    bool? MemberEnabled = null,
    string? DisplayName = null,
    string? Description = null);

public record FeatureFlagListDto(IReadOnlyList<FeatureFlagDto> Items);

public record UpdateFeatureFlagRequest(bool Enabled);
