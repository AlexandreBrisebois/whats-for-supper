using System.Globalization;
using System.Numerics;
using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

/// <summary>Server-owned acknowledgement, retained until an actual uncheck.</summary>
internal sealed record GroceryCheckedDemand(GroceryQuantity? Quantity, bool? QuantityComplete,
    string? Unit, string DemandIdentity, string AcknowledgedAtRowVersion, string? InputFingerprint = null)
{
    internal static Dictionary<string, GroceryCheckedDemand?> Read(WeeklyPlan plan, ILogger logger)
    {
        var result = new Dictionary<string, GroceryCheckedDemand?>(StringComparer.Ordinal);
        try
        {
            using var document = JsonDocument.Parse(plan.GroceryCheckedDemandBaselines);
            if (document.RootElement.ValueKind != JsonValueKind.Object) throw new JsonException();
            foreach (var entry in document.RootElement.EnumerateObject())
            {
                try { result[entry.Name] = entry.Value.Deserialize<GroceryCheckedDemand>(); }
                catch (JsonException)
                {
                    logger.LogWarning("Invalid checked-demand baseline for grocery row {RowId}", entry.Name);
                    result[entry.Name] = null;
                }
            }
        }
        catch (JsonException)
        {
            logger.LogWarning("Invalid checked-demand baseline container for week {Monday}; comparisons remain unknown", plan.WeekStartDate);
        }
        return result;
    }

    internal static GroceryCheckedDemand Capture(GroceryLineItemDto row, string acknowledgedAt, string? inputFingerprint) =>
        new(row.ExactQuantity, row.QuantityComplete, row.UnitText, row.DemandIdentity, acknowledgedAt, inputFingerprint);

    internal bool IsValid => (Quantity is null || LegacyGroceryQuantity.IsCanonical(Quantity))
        && GroceryRowState.IsVersion(AcknowledgedAtRowVersion) && !string.IsNullOrEmpty(DemandIdentity);

    internal bool ProvesIncrease(GroceryLineItemDto current, string persistedRowVersion, string? inputFingerprint)
    {
        if (!IsValid || DemandIdentity != current.DemandIdentity || QuantityComplete != true || current.QuantityComplete != true
            || !GroceryRowState.IsVersion(persistedRowVersion)
            || ulong.Parse(AcknowledgedAtRowVersion, CultureInfo.InvariantCulture) > ulong.Parse(persistedRowVersion, CultureInfo.InvariantCulture)
            || Quantity is null || current.ExactQuantity is null) return false;
        // Unchanged original operands cannot prove increased demand merely because
        // a projection now retains a source fraction more precisely. The baseline
        // stays exactly as acknowledged, so real later amount/portion edits compare.
        if (InputFingerprint is not null && InputFingerprint == inputFingerprint) return false;
        var priorUnit = GroceryUnit.Read(Unit);
        var currentUnit = GroceryUnit.Read(current.UnitText);
        if (priorUnit.Bucket != currentUnit.Bucket) return false;
        var baseline = LegacyGroceryQuantity.Scale(Quantity, priorUnit.Numerator, priorUnit.Denominator);
        var demand = LegacyGroceryQuantity.Scale(current.ExactQuantity, currentUnit.Numerator, currentUnit.Denominator);
        if (baseline is null || demand is null) return false;
        var max = baseline.Value ?? baseline.Max!;
        var min = demand.Value ?? demand.Min!;
        return BigInteger.Parse(min.N, CultureInfo.InvariantCulture) * BigInteger.Parse(max.D, CultureInfo.InvariantCulture)
            > BigInteger.Parse(max.N, CultureInfo.InvariantCulture) * BigInteger.Parse(min.D, CultureInfo.InvariantCulture);
    }
}
