namespace Agent;

using System.Text.Json.Serialization;

public class ThumbnailResponse
{
    [JsonPropertyName("thumbnail")]
    public string Thumbnail { get; set; } = string.Empty;
}

