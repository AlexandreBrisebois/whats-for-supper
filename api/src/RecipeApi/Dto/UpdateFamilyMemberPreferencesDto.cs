using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class UpdateFamilyMemberPreferencesDto
{
    [JsonPropertyName("browseViewMode")]
    public required string BrowseViewMode { get; set; }
}
