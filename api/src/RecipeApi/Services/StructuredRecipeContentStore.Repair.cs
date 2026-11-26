using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class StructuredRecipeContentStore
{
    // Preserves human-protected and unknown ingredient facts while allowing source-owned
    // rows to be renamed, reordered, added, or removed during guided repair.
    internal static StructuredRecipeExport PreparePhotoIngredientRepair(RecipePublicationFields captured, string raw, string revision)
    {
        var current = Read(new Recipe { Id = captured.Id, StructuredContent = captured.StructuredContent })
            ?? throw new InvalidDataException("Ingredient repair requires captured canonical content.");
        var generated = PrepareFreshSource(captured.Id, raw, captured.SourceUrl);

        static bool IsProtected(RecipeIngredientLineDto line) =>
            line.Provenance.Origin != "source" || line.Provenance.ProtectedFields.Count != 0;

        var hasProtectedLines = current.IngredientLines.Any(IsProtected);
        var generatedCounts = generated.Content.IngredientLines
            .GroupBy(x => x.Description, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.Count(), StringComparer.Ordinal);
        var uniqueSourceByDescription = current.IngredientLines
            .Where(x => !IsProtected(x))
            .GroupBy(x => x.Description, StringComparer.Ordinal)
            .Where(g => g.Count() == 1 && generatedCounts.GetValueOrDefault(g.Key) == 1)
            .ToDictionary(g => g.Key, g => g.Single(), StringComparer.Ordinal);

        var reusedIds = new HashSet<Guid>();
        RecipeIngredientLineDto ReuseUnchangedSourceIdentity(RecipeIngredientLineDto next) =>
            uniqueSourceByDescription.TryGetValue(next.Description, out var saved)
            && saved.Shopping.Name == next.Shopping.Name
            && reusedIds.Add(saved.Id)
                ? next with { Id = saved.Id, Shopping = saved.Shopping }
                : next;

        RecipeIngredientLineDto[] lines;
        if (!hasProtectedLines)
        {
            lines = generated.Content.IngredientLines.Select(ReuseUnchangedSourceIdentity).ToArray();
        }
        else
        {
            StructuredRecipeContent? old = null;
            if (!string.IsNullOrWhiteSpace(captured.RawMetadata))
            {
                try
                {
                    old = PrepareFreshSource(captured.Id, captured.RawMetadata, captured.SourceUrl).Content;
                }
                catch (Exception)
                {
                    old = null;
                }
            }

            var generatedLines = generated.Content.IngredientLines;
            var slots = new RecipeIngredientLineDto?[generatedLines.Count];
            var retainedProtected = new List<RecipeIngredientLineDto>();

            static int FindUnclaimedSlot(
                IReadOnlyList<RecipeIngredientLineDto> candidates,
                RecipeIngredientLineDto?[] allocated,
                Func<RecipeIngredientLineDto, bool> predicate)
            {
                for (var i = 0; i < candidates.Count; i++)
                {
                    if (allocated[i] is null && predicate(candidates[i]))
                        return i;
                }
                return -1;
            }

            for (var index = 0; index < current.IngredientLines.Count; index++)
            {
                var saved = current.IngredientLines[index];
                if (!IsProtected(saved)) continue;

                var originalDesc = old is not null && saved.Provenance.SourceRef == current.SourceRevision && index < old.IngredientLines.Count
                    ? old.IngredientLines[index].Description
                    : null;

                var slotIndex = -1;
                if (originalDesc is not null)
                {
                    slotIndex = FindUnclaimedSlot(generatedLines, slots, x => x.Description == originalDesc);
                    if (slotIndex < 0)
                        slotIndex = FindUnclaimedSlot(generatedLines, slots, x => string.Equals(x.Description, originalDesc, StringComparison.OrdinalIgnoreCase));
                }
                if (slotIndex < 0)
                    slotIndex = FindUnclaimedSlot(generatedLines, slots, x => x.Description == saved.Description);
                if (slotIndex < 0)
                    slotIndex = FindUnclaimedSlot(generatedLines, slots, x => string.Equals(x.Description, saved.Description, StringComparison.OrdinalIgnoreCase));

                if (slotIndex >= 0)
                    slots[slotIndex] = saved;
                else
                    retainedProtected.Add(saved);
            }

            for (var i = 0; i < slots.Length; i++)
            {
                slots[i] ??= ReuseUnchangedSourceIdentity(generatedLines[i]);
            }

            lines = [.. slots.OfType<RecipeIngredientLineDto>(), .. retainedProtected];
        }

        // This operation selects ingredient repair only. The current declared
        // basis (when human-protected rows exist), instruction IDs/text/bindings
        // and human fields remain owned by their existing editor.
        var merged = current with
        {
            ContentRevision = revision,
            SourceRevision = generated.Content.SourceRevision,
            Servings = hasProtectedLines ? current.Servings : generated.Content.Servings,
            IngredientLines = lines
        };
        return generated with { Content = CookingStepProjection.Revalidate(current, merged) };
    }
}
