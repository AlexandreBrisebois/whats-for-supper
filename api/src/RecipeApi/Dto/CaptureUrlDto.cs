using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class CaptureUrlDto
{
    [Required]
    [Url]
    [JsonPropertyName("url")]
    public required string Url { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("rating")]
    [Range(0, 3)]
    public int? Rating { get; set; }
}
