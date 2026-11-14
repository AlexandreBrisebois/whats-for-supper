using System.Text.Json;
using System.Text.RegularExpressions;
using System.Security.Cryptography;
using System.Text;

namespace RecipeApi.Services;

public sealed record CanonicalMigrationColumn(string Name, string Sha256);
public sealed record CanonicalMigrationRow(string Key, string Sha256, IReadOnlyList<CanonicalMigrationColumn> Columns);
public sealed record CanonicalMigrationTable(string Name, IReadOnlyList<string> KeyColumns, IReadOnlyList<CanonicalMigrationRow> Rows, string Sha256);
public sealed record CanonicalMigrationDifference(string Scope, string Table, string Key, string? Column);
public sealed record CanonicalMigrationWeek(DateOnly WeekStart, IReadOnlyList<Guid> StoredPlanIds, IReadOnlyList<Guid> AssignmentIds);
public sealed record CanonicalMigrationSelection(Guid RecipeId, Guid OperationId);
public sealed record CanonicalMigrationRequest(Guid OperationId, string CandidateSha256, string SchemaSha256, string ModelRevision,
    Guid SnapshotId, IReadOnlyList<CanonicalMigrationSelection> Selected);
public sealed record CanonicalMigrationSourceSnapshot(Guid SnapshotId, string ManifestSha256, string? Generation,
    string VocabularyIndexSha256, IReadOnlyList<FoodVocabularyReference> References);
public sealed record CanonicalMigrationFile(string Path, long Length, string Sha256);
public sealed record CanonicalMigrationRecipe(Guid RecipeId, Guid OperationId, string Status, string? Reason,
    string? ContentRevision, string? SourceRevision, string? OriginalFieldsSha256, int? IngredientCount,
    int? StepCount, int? BindingCount, IReadOnlyList<string> FilePaths);
public sealed record CanonicalMigrationInventory(int Version, CanonicalMigrationRequest Request,
    CanonicalMigrationSourceSnapshot SourceSnapshot, string LiveSchemaSha256, string? LiveGeneration,
    IReadOnlyList<FoodVocabularyReference> RequiredReferences, IReadOnlyList<CanonicalMigrationTable> Tables,
    IReadOnlyList<CanonicalMigrationFile> Files, IReadOnlyList<CanonicalMigrationRecipe> Recipes,
    IReadOnlyList<CanonicalMigrationWeek> Weeks, string ObservationSha256, DateOnly EvaluationDate = default);

public static class CanonicalRecipeMigrationManifest
{
    public static IReadOnlyList<string> GroceryDerivedColumns { get; } = Array.AsReadOnly(new[] {
        "grocery_items", "grocery_state", "grocery_checked_demand_baselines", "grocery_demand_evidence", "grocery_list_version",
        "serving_input_version", "serving_applied_version", "serving_refresh_status", "serving_refresh_workflow_id", "grocery_reset_summary_version" });

    public static CanonicalMigrationRequest FreezeRequest(CanonicalMigrationRequest request)
    {
        static bool Sha(string text) => Regex.IsMatch(text ?? "", "^[a-f0-9]{64}$", RegexOptions.CultureInvariant);
        Require(request.OperationId != Guid.Empty && request.SnapshotId != Guid.Empty && Sha(request.CandidateSha256)
            && Sha(request.SchemaSha256) && !string.IsNullOrWhiteSpace(request.ModelRevision) && request.Selected is { Count: > 0 }, "Migration identity is incomplete.");
        Require(request.Selected.All(x => x is not null && x.RecipeId != Guid.Empty && x.OperationId != Guid.Empty && x.OperationId != request.OperationId)
            && request.Selected.Select(x => x.RecipeId).Distinct().Count() == request.Selected.Count
            && request.Selected.Select(x => x.OperationId).Distinct().Count() == request.Selected.Count, "Selected recipe or operation identity is duplicated or absent.");
        return request with { Selected = Array.AsReadOnly(request.Selected.OrderBy(x => x.RecipeId).ToArray()) };
    }

    public static CanonicalMigrationTable ObserveTable(string name, IReadOnlyList<string> keyColumns, JsonElement rows)
    {
        Require(Regex.IsMatch(name, "^[A-Za-z_][A-Za-z0-9_]*$", RegexOptions.CultureInvariant)
            && keyColumns.Count > 0 && keyColumns.Distinct(StringComparer.Ordinal).Count() == keyColumns.Count
            && rows.ValueKind == JsonValueKind.Array, "Table identity or stable keys are absent.");
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var observed = new List<CanonicalMigrationRow>();
        foreach (var row in rows.EnumerateArray())
        {
            Require(row.ValueKind == JsonValueKind.Object, "A table row is not an object.");
            var names = row.EnumerateObject().Select(x => x.Name).ToArray();
            Require(names.Distinct(StringComparer.Ordinal).Count() == names.Length, "Duplicate row property.");
            var keys = keyColumns.Select(key =>
            {
                Require(row.TryGetProperty(key, out var value) && value.ValueKind is not (JsonValueKind.Null or JsonValueKind.Undefined), "Stable row key is absent.");
                return value;
            }).ToArray();
            var identity = CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(keys));
            Require(seen.Add(identity), "Duplicate stable row identity.");
            var columns = row.EnumerateObject().OrderBy(x => x.Name, StringComparer.Ordinal)
                .Select(x => new CanonicalMigrationColumn(x.Name, Hash(x.Value.GetRawText()))).ToArray();
            observed.Add(new(identity, Hash(row.GetRawText()), Array.AsReadOnly(columns)));
        }
        var ordered = observed.OrderBy(x => x.Key, StringComparer.Ordinal).ToArray();
        return new(name, Array.AsReadOnly(keyColumns.ToArray()), Array.AsReadOnly(ordered),
            Hash(JsonSerializer.Serialize(ordered.Select(x => new { x.Key, x.Sha256 }))));
    }

    // Classification is evidence, never permission to reset or accept a change.
    // Even declared grocery-derived differences remain in the returned report.
    public static IReadOnlyList<CanonicalMigrationDifference> CompareTables(IReadOnlyList<CanonicalMigrationTable> before, IReadOnlyList<CanonicalMigrationTable> after)
    {
        Require(before.Select(x => x.Name).Distinct(StringComparer.Ordinal).Count() == before.Count
            && after.Select(x => x.Name).Distinct(StringComparer.Ordinal).Count() == after.Count, "Duplicate table observations.");
        var differences = new List<CanonicalMigrationDifference>();
        foreach (var name in before.Select(x => x.Name).Union(after.Select(x => x.Name)).Order(StringComparer.Ordinal))
        {
            var left = before.SingleOrDefault(x => x.Name == name);
            var right = after.SingleOrDefault(x => x.Name == name);
            if (left is null || right is null || !left.KeyColumns.SequenceEqual(right.KeyColumns))
            { differences.Add(new("membership", name, "", null)); continue; }
            foreach (var key in left.Rows.Select(x => x.Key).Union(right.Rows.Select(x => x.Key)).Order(StringComparer.Ordinal))
            {
                var old = left.Rows.SingleOrDefault(x => x.Key == key);
                var current = right.Rows.SingleOrDefault(x => x.Key == key);
                if (old is null || current is null) { differences.Add(new("membership", name, key, null)); continue; }
                foreach (var column in old.Columns.Select(x => x.Name).Union(current.Columns.Select(x => x.Name)).Order(StringComparer.Ordinal))
                {
                    if (old.Columns.SingleOrDefault(x => x.Name == column)?.Sha256 == current.Columns.SingleOrDefault(x => x.Name == column)?.Sha256) continue;
                    differences.Add(new(name == "weekly_plans" && GroceryDerivedColumns.Contains(column, StringComparer.Ordinal)
                        ? "grocery-derived" : "protected", name, key, column));
                }
            }
        }
        return differences.AsReadOnly();
    }

    public static IReadOnlyList<CanonicalMigrationWeek> ObserveWeeks(JsonElement plans, JsonElement events)
    {
        Require(plans.ValueKind == JsonValueKind.Array && events.ValueKind == JsonValueKind.Array, "Week observations are absent.");
        var result = new SortedDictionary<DateOnly, (List<Guid> Plans, List<Guid> Events)>();
        var planIds = new HashSet<Guid>(); var eventIds = new HashSet<Guid>();
        void Add(DateOnly monday, Guid id, bool plan)
        {
            if (!result.TryGetValue(monday, out var value)) result.Add(monday, value = ([], []));
            if (plan) value.Plans.Add(id); else value.Events.Add(id);
        }
        static DateOnly Date(JsonElement row, string key)
        {
            Require(row.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String
                && DateOnly.TryParseExact(value.GetString(), "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None, out _), "Business date is invalid.");
            return DateOnly.ParseExact(value.GetString()!, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        }
        static Guid Id(JsonElement row)
        {
            Require(row.TryGetProperty("id", out var value) && value.ValueKind == JsonValueKind.String
                && value.TryGetGuid(out var id) && id != Guid.Empty, "Week source identity is absent.");
            return value.GetGuid();
        }
        foreach (var plan in plans.EnumerateArray())
        {
            var monday = Date(plan, "week_start_date"); var id = Id(plan);
            Require(monday.DayOfWeek == DayOfWeek.Monday && planIds.Add(id), "Stored week or plan identity is invalid.");
            Add(monday, id, true);
        }
        foreach (var item in events.EnumerateArray())
        {
            var date = Date(item, "date"); var id = Id(item);
            Require(eventIds.Add(id) && item.TryGetProperty("recipe_id", out _), "Calendar source identity is invalid.");
            var recipe = item.GetProperty("recipe_id");
            if (recipe.ValueKind == JsonValueKind.Null) continue;
            Require(recipe.ValueKind == JsonValueKind.String && recipe.TryGetGuid(out var recipeId) && recipeId != Guid.Empty, "Calendar recipe identity is invalid.");
            Add(date.AddDays(-(((int)date.DayOfWeek + 6) % 7)), id, false);
        }
        return Array.AsReadOnly(result.Select(x => new CanonicalMigrationWeek(x.Key,
            Array.AsReadOnly(x.Value.Plans.Order().ToArray()), Array.AsReadOnly(x.Value.Events.Order().ToArray()))).ToArray());
    }

    internal static string Hash(string json) => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(CanonicalRecipeContentStore.NormalizeJson(json))));
    internal static void Require(bool valid, string message) { if (!valid) throw new InvalidDataException(message); }
}
