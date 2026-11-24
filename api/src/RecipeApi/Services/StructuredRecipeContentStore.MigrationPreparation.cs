using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class StructuredRecipeContentStore
{
    // The same ordinary converter produces the complete candidate before any
    // plan write. Its IDs, revisions, mapping proof and timestamp are consumed
    // exactly once by the guarded commit, rather than regenerated after admission.
    internal async Task<StructuredRecipeOperation> PrepareMigrationConversionAsync(CanonicalMigrationRecipe item,
        DateTimeOffset recordedAt, CancellationToken ct)
    {
        RequireOperation(item.OperationId);
        var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == item.RecipeId, ct);
        Guard(recipe, item.ContentRevision, item.SourceRevision!);
        var authority = await vocabulary.CaptureAuthorityAsync(recipe.FoodMappingEvidence, ct);
        return PrepareConversionOperation(recipe, authority, item.OperationId, recordedAt);
    }

    private static StructuredRecipeOperation PrepareConversionOperation(Recipe recipe, FoodVocabularyAuthority authority,
        Guid operationId, DateTimeOffset recordedAt)
    {
        RequireOperation(operationId);
        FoodVocabularyDefinitions.Require(recordedAt != default);
        var expectedContentRevision = InspectContentRevision(recipe);
        var expectedSourceRevision = InspectSourceRevision(recipe);
        var hash = Hash(new { Kind = "convert", expectedContentRevision, expectedSourceRevision });
        var existing = Read(recipe);
        var content = existing ?? new StructuredRecipeContent(2, NewRevision(), expectedSourceRevision, recipe.Servings,
            ConvertLines(recipe, Guid.NewGuid), ConvertInstructions(recipe.RawMetadata, Guid.NewGuid, Guid.NewGuid, NewRevision));
        var mapped = existing is null
            ? FoodMappingQualification.Prepare(new(recipe.Id, content, recipe.RawMetadata), authority, operationId)
            : new FoodMappingPreparation(new(recipe.Id, content, recipe.RawMetadata), EvidenceValue(recipe), []);
        if (existing is null) _ = RecipeExportContent.WriteCurrent(mapped.Export);
        var result = new StructuredRecipeWriteResult(mapped.Export.Content, new Dictionary<string, Guid>());
        var operation = CreateV2(recipe, operationId, "convert", hash, Observe(recipe),
            EvidenceValue(recipe), authority, null, result, mapped.Evidence, recordedAt);
        _ = ValidateOriginalOperationV2(operation);
        return operation;
    }

    private static void RequirePreparedConversion(StructuredRecipeOperation operation, Recipe recipe,
        FoodVocabularyAuthority authority, Guid operationId, string callerHash)
    {
        _ = ValidateOriginalOperationV2(operation);
        var request = ReadOriginal<OriginalRequestV2>(operation.OriginalRequest!);
        FoodVocabularyDefinitions.Require(operation.RecipeId == recipe.Id && operation.OperationId == operationId
            && request.Kind == "convert" && request.CallerInputHash == callerHash
            && request.BaselineHash == Hash(Observe(recipe))
            && request.PriorEvidence.Value == EvidenceValue(recipe)
            && Hash(request.FoodAuthority) == Hash(authority) && operation.CreatedAt != default);
    }
    private async Task<StructuredRecipeWriteResult> ApplyPreparedConversionAsync(Recipe recipe, FoodVocabularyAuthority authority,
        Guid operationId, string hash, StructuredRecipeOperation? prepared, bool deferGroceryRefresh, CancellationToken ct)
    {
        var candidate = prepared is null
            ? PrepareConversionOperation(recipe, authority, operationId, clock.UtcNow)
            : FoodVocabularyDefinitions.ReadStrict<StructuredRecipeOperation>(JsonSerializer.Serialize(prepared, Json));
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
}
