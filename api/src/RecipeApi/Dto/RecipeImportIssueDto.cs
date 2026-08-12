using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeImportIssueRequest
{
    [Required]
    [JsonPropertyName("reasons")]
    public string[] Reasons { get; set; } = [];

    [MaxLength(500)]
    [JsonPropertyName("note")]
    public string? Note { get; set; }
}

public class RecipeImportIssueDto
{
    [JsonPropertyName("reasons")]
    public required string[] Reasons { get; set; }

    [JsonPropertyName("note")]
    public required string? Note { get; set; }

    [JsonPropertyName("status")]
    public required string Status { get; set; }
}
