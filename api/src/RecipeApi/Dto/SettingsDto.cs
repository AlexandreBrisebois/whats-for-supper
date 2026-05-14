using System.Text.Json;
using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class SettingsDto
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public JsonElement Value { get; set; }

    public SettingsDto() { }

    [JsonConstructor]
    public SettingsDto(string key, JsonElement value)
    {
        Key = key;
        Value = value;
    }
}
