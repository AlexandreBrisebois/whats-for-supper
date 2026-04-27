using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class BulkImportTriggerResponseDto
{
    [JsonPropertyName("queuedCount")]
    public int QueuedCount { get; set; }

    [JsonPropertyName("instanceIds")]
    public List<Guid> InstanceIds { get; set; } = [];
}
