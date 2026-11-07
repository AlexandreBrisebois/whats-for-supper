using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed class ServingConflictException() : Exception("Portions changed. Review the saved values before saving again.");

/// <summary>Owns date-based portions and their durable grocery-refresh obligation.</summary>
public class SupperServingsService(RecipeDbContext db, IClock clock, DeploymentCalendar calendar, SupperProjectionInvalidation projectionInvalidation)
{
    public const string DefaultKey = "supper_servings_default";

    internal static async Task<IDbContextTransaction?> BeginAsync(RecipeDbContext db, CancellationToken ct)
    {
        if (!db.Database.IsRelational()) return null;
        var transaction = await db.Database.BeginTransactionAsync(ct);
        try
        {
            // Same leading table order as calendar writers; keeps input read, totals and checks coherent.
            await db.Database.ExecuteSqlRawAsync("LOCK TABLE weekly_plans, calendar_events, supper_servings, family_settings, family_members IN SHARE ROW EXCLUSIVE MODE", ct);
            return transaction;
        }
        catch { await transaction.DisposeAsync(); throw; }
    }

    internal sealed record UsualSnapshot(int? SavedCount, int? Count, string Source, string Identity);

    // Every caller reads the stored choice and, only in automatic mode, the persisted roster.
    // The caller owns either the guarded write transaction or a coherent read snapshot.
    internal static async Task<UsualSnapshot> ReadUsualAsync(RecipeDbContext db, CancellationToken ct)
    {
        var setting = await db.FamilySettings.AsNoTracking().SingleOrDefaultAsync(x => x.Key == DefaultKey, ct);
        var saved = setting is null ? null : ValidateDefaultSetting(setting.Value);
        var count = saved ?? await db.FamilyMembers.CountAsync(ct);
        return new(saved, count > 0 ? count : null, saved.HasValue ? "explicit" : "family", setting?.Value.GetRawText() ?? "unset");
    }

    internal static string Version(UsualSnapshot usual, IEnumerable<SupperServing> rows, IEnumerable<CalendarEvent> events) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(usual.Identity + "|" + usual.Source + ":" + usual.Count + "|"
            + string.Join('|', rows.OrderBy(x => x.Date).Select(x => $"{x.Date:yyyy-MM-dd}:{x.Version}:{x.OverrideServings}:{x.InheritedServings}")) + "|"
            + string.Join('|', events.Where(x => x.PreparedAtUtc is not null || x.Status is CalendarEventStatus.Cooked or CalendarEventStatus.Skipped)
                .OrderBy(x => x.Date).Select(x => $"{x.Date:yyyy-MM-dd}:{x.Status}:{x.Id}:{x.RecipeId}:{x.PreparedAtUtc:O}:{x.PreparedServings}")))));

    // Updates only editable inherited snapshots; historical original/null, preparation and overrides are facts.
    // An empty date with a saved portions row remains editable before food is selected.
    internal static async Task<IReadOnlyList<DateOnly>> MaterializeInheritedAsync(RecipeDbContext db, IClock clock,
        DeploymentCalendar calendar, int? usual, CancellationToken ct, IReadOnlyCollection<DateOnly>? weeks = null, bool preserveOverrides = true)
    {
        var now = clock.UtcNow; var today = calendar.Capture(now).Today;
        var events = await db.CalendarEvents.Where(x => x.MealSlot == 0 && x.Date >= today).ToListAsync(ct);
        var rows = await db.SupperServings.Where(x => x.Date >= today).ToListAsync(ct);
        var affected = new HashSet<DateOnly>();
        foreach (var date in rows.Select(x => x.Date).Concat(events.Select(x => x.Date)).Distinct())
        {
            var monday = DeploymentCalendar.Monday(date);
            if (weeks is not null && !weeks.Contains(monday)) continue;
            var evt = events.SingleOrDefault(x => x.Date == date);
            if (evt?.PreparedAtUtc is not null || evt?.Status is CalendarEventStatus.Cooked or CalendarEventStatus.Skipped) continue;
            var row = rows.SingleOrDefault(x => x.Date == date);
            if (preserveOverrides && row?.OverrideServings is not null) continue;
            // Semantic input may change even when a restored snapshot already holds the new count.
            affected.Add(monday);
            if (row is null)
            {
                row = new SupperServing { Date = date, InheritedServings = usual, CreatedAt = now, UpdatedAt = now };
                db.SupperServings.Add(row);
            }
            else if (row.InheritedServings != usual)
            {
                row.InheritedServings = usual; row.Version = Guid.NewGuid(); row.UpdatedAt = now;
            }
        }
        await db.SaveChangesAsync(ct);
        return affected.Order().ToArray();
    }

    internal static int? Effective(SupperServing? row, int? usual, DateOnly date, DateOnly today, bool cooked) =>
        row?.OverrideServings ?? ((date < today || cooked) ? row?.InheritedServings : usual);

    internal static int? Effective(SupperServing? row, int? usual, DateOnly date, DateOnly today, CalendarEvent? occurrence) =>
        occurrence?.PreparedAtUtc is not null ? occurrence.PreparedServings : Effective(row, usual, date, today, occurrence?.Status == CalendarEventStatus.Cooked);

    internal static ServingGroceryRefreshDto Freshness(WeeklyPlan? plan, string version) => new(
        plan?.ServingInputVersion is null || plan.ServingAppliedVersion == plan.ServingInputVersion ? "current" : plan.ServingRefreshStatus == "failed" ? "failed" : "updating",
        plan?.ServingInputVersion ?? version, plan?.ServingAppliedVersion, plan?.GroceryResetSummaryVersion, plan?.ServingRefreshWorkflowId);

    public async Task<SupperServingsDto> ReadAsync(int offset, DateOnly? reference, CancellationToken ct)
    {
        // A standalone read observes one committed batch; callers already owning a transaction retain it.
        await using var transaction = db.Database.IsRelational() && db.Database.CurrentTransaction is null
            ? await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct) : null;
        var result = await ReadSnapshotAsync(offset, reference, ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return result;
    }

    private async Task<SupperServingsDto> ReadSnapshotAsync(int offset, DateOnly? reference, CancellationToken ct)
    {
        var context = calendar.Capture(clock.UtcNow, reference);
        var monday = context.WeekStart(offset);
        // Validate the complete captured week before EF evaluates date expressions.
        var sunday = monday.AddDays(6);
        var rows = await db.SupperServings.AsNoTracking().Where(x => x.Date >= monday && x.Date <= sunday).ToListAsync(ct);
        var usualSnapshot = await ReadUsualAsync(db, ct);
        var events = await db.CalendarEvents.AsNoTracking().Where(x => x.Date >= monday && x.Date <= sunday && x.MealSlot == 0).ToListAsync(ct);
        var usual = usualSnapshot.Count;
        var version = Version(usualSnapshot, rows, events);
        var days = Enumerable.Range(0, 7).Select(index =>
        {
            var date = monday.AddDays(index); var row = rows.SingleOrDefault(x => x.Date == date); var evt = events.SingleOrDefault(x => x.Date == date);
            var cooked = evt?.Status == CalendarEventStatus.Cooked;
            return new SupperServingDayDto(date, Effective(row, usual, date, context.Today, evt), row?.OverrideServings, date >= context.Today && (!cooked || date == context.Today) && evt?.PreparedAtUtc is null && evt?.Status != CalendarEventStatus.Skipped);
        }).ToList();
        var plan = await db.WeeklyPlans.AsNoTracking().SingleOrDefaultAsync(x => x.WeekStartDate == monday, ct);
        return new()
        {
            ReferenceWeekStartDate = context.ReferenceWeekStartDate,
            WeekOffset = offset,
            WeekStartDate = monday,
            DefaultServings = usual,
            DefaultServingsSource = usualSnapshot.Source,
            Version = version,
            Days = days,
            GroceryRefresh = Freshness(plan, version),
        };
    }

    internal static int? ValidateDefaultSetting(JsonElement value)
    {
        if (value.ValueKind != JsonValueKind.Object || !value.TryGetProperty("servings", out var count))
            throw new InvalidDataException("Declared portions default requires an explicit servings count or null.");
        if (value.TryGetProperty("version", out var version) && (version.ValueKind != JsonValueKind.String || !version.TryGetGuid(out var id) || id == Guid.Empty))
            throw new InvalidDataException("Declared portions default version is invalid.");
        try { return Count(count); }
        catch (ArgumentException ex) { throw new InvalidDataException("Declared portions default is invalid.", ex); }
    }

    private static int? Count(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Null) return null;
        if (value.ValueKind != JsonValueKind.Number || !value.TryGetInt32(out var count) || count < 1) throw new ArgumentException("Portions must be a whole number from 1 to 2147483647.");
        return count;
    }

    public async Task<SupperServingsDto> SaveAsync(SupperServingsSaveDto request, CancellationToken ct)
    {
        if (request.ReferenceWeekStartDate.DayOfWeek != DayOfWeek.Monday || request.Days is null || request.Days.Count > 7 || string.IsNullOrWhiteSpace(request.ExpectedVersion)) throw new ArgumentException("Capture a valid week and portions version.");
        var monday = request.ReferenceWeekStartDate.AddDays(checked(request.WeekOffset * 7));
        var edits = request.Days.Select(x => (x.Date, Count: Count(x.Servings))).ToList();
        if (edits.Select(x => x.Date).Distinct().Count() != edits.Count || edits.Any(x => x.Date < monday || x.Date > monday.AddDays(6))) throw new ArgumentException("Each edited date must occur once in the captured week.");
        // Validate optional null separately from omission before changing tracked entities.
        var changesDefault = request.DefaultServings.ValueKind != JsonValueKind.Undefined;
        var newDefault = changesDefault ? Count(request.DefaultServings) : null;
        await using var transaction = await BeginAsync(db, ct);
        var before = await ReadAsync(request.WeekOffset, request.ReferenceWeekStartDate, ct);
        if (before.Version != request.ExpectedVersion) throw new ServingConflictException();
        if (edits.Any(x => !before.Days.Single(d => d.Date == x.Date).Editable)) throw new ArgumentException("Past, prepared and non-cooking dates are read-only.");
        var now = clock.UtcNow;
        var currentUsual = await ReadUsualAsync(db, ct);
        var usualChanged = changesDefault && newDefault != currentUsual.SavedCount;
        if (usualChanged)
        {
            var setting = await db.FamilySettings.SingleOrDefaultAsync(x => x.Key == DefaultKey, ct);
            if (setting is null) { setting = new FamilySetting { Key = DefaultKey }; db.FamilySettings.Add(setting); }
            // Persist the choice, never the derived family count.
            setting.Value = JsonSerializer.SerializeToElement(new { servings = newDefault, version = Guid.NewGuid() }); setting.UpdatedAt = now;
            await db.SaveChangesAsync(ct);
        }
        var usual = (await ReadUsualAsync(db, ct)).Count;
        var affected = (await MaterializeInheritedAsync(db, clock, calendar, usual, ct,
            usualChanged ? null : new[] { monday })).ToHashSet();
        var rows = await db.SupperServings.Where(x => x.Date >= monday && x.Date <= monday.AddDays(6)).ToListAsync(ct);
        SupperServing Materialise(DateOnly date)
        {
            var row = rows.SingleOrDefault(x => x.Date == date);
            if (row is null) { row = new SupperServing { Date = date, CreatedAt = now, UpdatedAt = now }; rows.Add(row); db.SupperServings.Add(row); }
            return row;
        }
        foreach (var edit in edits)
        {
            var previous = rows.SingleOrDefault(x => x.Date == edit.Date);
            // Eligibility is already guarded and ordinary inherited dates were materialized above.
            // A deliberate reset can still correct today's frozen Cooked count without an override.
            var resetsFrozenInherited = edit.Count is null && previous?.OverrideServings is null
                && previous?.InheritedServings != usual && before.Days.Single(d => d.Date == edit.Date).Servings != usual;
            if (previous?.OverrideServings == edit.Count && !resetsFrozenInherited) continue;
            var row = Materialise(edit.Date);
            row.OverrideServings = edit.Count; row.InheritedServings = usual;
            row.Version = Guid.NewGuid(); row.UpdatedAt = now;
            affected.Add(DeploymentCalendar.Monday(edit.Date));
        }
        await db.SaveChangesAsync(ct);
        await projectionInvalidation.EnlistWeeksAsync(affected, ct);
        // Read the final acknowledgement while its transaction is still usable, before commit/disposal.
        var after = await ReadSnapshotAsync(request.WeekOffset, request.ReferenceWeekStartDate, ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return after with { AffectedWeekStartDates = affected.Order().ToArray() };
    }

    internal static void Enqueue(RecipeDbContext db, WeeklyPlan plan, string version, DateTimeOffset now)
    {
        var parameters = new Dictionary<string, string> { ["weekStartDate"] = plan.WeekStartDate.ToString("yyyy-MM-dd") };
        var definition = new WorkflowDefinition { Parameters = ["weekStartDate"], Tasks = [new() { Name = "refresh", Processor = "RefreshSupperGroceries", Payload = new() { ["weekStartDate"] = "{{weekStartDate}}" } }] };
        var instance = WorkflowOrchestrator.ConstructInstance("supper-grocery-refresh", definition, parameters, now);
        db.WorkflowInstances.Add(instance);
        plan.ServingInputVersion = version; plan.ServingRefreshStatus = "updating"; plan.ServingRefreshWorkflowId = instance.Id;
    }

    public async Task RetryAsync(SupperServingsRefreshDto request, CancellationToken ct)
    {
        if (request.WeekStartDates is not { Count: > 0 } || request.WeekStartDates.Any(x => x.DayOfWeek != DayOfWeek.Monday)) throw new ArgumentException("Choose absolute Monday weeks.");
        await using var transaction = await BeginAsync(db, ct);
        foreach (var monday in request.WeekStartDates.Distinct())
        {
            var plan = await db.WeeklyPlans.SingleOrDefaultAsync(x => x.WeekStartDate == monday, ct);
            if (plan is null || plan.ServingInputVersion is null || plan.ServingAppliedVersion == plan.ServingInputVersion) continue;
            Enqueue(db, plan, plan.ServingInputVersion, clock.UtcNow);
        }
        await db.SaveChangesAsync(ct); if (transaction is not null) await transaction.CommitAsync(ct);
    }
}
