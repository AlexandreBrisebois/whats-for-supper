using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using RecipeApi.Models;

namespace RecipeApi.Services;

/// <summary>
/// Recorded projection inputs, independent of numeric representation. Membership
/// can disprove a continuing aggregation; it cannot prove saved ingredient lineage.
/// </summary>
internal sealed record GroceryContributor(Guid OccurrenceId, Guid RecipeId, Guid IngredientLineId, string PurchaseIdentity)
{
    internal bool IsValid => OccurrenceId != Guid.Empty && RecipeId != Guid.Empty && IngredientLineId != Guid.Empty
        && PurchaseIdentity is { Length: 64 } && PurchaseIdentity.All(Uri.IsHexDigit);
}

internal sealed record GroceryDemandEvidence(string InputFingerprint, string[] Members, GroceryContributor[]? Contributors = null)
{
    internal static string Fingerprint<T>(T inputs) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(inputs))));

    internal bool IsValid => InputFingerprint is { Length: 64 } && InputFingerprint.All(Uri.IsHexDigit)
        && Members is { Length: > 0 } && Members.All(member => !string.IsNullOrWhiteSpace(member));

    // Only newly captured saved-row + occurrence evidence can prove continuation.
    // Old observed Members remain negative-only; never reconstruct missing lineage.
    internal bool HasLineage => Contributors is { Length: > 0 } && Contributors.All(x => x is { IsValid: true })
        && Contributors.Select(x => (x.OccurrenceId, x.RecipeId, x.IngredientLineId)).Distinct().Count() == Contributors.Length;

    internal bool SameLineage(GroceryDemandEvidence other) => HasLineage && other.HasLineage
        && Contributors!.Length == other.Contributors!.Length && Contributors.ToHashSet().SetEquals(other.Contributors);

    internal bool ChangesPurchaseMeaning(GroceryDemandEvidence other) => HasLineage && other.HasLineage
        && Contributors!.Any(left => other.Contributors!.Any(right => left.OccurrenceId == right.OccurrenceId
            && left.RecipeId == right.RecipeId && left.IngredientLineId == right.IngredientLineId
            && left.PurchaseIdentity != right.PurchaseIdentity));

    internal bool SharesSavedContributor(GroceryDemandEvidence other) => HasLineage && other.HasLineage
        && Contributors!.Any(left => other.Contributors!.Any(right => left.OccurrenceId == right.OccurrenceId
            && left.RecipeId == right.RecipeId && left.IngredientLineId == right.IngredientLineId));

    internal static Dictionary<string, GroceryDemandEvidence> Read(WeeklyPlan plan, ILogger logger)
    {
        var result = new Dictionary<string, GroceryDemandEvidence>(StringComparer.Ordinal);
        try
        {
            using var document = JsonDocument.Parse(plan.GroceryDemandEvidence);
            if (document.RootElement.ValueKind != JsonValueKind.Object) throw new JsonException();
            foreach (var entry in document.RootElement.EnumerateObject())
            {
                try
                {
                    if (entry.Value.Deserialize<GroceryDemandEvidence>() is { IsValid: true } evidence) result[entry.Name] = evidence;
                    else logger.LogWarning("Invalid grocery input evidence for row {RowId}", entry.Name);
                }
                catch (JsonException) { logger.LogWarning("Invalid grocery input evidence for row {RowId}", entry.Name); }
            }
        }
        catch (JsonException) { logger.LogWarning("Invalid grocery input evidence for week {Monday}", plan.WeekStartDate); }
        return result;
    }
}
