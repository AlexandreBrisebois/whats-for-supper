using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Utils;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

public sealed record GroceryExtraCreateResult(GroceryExtraDto Extra, bool Created);
public sealed class GroceryExtraValidationException(string message) : Exception(message);
public sealed class GroceryExtraNotFoundException : Exception;
public sealed class GroceryExtraConflictException(string message, GroceryExtraDto? current = null)
    : Exception(message)
{ public GroceryExtraDto? Current { get; } = current; }

public sealed class GroceryExtraService(RecipeDbContext db, IClock clock, DeploymentCalendar calendar, AisleMapper aisleMapper,
    IScheduleEventPublisher? publisher = null, ILogger<GroceryExtraService>? logger = null)
{
    public async Task<GroceryExtraCreateResult> CreateAsync(CreateGroceryExtraRequest request, string? excludeConnectionId = null, CancellationToken ct = default)
    {
        var current = calendar.Capture(clock.UtcNow).CurrentWeekStartDate;
        var name = CleanName(request.Name);
        if (request.WeekStartDate != current) throw new GroceryExtraValidationException("Extras can only be added to the current week.");
        var existing = await db.GroceryExtraOccurrences.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.ClientId, ct);
        if (existing is not null)
        {
            if (existing.WeekStartDate != request.WeekStartDate || existing.Name != name)
                throw new GroceryExtraConflictException("That client identity is already bound to another extra.", ToDto(existing, false));
            return new(ToDto(existing, false), false);
        }
        var normalized = IngredientNormalizer.Normalize(name);
        if (normalized.Length == 0) throw new GroceryExtraValidationException("Name is required.");
        var stored = await db.IngredientCategories.AsNoTracking().SingleOrDefaultAsync(x => x.NormalizedKey == normalized, ct);
        var section = stored is not null && GrocerySections.TryGetCanonicalName(stored.GrocerySection, out var storedSection)
            ? storedSection
            : GrocerySections.ToDisplayName(aisleMapper.MapToSection(normalized));
        var row = GroceryExtraOccurrence.Create(request.ClientId, request.ClientId, current, name, normalized, section, clock.UtcNow);
        db.GroceryExtraOccurrences.Add(row);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            db.Entry(row).State = EntityState.Detached;
            existing = await db.GroceryExtraOccurrences.AsNoTracking()
                .SingleOrDefaultAsync(x => x.Id == request.ClientId, ct);
            if (existing is null) throw;
            if (existing.WeekStartDate != request.WeekStartDate || existing.Name != name)
                throw new GroceryExtraConflictException(
                    "That client identity is already bound to another extra.", ToDto(existing, false));
            return new(ToDto(existing, false), false);
        }
        await PublishAsync(current, excludeConnectionId, ct);
        return new(ToDto(row, false), true);
    }

    public async Task<IReadOnlyList<string>> SuggestAsync(string query, CancellationToken ct = default)
    {
        var timer = Stopwatch.StartNew();
        var normalizedQuery = IngredientNormalizer.Normalize(query.Trim());
        if (normalizedQuery.Length < 2)
        {
            LogSuggestion(timer.ElapsedMilliseconds, 0, "validation");
            throw new GroceryExtraValidationException("Enter at least two characters.");
        }

        try
        {
            var current = calendar.Capture(clock.UtcNow).CurrentWeekStartDate;
            var rows = await db.GroceryExtraOccurrences.AsNoTracking().ToListAsync(ct);
            var latest = rows.GroupBy(x => x.NormalizedKey).Select(g => g.OrderByDescending(x => x.WeekStartDate).ThenByDescending(x => x.UpdatedAt).First());
            var outstanding = rows.Where(x => x.WeekStartDate == current && !x.Checked && x.RemovedAt == null).Select(x => x.NormalizedKey).ToHashSet();
            var result = latest.Where(x => x.RemovedAt == null && !outstanding.Contains(x.NormalizedKey) && x.NormalizedKey.Contains(normalizedQuery, StringComparison.Ordinal))
                .OrderByDescending(x => x.NormalizedKey.StartsWith(normalizedQuery, StringComparison.Ordinal))
                .ThenByDescending(x => x.UpdatedAt).ThenBy(x => x.Name, StringComparer.Ordinal).Take(3).Select(x => x.Name).ToArray();
            LogSuggestion(timer.ElapsedMilliseconds, result.Length, "success");
            return result;
        }
        catch (OperationCanceledException)
        {
            LogSuggestion(timer.ElapsedMilliseconds, 0, "cancelled");
            throw;
        }
        catch
        {
            LogSuggestion(timer.ElapsedMilliseconds, 0, "failure", LogLevel.Warning);
            throw;
        }
    }

    public async Task<GroceryExtraDto> UpdateAsync(Guid id, UpdateGroceryExtraRequest request, string? excludeConnectionId = null, CancellationToken ct = default)
    {
        var supplied = (request.Name is not null ? 1 : 0) + (request.Checked is not null ? 1 : 0) + (request.GrocerySection is not null ? 1 : 0);
        if (supplied != 1 || request.ExpectedVersion < 1) throw new GroceryExtraValidationException("Supply exactly one valid mutation.");
        var row = await db.GroceryExtraOccurrences.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new GroceryExtraNotFoundException();
        EnsureMutable(row, request.WeekStartDate, request.ExpectedVersion);
        if (request.Name is not null) { row.Name = CleanName(request.Name); row.NormalizedKey = IngredientNormalizer.Normalize(row.Name); }
        if (request.Checked is { } check) row.Checked = check;
        if (request.GrocerySection is { } section)
        {
            if (!GrocerySections.TryGetCanonicalName(section, out var canonicalSection)) throw new GroceryExtraValidationException("Unsupported grocery section.");
            row.GrocerySection = canonicalSection;
        }
        row.Version++; row.UpdatedAt = clock.UtcNow;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException)
        {
            db.Entry(row).State = EntityState.Detached;
            var current = await db.GroceryExtraOccurrences.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
            throw new GroceryExtraConflictException("The extra changed. Refresh before retrying.",
                current?.RemovedAt is null ? current is null ? null : ToDto(current, false) : null);
        }
        await PublishAsync(row.WeekStartDate, excludeConnectionId, ct);
        return ToDto(row, false);
    }

    public async Task DeleteAsync(Guid id, DateOnly week, int expectedVersion, string? excludeConnectionId = null, CancellationToken ct = default)
    {
        var row = await db.GroceryExtraOccurrences.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new GroceryExtraNotFoundException();
        EnsureMutable(row, week, expectedVersion);
        row.RemovedAt = clock.UtcNow; row.Version++; row.UpdatedAt = clock.UtcNow;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException)
        {
            db.Entry(row).State = EntityState.Detached;
            var current = await db.GroceryExtraOccurrences.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
            throw new GroceryExtraConflictException("The extra changed. Refresh before retrying.",
                current?.RemovedAt is null ? current is null ? null : ToDto(current, false) : null);
        }
        await PublishAsync(row.WeekStartDate, excludeConnectionId, ct);
    }

    public async Task<List<GroceryExtraDto>> ReadForViewAsync(DateOnly selectedWeek, DateOnly currentWeek, CancellationToken ct = default)
    {
        IQueryable<GroceryExtraOccurrence> query = db.GroceryExtraOccurrences.AsNoTracking().Where(x => x.RemovedAt == null);
        if (selectedWeek == currentWeek) query = query.Where(x => x.WeekStartDate == currentWeek);
        else if (selectedWeek == currentWeek.AddDays(7)) query = query.Where(x => x.WeekStartDate == currentWeek && !x.Checked);
        else if (selectedWeek < currentWeek) query = query.Where(x => x.WeekStartDate == selectedWeek);
        else return [];
        var readOnly = selectedWeek < currentWeek;
        return (await query.OrderBy(x => x.CreatedAt).ToListAsync(ct)).Select(x => ToDto(x, readOnly)).ToList();
    }

    private void EnsureMutable(GroceryExtraOccurrence row, DateOnly week, int version)
    {
        var current = calendar.Capture(clock.UtcNow).CurrentWeekStartDate;
        if (week != current || row.WeekStartDate != current || row.RemovedAt != null || row.Version != version)
            throw new GroceryExtraConflictException("The extra changed. Refresh before retrying.", row.RemovedAt is null ? ToDto(row, false) : null);
    }
    private async Task PublishAsync(DateOnly week, string? exclusion, CancellationToken ct)
    {
        if (publisher is null) return;
        try
        {
            var visible = await db.GroceryExtraOccurrences.AsNoTracking().Where(x => x.WeekStartDate == week && x.RemovedAt == null)
                .OrderBy(x => x.CreatedAt).Select(x => ToDto(x, false)).ToListAsync(ct);
            await publisher.PublishGroceryExtrasUpdatedAsync(week, visible, exclusion);
        }
        catch (Exception ex) { logger?.LogWarning(ex, "Grocery extra saved but live publication failed."); }
    }
    private void LogSuggestion(long elapsedMilliseconds, int resultCount, string outcome, LogLevel level = LogLevel.Information) =>
        logger?.Log(level, "Grocery extra suggestion lookup completed in {ElapsedMilliseconds} ms with {ResultCount} results and outcome {Outcome}.",
            elapsedMilliseconds, resultCount, outcome);
    private static string CleanName(string? value) { var name = value?.Trim() ?? ""; if (name.Length is < 1 or > 200) throw new GroceryExtraValidationException("Name must contain 1 to 200 characters."); return name; }
    internal static GroceryExtraDto ToDto(GroceryExtraOccurrence x, bool readOnly) => new(x.Id, x.LineageId, x.WeekStartDate, x.Name, x.NormalizedKey, x.GrocerySection, x.Checked, x.Version, "extra", readOnly);
}
