using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeDetailResponseDto
{
    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; }

    [JsonPropertyName("createdIds"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IReadOnlyDictionary<string, Guid>? CreatedIds { get; set; }

    [JsonPropertyName("recipe")]
    public RecipeDto Recipe { get; set; } = null!;
}
