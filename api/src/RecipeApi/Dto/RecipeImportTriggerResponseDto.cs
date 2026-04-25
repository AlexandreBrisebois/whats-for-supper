using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeImportTriggerResponseDto
{
    [JsonPropertyName("importId")]
    public Guid ImportId { get; set; }
}
