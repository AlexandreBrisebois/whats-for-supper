using System.Text.Json;
using System.Text.Json.Serialization;

namespace RecipeApi.Infrastructure;

/// <summary>
/// Shared <see cref="JsonSerializerOptions"/> instances.
/// Previously duplicated as static readonly fields in ManagementService, ImageService, and RecipeExtractionAgent.
/// </summary>
public static class JsonDefaults
{
    /// <summary>
    /// camelCase property names, indented output, enums serialized as camelCase strings.
    /// </summary>
    public static readonly JsonSerializerOptions CamelCase = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    /// <summary>
    /// Case-insensitive deserialization (for reading AI-generated or external JSON).
    /// </summary>
    public static readonly JsonSerializerOptions CaseInsensitive = new()
    {
        PropertyNameCaseInsensitive = true
    };
}
