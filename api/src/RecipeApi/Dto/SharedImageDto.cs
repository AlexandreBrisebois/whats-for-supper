using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class SharedImageDto
{
    [Required]
    [JsonPropertyName("mimeType")]
    public required string MimeType { get; set; }

    [Required]
    [JsonPropertyName("base64")]
    public required string Base64 { get; set; }
}
