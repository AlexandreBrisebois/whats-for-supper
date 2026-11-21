using System.Globalization;
using System.Numerics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed class FoodCategoryConflictException(string code, string? revision = null) : Exception(code)
{
    public string Code { get; } = code;
    public string? CategoryRevision { get; } = revision;
}

public sealed class HouseholdFoodOverrideStore(RecipeDbContext db, IClock clock, FoodVocabularyStore vocabulary,
    RecoveryBoundary boundary, GroceryRecomputeService groceries)
{
    // The caller supplies the captured manifest's actual singleton-household ID.
    // Recovery validates that binding against its source/destination household owner.
    public async Task<HouseholdFoodOverrideFeed> ReadRecoveryFeedAsync(Guid householdId, CancellationToken ct = default)
    {
        if (householdId == Guid.Empty) throw new InvalidDataException("Recovery household identity is absent.");
        return new(1, householdId, await ReadRecoveryRowsAsync(ct));
    }

    // Ordinary recovery binds these validated rows to its captured database
    // snapshot/generation; that format has no household identity to invent.
    public async Task<HouseholdFoodOverrideSnapshot[]> ReadRecoveryRowsAsync(CancellationToken ct = default)
    {
        var capture = await vocabulary.CapturePresentationAsync([], ct);
        return capture.Overrides.ToArray();
    }

    public async Task ReclassifyCategoryAsync(Guid foodId, string section, string? expectedRevision, CancellationToken ct = default)
    {
        if (foodId == Guid.Empty) throw new FoodCategoryConflictException("food_identity_conflict");
        await using var write = await boundary.EnterAsync(RecoveryAccess.Write, ct);
        await using (var presentation = await vocabulary.EnterPresentationLockAsync(write: true, ct))
        {
            await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
            var row = await db.HouseholdFoodOverrides.SingleOrDefaultAsync(x => x.FoodId == foodId, ct);
            if (row is not null) await db.Entry(row).ReloadAsync(ct);
            if (row?.Revision != expectedRevision) throw new FoodCategoryConflictException("food_category_conflict", row?.Revision);
            var candidates = (await db.Recipes.AsNoTracking().Where(x => x.CanonicalContent != null).ToArrayAsync(ct))
                .Where(recipe => CanonicalRecipeContentStore.Read(recipe)!.IngredientLines.Any(line => line.Shopping.FoodId == foodId))
                .OrderBy(x => x.Id).ToArray();
            RecipeFoodMapping? qualified = null;
            FoodVocabularyAuthority? qualifiedAuthority = null;
            foreach (var candidate in candidates)
            {
                var recipe = db.Database.IsNpgsql()
                    ? await db.Recipes.FromSql($"SELECT * FROM recipes WHERE id = {candidate.Id} FOR SHARE").AsNoTracking().SingleAsync(ct)
                    : candidate;
                var content = CanonicalRecipeContentStore.Read(recipe)!;
                if (!content.IngredientLines.Any(line => line.Shopping.FoodId == foodId)) continue;
                var authority = await vocabulary.CaptureAuthorityAsync(recipe.FoodMappingEvidence, ct);
                try { FoodMappingQualification.Validate(content, recipe.FoodMappingEvidence, authority, recipe.Id); }
                catch (InvalidDataException) { throw new FoodCategoryConflictException("food_identity_conflict"); }
                var evidence = recipe.FoodMappingEvidence is null ? null : FoodVocabularyDefinitions.ReadStrict<RecipeFoodMappingEvidence>(recipe.FoodMappingEvidence);
                qualified ??= evidence?.Mappings.FirstOrDefault(mapping => mapping.Facts.FoodId == foodId);
                qualifiedAuthority ??= authority;
            }
            if (qualified is null || qualifiedAuthority is null) throw new FoodCategoryConflictException("food_identity_conflict");
            if (row is not null)
            {
                var saved = HouseholdFoodOverrideSnapshot.From(row);
                var captures = qualifiedAuthority.Captures.ToList();
                if (saved.Document is { } retained && !captures.Any(x => x.Reference == retained)) captures.Add(await vocabulary.LoadCapturedAsync(retained, ct));
                HouseholdFoodOverrideValidation.Validate([saved], new(qualifiedAuthority.ActiveRef, captures.ToArray()));
            }
            var sequences = await db.HouseholdFoodOverrides.AsNoTracking().Select(x => x.PresentationSequence).ToArrayAsync(ct);
            var maximum = BigInteger.Zero;
            foreach (var text in sequences)
            {
                FoodVocabularyDefinitions.Require(BigInteger.TryParse(text, out var value) && value > 0 && value.ToString(CultureInfo.InvariantCulture) == text);
                maximum = BigInteger.Max(maximum, value);
            }
            if (row is null)
            {
                row = new() { Id = Guid.NewGuid(), FoodId = foodId, CreatedAt = clock.UtcNow };
                db.HouseholdFoodOverrides.Add(row);
            }
            row.Revision = Guid.NewGuid().ToString("D"); // Opaque; never an ordering operand.
            row.PresentationSequence = (maximum + 1).ToString(CultureInfo.InvariantCulture);
            row.DictionaryRevision = qualified.Facts.DictionaryRevision;
            row.DocumentRevision = qualified.VocabularyRevision;
            row.DocumentSha256 = qualified.VocabularySha256;
            row.GrocerySection = section;
            row.ProtectedFields = row.ProtectedFields.Append("grocerySection").Distinct(StringComparer.Ordinal).ToArray();
            row.UpdatedAt = clock.UtcNow;
            await db.SaveChangesAsync(ct);
            if (transaction is not null) await transaction.CommitAsync(ct);
        }
        // The independent presentation lock is released before recompute/SSE
        // snapshots; the recovery write lease still covers the full operation.
        await groceries.RecomputeForFoodAsync(foodId, ct);
    }
}
