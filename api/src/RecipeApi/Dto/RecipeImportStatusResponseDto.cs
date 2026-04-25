using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeImportStatusResponseDto
{
    [JsonPropertyName("status")]
    public required string Status { get; set; } = string.Empty;

    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }
}
