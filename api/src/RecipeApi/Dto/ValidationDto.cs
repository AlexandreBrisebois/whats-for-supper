using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public record ValidationDto(
    [property: JsonPropertyName("status")] int Status
);
