using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class PhotoSearchResponseDto
{
    [JsonPropertyName("intent")]
    public string Intent { get; set; } = "inventory";

    [JsonPropertyName("query")]
    public string Query { get; set; } = string.Empty;

    [JsonPropertyName("inferredIngredients")]
    public IReadOnlyList<string> InferredIngredients { get; set; } = [];

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; }

    [JsonPropertyName("pantrySnapshotId")]
    public Guid? PantrySnapshotId { get; set; }
}
