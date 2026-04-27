using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class UpdateFamilyMemberDto
{
    [JsonPropertyName("name")]
    public required string Name { get; set; }
}
