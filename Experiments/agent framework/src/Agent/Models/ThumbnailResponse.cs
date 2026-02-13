using System.Text.Json.Serialization;

namespace Agent.Utils;

public class ThumbnailResponse
{
    [JsonPropertyName("thumbnail")]
    public string Thumbnail { get; set; } = string.Empty;
}

