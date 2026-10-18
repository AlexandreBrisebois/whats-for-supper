using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

internal static class RecipeRotation
{
    public static bool Suitable(Recipe recipe) => recipe.SupperSuitable ??
        (recipe.Category == "Supper" || recipe.MealTypes?.Contains("Supper") == true);

    // Lock before reading: automatic writes cannot replay a stale human or restored state.
    // A row transaction bounds each Dreaming item; completed items survive a later failure.
    public static async Task<IDbContextTransaction?> LockAsync(RecipeDbContext db, Guid id, CancellationToken ct = default)
    {
        if (!db.Database.IsRelational()) return null;
        var transaction = await db.Database.BeginTransactionAsync(ct);
        try
        {
            await db.Database.ExecuteSqlAsync($"SELECT id FROM recipes WHERE id = {id} FOR UPDATE", ct);
            var tracked = db.ChangeTracker.Entries<Recipe>().FirstOrDefault(x => x.Entity.Id == id);
            if (tracked is not null) await tracked.ReloadAsync(ct);
            return transaction;
        }
        catch { await transaction.DisposeAsync(); throw; }
    }
}

public sealed class RecipeRotationOptions
{
    public int CookedCooldownWeeks { get; }
    public bool Enabled { get; }

    public RecipeRotationOptions(IConfiguration configuration)
    {
        var setting = configuration["COOKED_COOLDOWN_WEEKS"];
        if (setting is null) CookedCooldownWeeks = 4;
        else if (int.TryParse(setting, out var weeks) && weeks is > 0 and <= 5200) CookedCooldownWeeks = weeks;
        else throw new InvalidOperationException("COOKED_COOLDOWN_WEEKS must be an integer from 1 to 5200.");
        var enabled = configuration["DREAMING_ROTATION_ENABLED"];
        if (enabled is null) Enabled = true;
        else if (bool.TryParse(enabled, out var value)) Enabled = value;
        else throw new InvalidOperationException("DREAMING_ROTATION_ENABLED must be true or false.");
    }
}
