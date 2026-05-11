using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class UpdateFamilyMemberPreferencesDto
{
    [JsonPropertyName("browseViewMode")]
    public string? BrowseViewMode { get; set; }

    [JsonPropertyName("preferredLanguage")]
    public string? PreferredLanguage { get; set; }
}
