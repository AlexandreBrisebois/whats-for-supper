using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public record GroceryExtraDto(Guid Id, Guid LineageId, DateOnly OccurrenceWeekStartDate, string Name,
    string NormalizedKey, string GrocerySection, bool Checked, int Version, string Source, bool ReadOnly);

public record CreateGroceryExtraRequest(Guid ClientId, DateOnly WeekStartDate, string Name);

public record UpdateGroceryExtraRequest(DateOnly WeekStartDate, int ExpectedVersion, string? Name = null,
    bool? Checked = null, string? GrocerySection = null);

public record GroceryExtraConflictResponse(string Message, bool Absent, GroceryExtraDto? Current);

public record GroceryExtraSuggestionResponse(IReadOnlyList<string> Names);
