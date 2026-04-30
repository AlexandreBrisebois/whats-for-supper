using System.Text.Json;
using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public record SettingsDto(
    [property: JsonPropertyName("key")] string Key,
    [property: JsonPropertyName("value")] JsonElement Value
);
