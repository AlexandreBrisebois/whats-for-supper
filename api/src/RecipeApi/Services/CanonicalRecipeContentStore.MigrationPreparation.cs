using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

internal interface IV1MigrationConversionAdmission
{
    void Validate(CancellationToken ct);
    Task CheckpointAsync(string point, CancellationToken ct);
    Task LockAsync(RecipeApi.Data.RecipeDbContext db, CancellationToken ct);
    V1AuthorityTransitionContext Context();
    Task<string> AdmitAsync(V1AuthorityTransitionContext context, CancellationToken ct, bool revalidateSource = true);
}

public sealed partial class CanonicalRecipeContentStore
{
    // The same ordinary converter produces the complete candidate before any
    // plan write. Its IDs, revisions, mapping proof and timestamp are consumed
    // exactly once by the guarded commit, rather than regenerated after admission.
    internal async Task<CanonicalRecipeOperation> PrepareMigrationConversionAsync(CanonicalMigrationRecipe item,
        DateTimeOffset recordedAt, CancellationToken ct, V1AuthorityTransitionContext? transition = null)
    {
        RequireOperation(item.OperationId);
        var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == item.RecipeId, ct);
        Guard(recipe, item.ContentRevision, item.SourceRevision!);
        var authority = await vocabulary.CaptureAuthorityAsync(recipe.FoodMappingEvidence, ct, transition);
        return PrepareConversionOperation(recipe, authority, item.OperationId, recordedAt);
    }

    internal async Task RequireMigrationPreparationAsync(CanonicalMigrationRecipe item, CanonicalRecipeOperation prepared,
        V1AuthorityTransitionContext transition, CancellationToken ct)
    {
        var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == item.RecipeId, ct);
        Guard(recipe, item.ContentRevision, item.SourceRevision!);
        var authority = await vocabulary.CaptureAuthorityAsync(recipe.FoodMappingEvidence, ct, transition);
        var expectedContentRevision = item.ContentRevision;
        var expectedSourceRevision = item.SourceRevision;
        RequirePreparedConversion(prepared, recipe, authority, item.OperationId, Hash(new { Kind = "convert", expectedContentRevision, expectedSourceRevision }));
    }

    internal static async Task RequireOriginalPreparedConversionAsync(RecipeApi.Data.RecipeDbContext originalDb,
        CanonicalMigrationRecipe item, CanonicalRecipeOperation prepared, FoodVocabularyInventoryFacts originalFacts, CancellationToken ct)
    {
        FoodVocabularyDefinitions.Require(originalFacts.Membership.RawJson is null);
        var recipe = await originalDb.Recipes.AsNoTracking().SingleAsync(x => x.Id == item.RecipeId, ct);
        Guard(recipe, item.ContentRevision, item.SourceRevision!);
        FoodVocabularyDefinitions.Require(recipe.FoodMappingEvidence is null);
        var expectedContentRevision = item.ContentRevision;
        var expectedSourceRevision = item.SourceRevision;
        RequirePreparedConversion(prepared, recipe, new FoodVocabularyAuthority(null, []), item.OperationId,
            Hash(new { Kind = "convert", expectedContentRevision, expectedSourceRevision }));
    }

    private static CanonicalRecipeOperation PrepareConversionOperation(Recipe recipe, FoodVocabularyAuthority authority,
        Guid operationId, DateTimeOffset recordedAt)
    {
        RequireOperation(operationId);
        FoodVocabularyDefinitions.Require(recordedAt != default);
        var expectedContentRevision = InspectContentRevision(recipe);
        var expectedSourceRevision = InspectSourceRevision(recipe);
        var hash = Hash(new { Kind = "convert", expectedContentRevision, expectedSourceRevision });
        var existing = Read(recipe);
        var content = existing ?? new CanonicalRecipeContent(2, NewRevision(), expectedSourceRevision, recipe.Servings,
            ConvertLines(recipe, Guid.NewGuid), ConvertInstructions(recipe.RawMetadata, Guid.NewGuid, Guid.NewGuid, NewRevision));
        var mapped = existing is null
            ? FoodMappingQualification.Prepare(new(recipe.Id, content, recipe.RawMetadata), authority, operationId)
            : new FoodMappingPreparation(new(recipe.Id, content, recipe.RawMetadata), EvidenceValue(recipe), []);
        if (existing is null) _ = RecipeExportContent.WriteCurrent(mapped.Export);
        var result = new CanonicalRecipeWriteResult(mapped.Export.Content, new Dictionary<string, Guid>());
        var operation = CreateV2(recipe, operationId, "convert", hash, RecipeFilePublicationStore.Observe(recipe),
            EvidenceValue(recipe), authority, null, result, mapped.Evidence, recordedAt);
        _ = ValidateOriginalOperationV2(operation);
        return operation;
    }

    private static void RequirePreparedConversion(CanonicalRecipeOperation operation, Recipe recipe,
        FoodVocabularyAuthority authority, Guid operationId, string callerHash)
    {
        _ = ValidateOriginalOperationV2(operation);
        var request = ReadOriginal<OriginalRequestV2>(operation.OriginalRequest!);
        FoodVocabularyDefinitions.Require(operation.RecipeId == recipe.Id && operation.OperationId == operationId
            && request.Kind == "convert" && request.CallerInputHash == callerHash
            && request.BaselineHash == Hash(RecipeFilePublicationStore.Observe(recipe))
            && request.PriorEvidence.Value == EvidenceValue(recipe)
            && Hash(request.FoodAuthority) == Hash(authority) && operation.CreatedAt != default);
    }
    private async Task<CanonicalRecipeWriteResult> ApplyPreparedConversionAsync(Recipe recipe, FoodVocabularyAuthority authority,
        Guid operationId, string hash, CanonicalRecipeOperation? prepared, bool deferGroceryRefresh, CancellationToken ct)
    {
        var candidate = prepared is null
            ? PrepareConversionOperation(recipe, authority, operationId, clock.UtcNow)
            : FoodVocabularyDefinitions.ReadStrict<CanonicalRecipeOperation>(JsonSerializer.Serialize(prepared, Json));
        RequirePreparedConversion(candidate, recipe, authority, operationId, hash);
        var saved = ReadOriginal<CanonicalResultV2>(candidate.Result);
        var result = saved.Result;
        var converting = Read(recipe) is null;
        if (converting)
        {
            recipe.FoodMappingEvidence = saved.Evidence.Value;
            recipe.CanonicalContent = JsonSerializer.Serialize(result.Content, Json);
            recipe.Ingredients = JsonSerializer.Serialize(result.Content.IngredientLines.Select(Render));
            recipe.UpdatedAt = candidate.CreatedAt;
        }
        db.CanonicalRecipeOperations.Add(candidate);
        if (converting) await Invalidate(recipe, ct, deferGroceryRefresh: deferGroceryRefresh);
        else await db.SaveChangesAsync(ct);
        return result;
    }

    internal async Task<CanonicalRecipeWriteResult> CommitTransitionConversionAsync(CanonicalMigrationRecipe item,
        CanonicalRecipeOperation prepared, IV1MigrationConversionAdmission admission, CancellationToken ct)
    {
        prepared = FoodVocabularyDefinitions.ReadStrict<CanonicalRecipeOperation>(JsonSerializer.Serialize(prepared, Json));
        admission.Validate(ct);
        await admission.CheckpointAsync("v1-transition-C-before-lock", ct);
        await using var transaction = await RecipeRotation.LockAsync(db, item.RecipeId, ct, lockSupperInputs: true);
        await admission.LockAsync(db, ct);
        using var transition = admission.Context();
        await admission.CheckpointAsync("v1-transition-C-locked", ct);
        var state = await admission.AdmitAsync(transition, ct, revalidateSource: false);
        var recipe = await db.Recipes.SingleAsync(x => x.Id == item.RecipeId, ct);
        var previous = await db.CanonicalRecipeOperations.AsNoTracking().SingleOrDefaultAsync(x =>
            x.RecipeId == item.RecipeId && x.OperationId == item.OperationId, ct);
        if (previous is not null)
        {
            _ = transition.References(previous);
            await transaction!.RollbackAsync(ct);
            return ReadValidatedRetainedResult(previous);
        }
        FoodVocabularyDefinitions.Require(state == "B");
        var authority = await vocabulary.CaptureAuthorityAsync(recipe.FoodMappingEvidence, ct, transition);
        Guard(recipe, item.ContentRevision, item.SourceRevision!);
        await vocabulary.ValidateLiveAuthorityAsync(authority, ct);
        var expectedContentRevision = item.ContentRevision;
        var expectedSourceRevision = item.SourceRevision;
        await admission.CheckpointAsync("v1-transition-C-before-save", ct); admission.Validate(ct);
        var result = await ApplyPreparedConversionAsync(recipe, authority, item.OperationId,
            Hash(new { Kind = "convert", expectedContentRevision, expectedSourceRevision }), prepared, true, ct);
        await admission.CheckpointAsync("v1-transition-C-after-save", ct);
        await admission.CheckpointAsync("v1-transition-C-before-commit", ct);
        FoodVocabularyDefinitions.Require(await admission.AdmitAsync(transition, ct) == "C");
        admission.Validate(ct); await transaction!.CommitAsync(ct);
        await admission.CheckpointAsync("v1-transition-C-after-commit", ct);
        return result;
    }
}
