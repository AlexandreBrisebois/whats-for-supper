using System.Text.Json.Serialization;
using RecipeApi.Models;

namespace RecipeApi.Dto;

public class VoteDto
{
    [JsonPropertyName("vote")]
    public VoteType Vote { get; set; }
}
