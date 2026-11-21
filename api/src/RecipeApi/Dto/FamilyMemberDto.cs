using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class FamilyMemberDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("browseViewMode")]
    public required string BrowseViewMode { get; set; }

    [JsonPropertyName("preferredLanguage")]
    public string? PreferredLanguage { get; set; }

    [JsonPropertyName("cookingViewMode")]
    public string? CookingViewMode { get; set; }

    [JsonPropertyName("contrastMode")]
    public string? ContrastMode { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; }
}
