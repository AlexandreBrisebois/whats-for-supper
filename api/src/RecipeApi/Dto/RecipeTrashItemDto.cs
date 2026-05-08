using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeTrashItemDto
{
    [JsonPropertyName("id")]
    public required Guid Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("deletedAt")]
    public required DateTimeOffset DeletedAt { get; set; }

    [JsonPropertyName("deletedBy")]
    public Guid? DeletedBy { get; set; }
}
