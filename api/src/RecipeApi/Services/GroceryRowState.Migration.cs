using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

internal static partial class GroceryRowState
{
    internal static object ItemInput(GroceryItemMutationDto request) => request.ExpectedPresentationEpoch is null
        ? new { kind = "item", rowId = request.RowId!.Value.ToString("D"), request.WeekStartDate, request.ExpectedRowVersion, request.Checked }
        : new { kind = "item", rowId = request.RowId!.Value.ToString("D"), request.WeekStartDate, request.ExpectedRowVersion, request.Checked, request.ExpectedPresentationEpoch };
    internal static object BulkInput(GroceryBulkMutationDto request)
    {
        var ordered = request.Checks!.OrderBy(x => x.Key, StringComparer.Ordinal).ToDictionary(x => x.Key, x => x.Value, StringComparer.Ordinal);
        return request.ExpectedPresentationEpoch is null
            ? new { kind = "bulk", request.WeekStartDate, request.ExpectedListVersion, checks = ordered }
            : new { kind = "bulk", request.WeekStartDate, request.ExpectedListVersion, checks = ordered, request.ExpectedPresentationEpoch };
    }
    internal static string InputHash(object input) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(input))));

    // Replay only the existing check owner's immutable outcome chain. This
    // validates permitted later checks without comparing them to cleared checks
    // or allowing changes to committed demand meaning/serving/reset facts.
    internal static void RequireMigrationCheckContinuity(WeeklyPlan plan, CanonicalMigrationReceiptResult committed,
        IReadOnlyList<GroceryMutationOutcome> mutations, Guid presentationEpoch, ILogger logger)
    {
        static void Require(bool valid) => CanonicalRecipeMigrationManifest.Require(valid, "Migration completed-week check continuity is inconsistent.");
        static string Digest<T>(T value) => CanonicalRecipeMigrationManifest.Hash(JsonSerializer.Serialize(value));
        var outcomes = mutations.Select(record =>
        {
            Require(record.Id != Guid.Empty && record.WeekStartDate == plan.WeekStartDate && record.InputHash.Length == 64 && record.InputHash.All(Uri.IsHexDigit));
            var retained = ReadCapturedOutcome(record);
            Require(retained.Input is not null);
            var outcome = retained.Result;
            Require(outcome.WeekStartDate == plan.WeekStartDate && IsVersion(outcome.ListVersion) && outcome.Rows is not null && outcome.Checks is not null);
            return (Record: record, Outcome: outcome, Input: retained.Input!.Value);
        }).OrderBy(x => ulong.Parse(x.Outcome.ListVersion, System.Globalization.CultureInfo.InvariantCulture)).ToArray();
        var rows = Rows(plan);
        RequireCurrent(plan, rows);
        var expectedVersion = committed.ListVersion!;
        var checks = rows.ToDictionary(x => x.RowId!, _ => false, StringComparer.Ordinal);
        var baselines = new Dictionary<string, GroceryCheckedDemand?>(StringComparer.Ordinal);
        var evidence = GroceryDemandEvidence.Read(plan, logger);
        Require(CanonicalRecipeMigrationManifest.Hash(plan.GroceryDemandEvidence) == committed.DemandSha256);
        List<GroceryLineItemDto> expectedRows;
        if (outcomes.Length == 0) expectedRows = rows;
        else
        {
            var first = outcomes[0].Outcome;
            Require(first.Rows.Select(x => x.RowId).Distinct(StringComparer.Ordinal).Count() == first.Rows.Count
                && first.Checks.Keys.ToHashSet(StringComparer.Ordinal).SetEquals(first.Rows.Select(x => x.RowId!)));
            expectedRows = first.Rows.Select(row =>
            {
                Require(IsVersion(row.RowVersion));
                var value = ulong.Parse(row.RowVersion!, System.Globalization.CultureInfo.InvariantCulture);
                if (first.Checks[row.RowId!]) { Require(value > 1); value--; }
                return row with { RowVersion = value.ToString(System.Globalization.CultureInfo.InvariantCulture) };
            }).ToList();
            checks = expectedRows.ToDictionary(x => x.RowId!, _ => false, StringComparer.Ordinal);
        }
        Require(Digest(expectedRows) == committed.RowsSha256 && Digest(checks) == committed.ChecksSha256 && Digest(baselines) == committed.BaselinesSha256);
        foreach (var (record, outcome, input) in outcomes)
        {
            Require(outcome.ListVersion == Next(expectedVersion) && outcome.Checks.Keys.ToHashSet(StringComparer.Ordinal).SetEquals(checks.Keys));
            var nextRows = expectedRows.Select(row => row with
            {
                RowVersion = outcome.Checks[row.RowId!] == checks[row.RowId!] ? row.RowVersion : Next(row.RowVersion)
            }).ToList();
            Require(Digest(nextRows) == Digest(outcome.Rows));
            bool Matches(Guid? epoch)
            {
                if (outcome.RowId is { } id)
                {
                    var previous = expectedRows.SingleOrDefault(x => x.RowId == id);
                    if (previous is null || !Guid.TryParseExact(id, "D", out var rowId)
                        || outcome.Checked != outcome.Checks[id] || outcome.RowVersion != nextRows.Single(x => x.RowId == id).RowVersion
                        || checks.Any(x => x.Key != id && x.Value != outcome.Checks[x.Key])) return false;
                    return InputHash(ItemInput(new(rowId, plan.WeekStartDate, previous.RowVersion, outcome.Checked, record.Id, epoch))) == record.InputHash;
                }
                if (!input.TryGetProperty("checks", out var rawChecks)) return false;
                var submitted = rawChecks.Deserialize<Dictionary<string, bool>>();
                if (submitted is null || submitted.Keys.Any(key => !checks.ContainsKey(key))
                    || outcome.Checks.Any(pair => pair.Value != submitted.GetValueOrDefault(pair.Key))) return false;
                return outcome.RowVersion is null && outcome.Checked is null
                    && InputHash(BulkInput(new(plan.WeekStartDate, expectedVersion, submitted, record.Id, epoch))) == record.InputHash;
            }
            Require(Matches(null) || Matches(presentationEpoch));
            foreach (var row in nextRows)
            {
                if (!outcome.Checks[row.RowId!]) baselines.Remove(row.RowId!);
                else if (!checks[row.RowId!]) baselines[row.RowId!] = GroceryCheckedDemand.Capture(row, row.RowVersion!, evidence.GetValueOrDefault(row.RowId!)?.InputFingerprint);
            }
            expectedRows = nextRows;
            checks = outcome.Checks;
            expectedVersion = outcome.ListVersion;
        }
        Require(plan.GroceryListVersion == expectedVersion && Digest(rows) == Digest(expectedRows)
            && CanonicalRecipeMigrationManifest.Hash(plan.GroceryState) == Digest(checks)
            && CanonicalRecipeMigrationManifest.Hash(plan.GroceryCheckedDemandBaselines) == Digest(baselines));
    }
}
