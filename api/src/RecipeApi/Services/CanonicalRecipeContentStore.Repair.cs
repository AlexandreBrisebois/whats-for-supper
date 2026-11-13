using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class CanonicalRecipeContentStore
{
    // This bounded ingredient repair accepts no identity guess across reordered,
    // added, removed, duplicated or manually renamed source rows.
    internal static CanonicalRecipeExport PreparePhotoIngredientRepair(RecipePublicationFields captured, string raw, string revision)
    {
        var current = Read(new Recipe { Id = captured.Id, CanonicalContent = captured.CanonicalContent })
            ?? throw new InvalidDataException("Ingredient repair requires captured canonical content.");
        var old = PrepareFreshSource(captured.Id, captured.RawMetadata!, captured.SourceUrl).Content;
        var generated = PrepareFreshSource(captured.Id, raw, captured.SourceUrl);
        if (old.IngredientLines.Count != current.IngredientLines.Count || old.IngredientLines.Count != generated.Content.IngredientLines.Count
            || old.IngredientLines.Select(x => x.Description).Distinct(StringComparer.Ordinal).Count() != old.IngredientLines.Count)
            throw new RecipeContentReviewException("Changed ingredient membership requires explicit reconciliation.", ["ingredients"]);
        var lines = current.IngredientLines.Select((saved, index) =>
        {
            var original = old.IngredientLines[index];
            var next = generated.Content.IngredientLines[index];
            if (saved.Description != original.Description || next.Description != original.Description)
                throw new RecipeContentReviewException("Changed ingredient identity requires explicit reconciliation.", ["ingredients"]);
            if (saved.Provenance.Origin != "source" || saved.Provenance.ProtectedFields.Count != 0) return saved;
            if (saved.Provenance.SourceRef != current.SourceRevision || saved.Amount != original.Amount
                || saved.AmountText != original.AmountText || saved.Unit != original.Unit || saved.Scaling != original.Scaling
                || saved.Package != original.Package || saved.Shopping.Name != original.Shopping.Name)
                throw new InvalidDataException("Repair source row differs from its captured original evidence.");
            return next with { Id = saved.Id, Shopping = saved.Shopping };
        }).ToArray();
        // This operation selects ingredient repair only. The current declared
        // basis, instruction IDs/text/bindings and human fields remain owned by
        // their existing editor. Revalidation can invalidate stale relationships.
        var merged = current with
        {
            ContentRevision = revision,
            SourceRevision = generated.Content.SourceRevision,
            IngredientLines = lines
        };
        return generated with { Content = CookingStepProjection.Revalidate(current, merged) };
    }
}
