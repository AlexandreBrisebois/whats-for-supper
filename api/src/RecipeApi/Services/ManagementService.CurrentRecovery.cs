using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

public sealed record CurrentRecoveryRecipeInspection(Guid RecipeId, CurrentRecipeRecoveryAssessment Assessment);
public sealed record CurrentRecoveryInspection(CurrentRecoveryArchive Inventory, IReadOnlyList<CurrentRecoveryRecipeInspection> Recipes,
    CurrentRecoveryRecipes StagedRecipes, CurrentRecoveryHouseholdState StagedHouseholdState);

public partial class ManagementService
{
    // Explicit internal preflight only. Ordinary RestoreAsync/DisasterRecoveryAsync
    // cannot publish this inventory until full household/reference validation,
    // protected merging and the complete publication/recovery lifecycle qualify.
    public Task<CurrentRecoveryInspection> InspectCurrentRecoveryAsync(string root, Guid expectedHouseholdId,
        string expectedSchemaFingerprint, IReadOnlyList<CurrentRecipeRecoveryBaseline> reviewedBaselines,
        CancellationToken ct = default)
        => InspectCurrentRecoveryCoreAsync(root, expectedHouseholdId, expectedSchemaFingerprint, reviewedBaselines,
            verifySelectedSchema: false, ct);

    private async Task<CurrentRecoveryInspection> InspectCurrentRecoveryCoreAsync(string root, Guid expectedHouseholdId,
        string expectedSchemaFingerprint, IReadOnlyList<CurrentRecipeRecoveryBaseline> reviewedBaselines,
        bool verifySelectedSchema, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(reviewedBaselines);
        var capturedBaselines = reviewedBaselines.Select(x => x is null
            ? throw new ArgumentException("A reviewed baseline cannot be null.", nameof(reviewedBaselines))
            : x with { SelectedFields = x.SelectedFields?.ToArray()! }).ToArray();
        // Entire input inventory first. Only frozen validated bytes are consumed
        // below; no family/member/recipe/file mutation or provider work occurs.
        var inventory = await CurrentRecoveryArchive.InspectAsync(root, expectedHouseholdId, expectedSchemaFingerprint, ct);
        var stagedRecipes = await CurrentRecoveryRecipes.StageAsync(inventory, ct);
        var stagedHousehold = CurrentRecoveryHouseholdState.Stage(inventory, stagedRecipes, ct);
        using var document = inventory.ReadManifest();
        var manifest = document.RootElement.Deserialize<CurrentRecoveryManifest>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        var ids = manifest.Recipes.Select(x => x.RecipeId).ToArray();
        if (capturedBaselines.Any(x => !ids.Contains(x.RecipeId))
            || capturedBaselines.Select(x => x.RecipeId).Distinct().Count() != capturedBaselines.Length)
            throw new ArgumentException("Reviewed baselines must be unique members of the selected inventory.", nameof(reviewedBaselines));
        var baselines = capturedBaselines.ToDictionary(x => x.RecipeId);

        // Bound a coherent read of committed destinations. A caller's unsaved
        // tracked draft is neither merge authority nor disposable inspection state.
        RequireOwnCurrentRecoveryTransaction();
        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(ct) : null;
        if (verifySelectedSchema)
        {
            var currentSchema = await LockCurrentRecoverySchemaAsync(ct);
            if (!currentSchema.Equals(expectedSchemaFingerprint, StringComparison.OrdinalIgnoreCase))
                throw new InvalidDataException("Selected recovery schema no longer matches the current destination.");
        }
        else if (db.Database.IsRelational())
            await db.Database.ExecuteSqlRawAsync("LOCK TABLE recipes IN SHARE MODE", ct);
        var destinations = await db.Recipes.IgnoreQueryFilters().AsNoTracking().Where(x => ids.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);
        var pending = await db.RecipeFilePublications.AsNoTracking().Where(x => ids.Contains(x.RecipeId) && !x.Delivered)
            .Select(x => x.RecipeId).ToListAsync(ct);
        var results = new List<CurrentRecoveryRecipeInspection>();
        var errors = new List<CurrentRecoveryDiagnostic>();
        foreach (var recipe in manifest.Recipes)
        {
            ct.ThrowIfCancellationRequested();
            CurrentRecipeRecoveryAssessment Deferred(string reason) => new("deferred", reason, Array.Empty<string>());
            CurrentRecipeRecoveryAssessment assessment;
            if (pending.Contains(recipe.RecipeId)) assessment = Deferred("pending-file-publication");
            else if (!destinations.TryGetValue(recipe.RecipeId, out var destination)) assessment = Deferred("missing-captured-membership");
            else if (destination.CanonicalContent is null) assessment = Deferred("destination-requires-forward-conversion");
            else
            {
                try
                {
                    var incoming = stagedRecipes.ReadContent(recipe.RecipeId);
                    var saved = new CanonicalRecipeExport(recipe.RecipeId, CanonicalRecipeContentStore.Read(destination)!, destination.RawMetadata);
                    if (saved.Content.Servings != destination.Servings) throw new InvalidDataException();
                    assessment = CurrentRecipeRecoveryAuthority.Assess(incoming, saved, baselines.GetValueOrDefault(recipe.RecipeId));
                }
                catch (Exception ex) when (ex is JsonException or InvalidDataException)
                {
                    errors.Add(new(recipe.Content, "invalid-destination-or-authority"));
                    continue;
                }
            }
            results.Add(new(recipe.RecipeId, assessment));
        }
        if (errors.Count != 0) throw new CurrentRecoveryPreflightException(errors.AsReadOnly());
        return new(inventory, results.AsReadOnly(), stagedRecipes, stagedHousehold);
    }
}
