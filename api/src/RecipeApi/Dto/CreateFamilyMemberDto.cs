using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class CreateFamilyMemberDto
{
    [Required]
    [MaxLength(100)]
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}
