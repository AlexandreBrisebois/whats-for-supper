using Microsoft.EntityFrameworkCore;
using RecipeApi.Dto;
using RecipeApi.Models;
namespace RecipeApi.Services;

public sealed class PreparationConflictException() : Exception("This supper or its quantities changed. Review the current plan before preparing it.");

public partial class ScheduleService
{
    private static void ClearPreparation(CalendarEvent entry)
    {
        entry.PreparedOn = null;
        entry.PreparedAtUtc = null;
        entry.PreparedServings = null;
        entry.PreparedOriginalServings = null;
        entry.PreparationPlanToken = null;
        entry.PreparationServingVersion = null;
    }

    private static void SwapPreparation(CalendarEvent left, CalendarEvent right)
    {
        (left.PreparedOn, right.PreparedOn) = (right.PreparedOn, left.PreparedOn);
        (left.PreparedAtUtc, right.PreparedAtUtc) = (right.PreparedAtUtc, left.PreparedAtUtc);
        (left.PreparedServings, right.PreparedServings) = (right.PreparedServings, left.PreparedServings);
        (left.PreparedOriginalServings, right.PreparedOriginalServings) = (right.PreparedOriginalServings, left.PreparedOriginalServings);
        (left.PreparationPlanToken, right.PreparationPlanToken) = (right.PreparationPlanToken, left.PreparationPlanToken);
        (left.PreparationServingVersion, right.PreparationServingVersion) = (right.PreparationServingVersion, left.PreparationServingVersion);
    }

    internal static SupperPreparationDto? Preparation(CalendarEvent? entry) => entry is { PreparedOn: { } on, PreparedAtUtc: { } at, PreparationPlanToken: { } plan, PreparationServingVersion: { } portions }
        ? new() { PreparedOn = on, PreparedAtUtc = at, Servings = entry.PreparedServings, PortionContext = entry.PreparedServings is null ? "original" : "dated", OriginalServings = entry.PreparedOriginalServings, PlanToken = plan, ServingVersion = portions } : null;

    public async Task<PrepareSupperResultDto> PrepareSupperAsync(DateOnly date, PrepareSupperRequestDto body, string? excludeConnectionId, CancellationToken ct)
    {
        if (body.ExpectedOccurrenceId == Guid.Empty || body.RecipeId == Guid.Empty || !IsRemovalToken(body.ExpectedPlanToken)
            || body.ExpectedServingVersion is not { Length: 64 } || body.ExpectedServingVersion.Any(c => !char.IsAsciiHexDigitUpper(c)))
            throw new ArgumentException("Capture a valid saved supper and its displayed quantities.");
        var context = _calendar.Capture(_clock.UtcNow);
        PrepareSupperResultDto result;
        await using (var transaction = await SupperServingsService.BeginAsync(_dbContext, ct))
        {
            var entry = await _dbContext.CalendarEvents.SingleOrDefaultAsync(x => x.Date == date && x.MealSlot == 0, ct);
            if (entry is null || entry.Id != body.ExpectedOccurrenceId || entry.RecipeId != body.RecipeId) throw new PreparationConflictException();
            // A lost reply belongs to the original request, independent of subsequent defaults or source edits.
            if (Preparation(entry) is { } stored)
            {
                if (stored.PlanToken != body.ExpectedPlanToken || stored.ServingVersion != body.ExpectedServingVersion) throw new PreparationConflictException();
                return new(entry.Id, body.RecipeId, date, stored);
            }
            if (entry.Status is not (CalendarEventStatus.Planned or CalendarEventStatus.Locked) || PlanToken(entry) != body.ExpectedPlanToken) throw new PreparationConflictException();
            var recipe = await _dbContext.Recipes.SingleOrDefaultAsync(x => x.Id == body.RecipeId && x.DeletedAt == null, ct) ?? throw new PreparationConflictException();
            var row = await _dbContext.SupperServings.AsNoTracking().SingleOrDefaultAsync(x => x.Date == date, ct);
            var usual = (await SupperServingsService.ReadUsualAsync(_dbContext, ct)).Count;
            var target = SupperServingsService.Effective(row, usual, date, context.Today, entry);
            var lines = SupperIngredientProjection.Read(recipe, target);
            if (SupperProjectionInputs.DatedVersion(recipe, date, "assigned", entry.Id, target, lines) != body.ExpectedServingVersion) throw new PreparationConflictException();
            entry.PreparedOn = context.Today;
            entry.PreparedAtUtc = context.CapturedAtUtc;
            entry.PreparedServings = target;
            entry.PreparedOriginalServings = recipe.Servings;
            entry.PreparationPlanToken = body.ExpectedPlanToken;
            entry.PreparationServingVersion = body.ExpectedServingVersion;
            entry.Status = CalendarEventStatus.Cooked;
            await SaveChangesAndRecalculateLastCookedDatesAsync([recipe.Id], ct);
            if (transaction is not null) await transaction.CommitAsync(ct);
            result = new(entry.Id, recipe.Id, date, Preparation(entry)!);
        }
        // The persisted receipt is authoritative; a publication failure cannot undo it.
        try { await _publisher.PublishWeekUpdatedAsync(await ReadScheduleAsync(GetWeekOffset(GetMonday(date), context), context), excludeConnectionId); }
        catch (Exception ex) { _logger.LogWarning(ex, "Supper preparation committed; publication unavailable for {Date}", date); }
        return result;
    }
}
