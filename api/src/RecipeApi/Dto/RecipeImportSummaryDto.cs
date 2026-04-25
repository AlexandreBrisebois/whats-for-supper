using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeImportSummaryDto
{
    [JsonPropertyName("importedCount")]
    public int ImportedCount { get; set; }

    [JsonPropertyName("queueCount")]
    public int QueueCount { get; set; }

    [JsonPropertyName("failedCount")]
    public int FailedCount { get; set; }
}
