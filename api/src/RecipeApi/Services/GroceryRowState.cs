using System.Globalization;
using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed class GroceryMutationConflictException(string code, GroceryMutationResult? current = null, bool absent = false) : Exception(code)
{
    public string Code { get; } = code;
    public GroceryMutationResult? Current { get; } = current;
    public bool Absent { get; } = absent;
}

internal static partial class GroceryRowState
{
    internal static bool IsVersion(string? version) => version is { Length: > 0 and <= 20 } && version[0] != '0'
        && ulong.TryParse(version, NumberStyles.None, CultureInfo.InvariantCulture, out var n) && n > 0;

    internal static string Next(string? version)
    {
        if (!IsVersion(version)) throw new JsonException("Invalid persisted grocery version.");
        return checked(ulong.Parse(version!, CultureInfo.InvariantCulture) + 1).ToString(CultureInfo.InvariantCulture);
    }

    internal static List<GroceryLineItemDto> Rows(WeeklyPlan plan) => JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems) ?? throw new JsonException("Missing grocery rows.");
    internal static Dictionary<string, bool> Checks(WeeklyPlan plan) => JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState) ?? throw new JsonException("Missing grocery checks.");

    internal static void RequireCurrent(WeeklyPlan plan, List<GroceryLineItemDto> rows)
    {
        if (rows.Any(row => !Guid.TryParse(row.RowId, out _) || !IsVersion(row.RowVersion) || row.WeekStartDate != plan.WeekStartDate || string.IsNullOrEmpty(row.DemandIdentity))
            || rows.Select(row => row.RowId).Distinct(StringComparer.Ordinal).Count() != rows.Count
            || Checks(plan).Keys.Any(id => rows.All(row => row.RowId != id)))
            throw new GroceryMutationConflictException("active_legacy_list");
        if (!IsVersion(plan.GroceryListVersion)) throw new JsonException("Invalid persisted grocery list version.");
    }

    internal static string SerializeOutcome(GroceryMutationResult outcome)
    {
        var stored = System.Text.Json.Nodes.JsonNode.Parse(JsonSerializer.Serialize(outcome))!.AsObject();
        stored.Remove("presentationVersion");
        stored.Remove("presentationEpoch");
        return stored.ToJsonString();
    }

    internal static GroceryMutationResult Snapshot(WeeklyPlan plan, DateTimeOffset now, string? rowId = null)
    {
        var rows = Rows(plan);
        var checks = Checks(plan);
        var row = rows.SingleOrDefault(row => row.RowId == rowId);
        return new(now, plan.WeekStartDate, plan.GroceryListVersion, checks, rows,
            rowId, row?.RowVersion, row is null ? null : checks.GetValueOrDefault(row.RowId!));
    }
}
