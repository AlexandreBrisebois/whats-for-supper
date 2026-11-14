using System.Globalization;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed record CurrentRecoverySetting(Guid Id, string Key, JsonElement Value, DateTimeOffset UpdatedAt);
public sealed record CurrentRecoveryGoToItem(Guid RecipeId, string Description, string? ImageUrl, string? Status);
public sealed record CurrentRecoveryGoTo(CurrentRecoveryGoToItem[] Items);
public sealed record CurrentRecoveryDefault(int? Servings, Guid Version);
public sealed record CurrentRecoveryGroceryRow(string RowId, string RowVersion, DateOnly WeekStartDate, string Source,
    string DemandIdentity, string DisplayName, string NormalizedKey, string Section, GroceryQuantity? Quantity,
    string? UnitText, Guid[] RecipeIds, bool? QuantityComplete);
public sealed record CurrentRecoveryCheckedDemand(GroceryQuantity? Quantity, bool? QuantityComplete, string? Unit,
    string DemandIdentity, string AcknowledgedAtRowVersion, string? InputFingerprint);
public sealed record CurrentRecoveryDemandEvidence(string InputFingerprint, string[] Members);
// Inert historical storage, explicitly separated from current row acknowledgements.
// Strings retain the original persisted JSON, including numeric token spelling.
public sealed record CurrentRecoveryLegacyGrocery(string Items, string State, string CheckedDemandBaselines, string DemandEvidence);
public sealed record CurrentRecoveryPlan(Guid Id, DateOnly WeekStartDate, WeeklyPlanStatus Status,
    Guid? VotingRoundId, Guid? LastClosedRoundId, bool RequiresRoundIdentity, DateTimeOffset? NotifiedAt,
    DateTimeOffset CreatedAt, string GroceryListVersion, CurrentRecoveryGroceryRow[] GroceryItems,
    Dictionary<string, bool> GroceryState, Dictionary<string, CurrentRecoveryCheckedDemand?> GroceryCheckedDemandBaselines,
    Dictionary<string, CurrentRecoveryDemandEvidence> GroceryDemandEvidence, string? ServingInputVersion,
    string? ServingAppliedVersion, string? ServingRefreshStatus, Guid? ServingRefreshWorkflowId, string? GroceryResetSummaryVersion,
    CurrentRecoveryLegacyGrocery? LegacyGrocery);

public sealed partial class CurrentRecoveryHouseholdState
{
    public CurrentRecoverySetting[] ReadSettings() => Read<CurrentRecoverySetting[]>("family-settings");
    public CurrentRecoveryPlan[] ReadPlans() => Read<CurrentRecoveryPlan[]>("weekly-plans");

    private void ValidatePlannerState(HashSet<Guid> recipeIds, CurrentRecoveryServings? servings,
        List<CurrentRecoveryDiagnostic> errors, CancellationToken ct)
    {
        static void Check([DoesNotReturnIf(false)] bool valid) { if (!valid) throw new InvalidDataException(); }
        static bool Text(string? value) => !string.IsNullOrWhiteSpace(value);
        static bool Fingerprint(string? value) => value is { Length: 64 } && value.All(Uri.IsHexDigit);
        void Inspect(string kind, Action inspect)
        {
            ct.ThrowIfCancellationRequested();
            try { inspect(); }
            catch (Exception ex) when (ex is JsonException or InvalidDataException or ArgumentException or OverflowException)
            { errors.Add(new(_paths[kind], "invalid-current-" + kind)); }
        }
        Inspect("family-settings", () =>
        {
            var settings = ReadSettings();
            var ids = new HashSet<Guid>(); var keys = new HashSet<string>(StringComparer.Ordinal);
            CurrentRecoverySetting? savedDefault = null;
            foreach (var setting in settings)
            {
                ct.ThrowIfCancellationRequested();
                Check(setting is not null && setting.Id != Guid.Empty && ids.Add(setting.Id) && Text(setting.Key)
                    && keys.Add(setting.Key) && setting.UpdatedAt != default && setting.Value.ValueKind != JsonValueKind.Undefined);
                if (setting!.Key == SupperServingsService.DefaultKey)
                {
                    savedDefault = setting;
                    var value = setting.Value.Deserialize<CurrentRecoveryDefault>(Json) ?? throw new InvalidDataException();
                    Check(value.Version != Guid.Empty);
                    // The same saved fact is also carried by the existing serving
                    // envelope. A derived roster count must never replace null.
                    Check(SupperServingsService.ValidateDefaultSetting(setting.Value) == value.Servings);
                    if (servings is not null) Check(value.Servings == servings.DefaultServings
                        && value.Version == servings.DefaultVersion && setting.UpdatedAt == servings.DefaultUpdatedAt);
                }
                else if (setting.Key == "family_goto")
                {
                    var value = setting.Value.Deserialize<CurrentRecoveryGoTo>(Json) ?? throw new InvalidDataException();
                    Check(value.Items is not null);
                    foreach (var item in value.Items!)
                    {
                        ct.ThrowIfCancellationRequested();
                        Check(item is not null && recipeIds.Contains(item.RecipeId) && item.Description is not null);
                    }
                }
                // SettingsService permits arbitrary household keys and JSON values.
                // Retain unknown values exactly as data; never supply defaults or
                // interpret them as workflow, member or dictionary authority.
            }
            if (servings is not null) Check((savedDefault is null) == (servings.DefaultVersion is null));
        });
        Inspect("weekly-plans", () =>
        {
            var plans = ReadPlans();
            var ids = new HashSet<Guid>(); var weeks = new HashSet<DateOnly>(); var rowIds = new HashSet<Guid>();
            foreach (var plan in plans)
            {
                ct.ThrowIfCancellationRequested();
                Check(plan is not null && plan.Id != Guid.Empty && ids.Add(plan.Id) && plan.WeekStartDate != default
                    && plan.WeekStartDate.DayOfWeek == DayOfWeek.Monday && weeks.Add(plan.WeekStartDate)
                    && Enum.IsDefined(plan.Status) && plan.CreatedAt != default && plan.NotifiedAt != default(DateTimeOffset)
                    && plan.VotingRoundId != Guid.Empty && plan.LastClosedRoundId != Guid.Empty
                    && plan.ServingRefreshWorkflowId != Guid.Empty && GroceryRowState.IsVersion(plan.GroceryListVersion)
                    && plan.ServingRefreshStatus is null or "current" or "updating" or "failed"
                    && (plan.ServingInputVersion is null || Text(plan.ServingInputVersion))
                    && (plan.ServingAppliedVersion is null || Text(plan.ServingAppliedVersion))
                    && (plan.GroceryResetSummaryVersion is null || Text(plan.GroceryResetSummaryVersion))
                    && plan.GroceryItems is not null && plan.GroceryState is not null
                    && plan.GroceryCheckedDemandBaselines is not null && plan.GroceryDemandEvidence is not null);
                if (plan.LegacyGrocery is { } legacy)
                {
                    // The recovery/migration owner must still refuse an active
                    // legacy list at cutover. Staging history never upgrades it
                    // or supplies row IDs/checked-demand evidence from names.
                    Check(plan.GroceryItems.Length == 0 && plan.GroceryState.Count == 0
                        && plan.GroceryCheckedDemandBaselines.Count == 0 && plan.GroceryDemandEvidence.Count == 0);
                    ValidateLegacyGrocery(legacy, recipeIds, ct);
                }
                var rows = new Dictionary<string, CurrentRecoveryGroceryRow>(StringComparer.Ordinal);
                foreach (var row in plan!.GroceryItems)
                {
                    ct.ThrowIfCancellationRequested();
                    Check(row is not null && Guid.TryParse(row.RowId, out var id) && id != Guid.Empty && rowIds.Add(id)
                        && rows.TryAdd(row.RowId, row) && GroceryRowState.IsVersion(row.RowVersion)
                        && row.WeekStartDate == plan.WeekStartDate && row.Source == "recipe" && Text(row.DemandIdentity)
                        && Text(row.DisplayName) && Text(row.NormalizedKey) && GrocerySections.IsCanonicalName(row.Section)
                        && (row.Quantity is null || LegacyGroceryQuantity.IsCanonical(row.Quantity))
                        && row.RecipeIds is { Length: > 0 } && row.RecipeIds.Distinct().Count() == row.RecipeIds.Length
                        && row.RecipeIds.All(recipeIds.Contains));
                }
                Check(plan.GroceryState.Keys.All(rows.ContainsKey));
                foreach (var (rowId, baseline) in plan.GroceryCheckedDemandBaselines)
                {
                    ct.ThrowIfCancellationRequested();
                    Check(rows.TryGetValue(rowId, out var row));
                    // Missing/null acknowledgement is honest unknown history. It
                    // cannot be reconstructed from today's row or evidence.
                    if (baseline is null) continue;
                    Check(plan.GroceryState.GetValueOrDefault(rowId) && Text(baseline.DemandIdentity)
                        && GroceryRowState.IsVersion(baseline.AcknowledgedAtRowVersion)
                        && ulong.Parse(baseline.AcknowledgedAtRowVersion, CultureInfo.InvariantCulture)
                            <= ulong.Parse(row!.RowVersion, CultureInfo.InvariantCulture)
                        && (baseline.Quantity is null || LegacyGroceryQuantity.IsCanonical(baseline.Quantity))
                        && (baseline.InputFingerprint is null || Fingerprint(baseline.InputFingerprint)));
                    // A continuing row can have incomparable units/identity after
                    // a separately proven change. Preserve the captured baseline.
                }
                foreach (var (rowId, evidence) in plan.GroceryDemandEvidence)
                {
                    ct.ThrowIfCancellationRequested();
                    Check(rows.ContainsKey(rowId) && evidence is not null && Fingerprint(evidence.InputFingerprint)
                        && evidence.Members is { Length: > 0 } && evidence.Members.All(Text));
                    // Observed membership remains negative evidence only. Never
                    // turn these strings into saved ingredient lineage.
                }
            }
        });
    }

    private static void ValidateLegacyGrocery(CurrentRecoveryLegacyGrocery legacy, HashSet<Guid> recipeIds, CancellationToken ct)
    {
        static void Check([DoesNotReturnIf(false)] bool valid) { if (!valid) throw new InvalidDataException(); }
        static void Unique(JsonElement value)
        {
            if (value.ValueKind == JsonValueKind.Object)
            {
                var names = new HashSet<string>(StringComparer.Ordinal);
                foreach (var property in value.EnumerateObject()) { Check(names.Add(property.Name)); Unique(property.Value); }
            }
            else if (value.ValueKind == JsonValueKind.Array) foreach (var item in value.EnumerateArray()) Unique(item);
        }
        using var items = JsonDocument.Parse(legacy.Items);
        using var state = JsonDocument.Parse(legacy.State);
        using var baselines = JsonDocument.Parse(legacy.CheckedDemandBaselines);
        using var evidence = JsonDocument.Parse(legacy.DemandEvidence);
        foreach (var document in new[] { items, state, baselines, evidence }) Unique(document.RootElement);
        Check(items.RootElement.ValueKind == JsonValueKind.Array && state.RootElement.ValueKind == JsonValueKind.Object
            && baselines.RootElement.ValueKind == JsonValueKind.Object && !baselines.RootElement.EnumerateObject().Any()
            && evidence.RootElement.ValueKind == JsonValueKind.Object && !evidence.RootElement.EnumerateObject().Any());
        foreach (var row in items.RootElement.EnumerateArray())
        {
            ct.ThrowIfCancellationRequested();
            Check(row.ValueKind == JsonValueKind.Object && row.EnumerateObject().All(p => p.Name is
                "displayName" or "normalizedKey" or "section" or "quantity" or "unitText" or "recipeIds"
                or "quantityComplete" or "checkReviewReason" or "rowId" or "rowVersion" or "weekStartDate" or "demandIdentity" or "source"));
            foreach (var field in new[] { "displayName", "normalizedKey", "section" })
                Check(row.TryGetProperty(field, out var value) && value.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(value.GetString()));
            Check(GrocerySections.IsCanonicalName(row.GetProperty("section").GetString()));
            // A populated saved row identity belongs to current typed rows. It
            // cannot be smuggled through the historical name-check representation.
            Check(!row.TryGetProperty("rowId", out var id) || id.ValueKind == JsonValueKind.Null
                || id.ValueKind == JsonValueKind.String && string.IsNullOrEmpty(id.GetString()));
            Check(row.TryGetProperty("recipeIds", out var ids) && ids.ValueKind == JsonValueKind.Array);
            foreach (var recipe in ids.EnumerateArray()) Check(recipe.ValueKind == JsonValueKind.String
                && recipe.TryGetGuid(out var recipeId) && recipeIds.Contains(recipeId));
            if (row.TryGetProperty("quantity", out var quantity) && quantity.ValueKind != JsonValueKind.Null)
                Check(quantity.ValueKind == JsonValueKind.Number
                    ? quantity.TryGetDouble(out var number) && double.IsFinite(number) && number >= 0
                    : quantity.ValueKind == JsonValueKind.Object && LegacyGroceryQuantity.IsCanonical(quantity.Deserialize<GroceryQuantity>(Json)));
            foreach (var field in new[] { "unitText", "checkReviewReason" })
                Check(!row.TryGetProperty(field, out var value) || value.ValueKind is JsonValueKind.String or JsonValueKind.Null);
            Check(!row.TryGetProperty("quantityComplete", out var complete) || complete.ValueKind is JsonValueKind.True or JsonValueKind.False or JsonValueKind.Null);
        }
        foreach (var entry in state.RootElement.EnumerateObject())
            Check(!string.IsNullOrWhiteSpace(entry.Name) && entry.Value.ValueKind is JsonValueKind.True or JsonValueKind.False);
    }
}
