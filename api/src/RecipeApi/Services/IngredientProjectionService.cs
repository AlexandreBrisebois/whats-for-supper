using System.Data;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;

namespace RecipeApi.Services;

public sealed class IngredientProjectionConflictException() : Exception("This supper changed. Review the current plan before reading its quantities.");

/// <summary>A read-only coherent snapshot of recipe source, dated portions and captured occurrence.</summary>
public sealed class IngredientProjectionService(RecipeDbContext db, SupperServingsService servings)
{
    public async Task<IngredientPreviewDto> ReadPreviewAsync(Guid recipeId, int target, CancellationToken ct)
    {
        if (target is not (2 or 4 or 6)) throw new ArgumentOutOfRangeException(nameof(target));
        var recipe = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == recipeId, ct)
            ?? throw new KeyNotFoundException("Recipe not found.");
        var lines = SupperIngredientProjection.Read(recipe, target);
        return new IngredientPreviewDto
        {
            RecipeId = recipe.Id,
            BaseServings = recipe.Servings,
            TargetServings = target,
            Factor = recipe.Servings is > 0 ? (double)target / recipe.Servings : null,
            Version = SupperProjectionInputs.PreviewVersion(recipe, target, lines),
            Status = ProjectionStatus(recipe.Servings, target, lines),
            Lines = lines
        };
    }

    private static string ProjectionStatus(int? basis, int? target, IReadOnlyList<IngredientProjectionLineDto> lines)
    {
        if (target is null) return "original";
        var unresolved = basis is not > 0 || lines.Any(x => x.Status == "unresolved");
        return !unresolved ? "scaled" : lines.Any(x => x.Status == "scaled") ? "partial" : "unresolved";
    }

    public async Task<IngredientProjectionDto> ReadAsync(Guid recipeId, DateOnly date, string context, Guid? occurrenceId, CancellationToken ct)
    {
        await using var transaction = db.Database.IsRelational() && db.Database.CurrentTransaction is null
            ? await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct) : null;
        var recipe = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == recipeId, ct)
            ?? throw new KeyNotFoundException("Recipe not found.");
        var occurrence = context == "assigned"
            ? await db.CalendarEvents.AsNoTracking().SingleOrDefaultAsync(x => x.Id == occurrenceId && x.Date == date && x.MealSlot == 0 && x.RecipeId == recipeId, ct) : null;
        if (context == "assigned" && occurrence is null) throw new IngredientProjectionConflictException();
        var monday = DeploymentCalendar.Monday(date);
        var state = await servings.ReadAsync(0, monday, ct);
        var day = state.Days.Single(x => x.Date == date);
        var target = occurrence is not null && !SupperProjectionInputs.UsesDatedPortions(occurrence) ? null : day.Servings;
        var lines = SupperIngredientProjection.Read(recipe, target);
        var status = ProjectionStatus(recipe.Servings, target, lines);
        var version = SupperProjectionInputs.DatedVersion(recipe, date, context, context == "assigned" ? occurrenceId : null, target, lines);
        var result = new IngredientProjectionDto
        {
            RecipeId = recipe.Id,
            SupperDate = date,
            Context = context,
            OccurrenceId = context == "assigned" ? occurrenceId : null,
            BaseServings = recipe.Servings,
            TargetServings = target,
            Factor = recipe.Servings is > 0 && target is not null ? (double)target / recipe.Servings : null,
            ServingVersion = state.Version,
            PreparationPlanToken = occurrence is null ? null : ScheduleService.PlanToken(occurrence),
            PreparationServingVersion = occurrence is null ? null : version,
            Preparation = ScheduleService.Preparation(occurrence),
            Version = version,
            Editable = day.Editable,
            Status = status,
            Lines = lines
        };
        if (transaction is not null) await transaction.CommitAsync(ct);
        return result;
    }
}
