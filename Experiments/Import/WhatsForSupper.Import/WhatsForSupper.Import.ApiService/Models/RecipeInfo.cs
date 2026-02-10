using System.Text.Json.Serialization;

namespace WhatsForSupper.Import.ApiService.Models;

public class RecipeInfo
{
    [JsonPropertyName("rating")]
    public int Rating { get; set; }

    [JsonPropertyName("ratingType")]
    public string RatingType { get; set; } // "dislike", "like", "love"

    [JsonPropertyName("addedDate")]
    public DateTime AddedDate { get; set; }

    [JsonPropertyName("imageCount")]
    public int ImageCount { get; set; }
}
