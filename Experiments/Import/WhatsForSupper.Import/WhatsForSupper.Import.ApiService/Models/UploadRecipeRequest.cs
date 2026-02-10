using System.Text.Json.Serialization;

namespace WhatsForSupper.Import.ApiService.Models;

public class UploadRecipeRequest
{
    [JsonPropertyName("rating")]
    public int Rating { get; set; }

    [JsonPropertyName("images")]
    public List<RecipeImageData> Images { get; set; } = new();
}

public class RecipeImageData
{
    [JsonPropertyName("fileName")]
    public string FileName { get; set; }

    [JsonPropertyName("contentType")]
    public string ContentType { get; set; }

    [JsonPropertyName("data")]
    public byte[] Data { get; set; }
}
