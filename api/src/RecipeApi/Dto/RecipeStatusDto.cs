using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

/// <summary>
/// Response for GET /api/recipes/{id}/status.
/// Reports whether a recipe is still being synthesised ("pending") or fully ready ("ready").
/// </summary>
public record RecipeStatusDto
{
    [JsonPropertyName("id")]
    public required Guid Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    /// <summary>"pending" while synthesis is in progress; "ready" once complete.</summary>
    [JsonPropertyName("status")]
    public required string Status { get; init; }

    [JsonPropertyName("imageCount")]
    public required int ImageCount { get; init; }
}
