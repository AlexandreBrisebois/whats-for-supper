using System.Globalization;
using RecipeApi.Dto;

namespace RecipeApi.Services;

/// <summary>Projects supplied instants into the deployment's supper calendar.</summary>
public sealed class DeploymentCalendar
{
    private readonly TimeZoneInfo _zone;

    public DeploymentCalendar(IConfiguration configuration)
    {
        var setting = configuration["Calendar:TimeZone"] ?? "UTC";
        try
        {
            _zone = TimeZoneInfo.FindSystemTimeZoneById(setting);
            if (setting != "UTC" && !_zone.HasIanaId)
                throw new TimeZoneNotFoundException();
        }
        catch (Exception error) when (error is TimeZoneNotFoundException or InvalidTimeZoneException or ArgumentException)
        {
            throw new InvalidOperationException($"Invalid Calendar:TimeZone '{setting}'. Set Calendar__TimeZone to UTC or an IANA timezone such as America/Toronto.", error);
        }
    }

    public DeploymentCalendarContext Capture(DateTimeOffset instant, DateOnly? reference = null)
    {
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, _zone).DateTime);
        var monday = Monday(today);
        if (reference.HasValue && reference.Value.DayOfWeek != DayOfWeek.Monday)
            throw new ArgumentException("referenceWeekStartDate must be a Monday.", nameof(reference));
        var midnight = today.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        // Some IANA zones advance at midnight. The boundary is the first valid instant
        // of the next civil date, and the earlier occurrence when midnight repeats.
        while (_zone.IsInvalidTime(midnight)) midnight = midnight.AddMinutes(1);
        var next = _zone.IsAmbiguousTime(midnight)
            ? new DateTimeOffset(midnight, _zone.GetAmbiguousTimeOffsets(midnight).Max()).ToUniversalTime()
            : new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(midnight, _zone));
        return new(_zone.Id, instant.ToUniversalTime(), today, monday, reference ?? monday, next);
    }

    public static DateOnly Monday(DateOnly date) => date.AddDays(-((int)date.DayOfWeek + 6) % 7);

    public static bool TryParseReference(string? text, out DateOnly? reference)
    {
        reference = null;
        if (text is null) return true;
        if (!DateOnly.TryParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            || date.DayOfWeek != DayOfWeek.Monday) return false;
        reference = date;
        return true;
    }
}
