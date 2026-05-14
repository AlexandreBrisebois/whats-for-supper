using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeShareInfoDto
{
    [Required]
    [JsonPropertyName("exportedAtUtc")]
    public DateTimeOffset ExportedAtUtc { get; set; }

    [Required]
    [JsonPropertyName("bundleSource")]
    public required string BundleSource { get; set; }

    [JsonPropertyName("appVersion")]
    public string? AppVersion { get; set; }
}
