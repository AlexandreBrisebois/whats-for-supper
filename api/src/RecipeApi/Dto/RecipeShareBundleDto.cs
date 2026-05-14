using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeShareBundleDto
{
    [Required]
    [JsonPropertyName("version")]
    public required string Version { get; set; }

    [Required]
    [JsonPropertyName("recipe")]
    public required ImportedRecipeDto Recipe { get; set; }

    [Required]
    [JsonPropertyName("info")]
    public required RecipeShareInfoDto Info { get; set; }

    [JsonPropertyName("hero")]
    public SharedImageDto? Hero { get; set; }

    [JsonPropertyName("originals")]
    public List<SharedImageDto> Originals { get; set; } = [];
}
