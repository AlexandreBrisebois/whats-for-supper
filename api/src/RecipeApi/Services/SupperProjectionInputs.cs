using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

/// <summary>Effective ingredient inputs, independent of optimistic portions-save versions.</summary>
internal static class SupperProjectionInputs
{
    internal sealed record Occurrence(CalendarEvent Event, IReadOnlyList<IngredientProjectionLineDto> Lines, string Version, int? Basis, int? Target);

    private static string IngredientVersion(Guid recipeId, int? basis, int? target, IReadOnlyList<IngredientProjectionLineDto> lines) =>
        Hash(new { RecipeId = recipeId, Basis = basis, Target = target, Lines = lines, GroceryOperands = lines.Select(line => line.GroceryObservation) });

    internal static bool UsesDatedPortions(CalendarEvent occurrence) => occurrence.MealSlot == 0 && occurrence.Status != CalendarEventStatus.Skipped;

    internal static string PreviewVersion(Recipe recipe, int target, IReadOnlyList<IngredientProjectionLineDto> lines)
        => IngredientVersion(recipe.Id, recipe.Servings, target, lines);

    internal static string DatedVersion(Recipe recipe, DateOnly date, string context, Guid? occurrence, int? target, IReadOnlyList<IngredientProjectionLineDto> lines) =>
        Hash(new { Date = date, Context = context, Occurrence = occurrence, Ingredients = IngredientVersion(recipe.Id, recipe.Servings, target, lines) });

    internal static string WeekVersion(IEnumerable<Occurrence> inputs) => Hash(inputs.Select(x => new { x.Event.Id, x.Event.Date, Ingredients = x.Version }));

    internal static async Task<List<Occurrence>> ReadWeekAsync(RecipeDbContext db, DateOnly monday, DateOnly today, CancellationToken ct)
    {
        var sunday = monday.AddDays(6);
        var events = await db.CalendarEvents.Include(x => x.Recipe)
            .Where(x => x.Date >= monday && x.Date <= sunday && x.RecipeId != null).OrderBy(x => x.Date).ThenBy(x => x.Id).ToListAsync(ct);
        var rows = await db.SupperServings.AsNoTracking().Where(x => x.Date >= monday && x.Date <= sunday).ToListAsync(ct);
        var usual = (await SupperServingsService.ReadUsualAsync(db, ct)).Count;
        return events.Where(x => x.Recipe is not null).Select(evt =>
        {
            // Existing other-meal and legacy night-away contributions retain original amounts; dormant counts do not scale them.
            var target = UsesDatedPortions(evt) ? SupperServingsService.Effective(rows.SingleOrDefault(x => x.Date == evt.Date), usual, evt.Date, today, evt) : null;
            var lines = SupperIngredientProjection.Read(evt.Recipe!, target);
            var basis = UsesDatedPortions(evt) ? evt.Recipe!.Servings : null;
            return new Occurrence(evt, lines, IngredientVersion(evt.RecipeId!.Value, basis, target, lines), basis, target);
        }).ToList();
    }

    private static string Hash<T>(T value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value))));
}
