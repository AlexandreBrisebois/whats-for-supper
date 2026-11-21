using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.WebUtilities;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed class RemovalConflictException(string message) : Exception(message);

public partial class ScheduleService
{
    public static bool IsRemovalToken(string? token) => token is { Length: 46 }
        && token.StartsWith("v1.", StringComparison.Ordinal)
        && token.AsSpan(3).IndexOfAnyExcept("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-".AsSpan()) < 0;

    internal static string PlanToken(CalendarEvent entry)
    {
        // Stable field order and persisted values only; no recipe details or transient view state.
        var snapshot = JsonSerializer.SerializeToUtf8Bytes(new
        {
            entry.Id,
            entry.Date,
            entry.MealSlot,
            entry.RecipeId,
            entry.Status,
            entry.NonCookingKind,
            entry.NonCookingLabel,
            entry.VoteCount,
            entry.CandidateIds,
            entry.PreparedOn,
            entry.PreparedAtUtc,
            entry.PreparedServings,
            entry.PreparedOriginalServings,
            entry.PreparationPlanToken,
            entry.PreparationServingVersion,
        });
        return "v1." + WebEncoders.Base64UrlEncode(SHA256.HashData(snapshot));
    }

    private async Task<CalendarEvent> RemoveExpectedSupperAsync(DateOnly date, string token)
    {
        try
        {
            var entry = await _dbContext.CalendarEvents.AsNoTracking().SingleOrDefaultAsync(e => e.Date == date && e.MealSlot == 0);
            if (entry is null || PlanToken(entry) != token)
                throw new RemovalConflictException("That supper plan changed. Refresh it before removing it.");
            // A scoped service may already track an older read. Compare persisted fields,
            // then replace only that tracked instance before deleting the matching entry.
            var tracked = _dbContext.CalendarEvents.Local.FirstOrDefault(e => e.Id == entry.Id);
            if (tracked is not null) _dbContext.Entry(tracked).State = EntityState.Detached;
            _dbContext.CalendarEvents.Remove(entry);
            await _dbContext.SaveChangesAsync();
            if (entry.Status == CalendarEventStatus.Cooked && entry.RecipeId is { } recipeId)
            {
                await RecalculateLastCookedDateAsync(recipeId, CancellationToken.None);
                await _dbContext.SaveChangesAsync();
            }
            return entry;
        }
        catch (Exception ex) when (IsAssignmentRace(ex))
        {
            _dbContext.ChangeTracker.Clear();
            throw new RemovalConflictException("That supper plan changed. Refresh it before removing it.");
        }
    }
}
