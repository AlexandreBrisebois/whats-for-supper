using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public record ScheduleDayDto(
    [property: JsonPropertyName("day")] string Day,
    [property: JsonPropertyName("date")] string Date,
    [property: JsonPropertyName("recipe")] ScheduleRecipeDto? Recipe,
    [property: JsonPropertyName("status")] int Status = 0);

public record ScheduleRecipeDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("image")] string Image,
    [property: JsonPropertyName("voteCount")] int? VoteCount = null,
    [property: JsonPropertyName("ingredients")] List<string>? Ingredients = null,
    [property: JsonPropertyName("description")] string? Description = null);

public record ScheduleDays(
    [property: JsonPropertyName("weekOffset")] int WeekOffset,
    [property: JsonPropertyName("locked")] bool Locked,
    [property: JsonPropertyName("status")] int Status,
    [property: JsonPropertyName("days")] List<ScheduleDayDto> Days);
