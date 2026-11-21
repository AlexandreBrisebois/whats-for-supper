using System.Text.Json;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public partial class ManagementService
{
    private static readonly string[] PreparationFields = ["preparedOn", "preparedAtUtc", "preparedServings", "preparedOriginalServings", "preparationPlanToken", "preparationServingVersion"];

    private static async Task<List<CalendarEvent>> ReadCalendarEventsAsync(string path, CancellationToken ct)
    {
        using var document = JsonDocument.Parse(await File.ReadAllTextAsync(path, ct));
        var events = document.RootElement.Deserialize<List<CalendarEvent>>(JsonDefaults.CamelCase) ?? [];
        if (document.RootElement.ValueKind == JsonValueKind.Null) return events;
        foreach (var (row, entry) in document.RootElement.EnumerateArray().Zip(events))
        {
            // Legacy Cooked entries honestly have no observed preparation. Once any preparation
            // value is supplied, require the complete occurrence-owned receipt before merging rows.
            if (!PreparationFields.Any(field => row.TryGetProperty(field, out var value) && value.ValueKind != JsonValueKind.Null)) continue;
            if (PreparationFields.Any(field => !row.TryGetProperty(field, out _))
                || entry.Id == Guid.Empty || entry.RecipeId is null || entry.RecipeId == Guid.Empty
                || entry.Date == default || entry.Status != CalendarEventStatus.Cooked
                || entry.PreparedOn is null || entry.PreparedOn == default(DateOnly)
                || entry.PreparedAtUtc is null || entry.PreparedAtUtc == default(DateTimeOffset)
                || entry.PreparedServings <= 0 || entry.PreparedOriginalServings <= 0
                || !ScheduleService.IsRemovalToken(entry.PreparationPlanToken)
                || entry.PreparationServingVersion is not { Length: 64 }
                || entry.PreparationServingVersion.Any(c => !char.IsAsciiHexDigitUpper(c)))
                throw new InvalidDataException("Calendar preparation metadata is incomplete or inconsistent; calendar events were not merged.");
        }
        return events;
    }
}
