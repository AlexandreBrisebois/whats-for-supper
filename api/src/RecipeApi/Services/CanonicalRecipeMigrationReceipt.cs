using System.Text.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using RecipeApi.Models;
using RecipeApi.Data;
using Microsoft.EntityFrameworkCore;

namespace RecipeApi.Services;

internal sealed record CanonicalMigrationReceiptPayload(int Version, string ExecutionDisposition, string Phase,
    Guid OperationId, string ManifestSha256, string CandidateArtifactSha256, string CandidateCommit,
    string SchemaSha256, string ModelRevision, CanonicalMigrationSourceSnapshot SourceSnapshot, string? LiveGeneration,
    IReadOnlyList<FoodVocabularyReference> References, IReadOnlyList<CanonicalMigrationReceiptRecipe> Recipes,
    IReadOnlyList<CanonicalMigrationReceiptWeek> Weeks, DateOnly? WeekStart, string RequestSha256);
internal sealed record CanonicalMigrationReceiptWeek(DateOnly WeekStart, Guid ReceiptId,
    IReadOnlyList<Guid> StoredPlanIds, IReadOnlyList<Guid> AssignmentIds);
internal sealed record CanonicalMigrationReceiptRecipe(Guid RecipeId, Guid OperationId,
    string ContentRevision, string SourceRevision, string OriginalFieldsSha256);
internal sealed record CanonicalMigrationReceiptResult(int Version, string ExecutionDisposition, string RequestSha256,
    string Outcome, DateOnly? WeekStart, Guid? PlanId, string? ListVersion, string? ResetEpoch,
    string? RowsSha256, string? DemandSha256, string? ChecksSha256, string? BaselinesSha256, string? ProtectedWeekSha256);

public static partial class CanonicalRecipeMigrationReceipt
{
    internal const string CommandType = "canonical-recipe-migration-receipt-v1";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    internal static async Task<MaintenanceCommandObservation?> FindAsync(RecipeDbContext db, Guid id, CancellationToken ct)
    {
        Require(id != Guid.Empty);
        var observations = new List<MaintenanceCommandObservation>();
        var live = await db.MaintenanceCommands.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
        if (live is not null) observations.Add(MaintenanceCommandObservation.From(live));
        var retained = await db.MaintenanceCommandLifecycleRecords.AsNoTracking().Where(x => x.Id == id).ToArrayAsync(ct);
        if (retained.Length != 0)
        {
            // The retained owner checks links against real observed DB rows.
            // Empty caller assertions cannot erase a pruned command's closure.
            var workflows = await db.WorkflowLifecycleRecords.AsNoTracking().ToArrayAsync(ct);
            var physical = await db.RecipePhysicalDeletions.AsNoTracking().ToArrayAsync(ct);
            foreach (var record in retained)
                observations.Add(MaintenanceCommandLifecycle.ReadValidatedRetainedCommand(record, workflows, physical));
        }
        foreach (var observation in observations) _ = Read(observation);
        if (observations.Count == 0) return null;
        var first = observations[0];
        Require(observations.All(x => x.Id == id && CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(x, Json))
            == CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(first, Json))));
        return first;
    }
    internal static Guid WeekReceiptId(Guid operation, DateOnly week)
    {
        Require(operation != Guid.Empty && week.DayOfWeek == DayOfWeek.Monday);
        var text = "wfs/canonical-migration/week-receipt/v1\0" + operation.ToString("D") + "\0" + week.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        return Guid.ParseExact(Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(text)))[..32], "N");
    }
    internal static MaintenanceCommand Plan(CanonicalMigrationInventory manifest, string candidateCommit, DateTimeOffset at)
    {
        _ = CanonicalRecipeMigrationManifest.FreezeRequest(manifest.Request);
        Require(manifest.Version == 1 && manifest.EvaluationDate != default && Sha(manifest.ObservationSha256) && at != default
            && manifest.ObservationSha256 == CanonicalRecipeMigrationManifest.Hash(JsonSerializer.Serialize(manifest with { ObservationSha256 = "" }, Json))
            && manifest.LiveSchemaSha256 == manifest.Request.SchemaSha256
            && manifest.SourceSnapshot.SnapshotId == manifest.Request.SnapshotId
            && manifest.Recipes.Count == manifest.Request.Selected.Count
            && manifest.Recipes.All(recipe => manifest.Request.Selected.Count(selection => selection.RecipeId == recipe.RecipeId && selection.OperationId == recipe.OperationId) == 1));
        var payload = new CanonicalMigrationReceiptPayload(1, "inert", "plan", manifest.Request.OperationId,
            manifest.ObservationSha256, manifest.Request.CandidateSha256, candidateCommit, manifest.LiveSchemaSha256,
            manifest.Request.ModelRevision, manifest.SourceSnapshot, manifest.LiveGeneration, manifest.RequiredReferences,
            manifest.Recipes.Select(x => new CanonicalMigrationReceiptRecipe(x.RecipeId, x.OperationId,
                x.ContentRevision!, x.SourceRevision!, x.OriginalFieldsSha256!)).ToArray(), manifest.Weeks.Select(x => new CanonicalMigrationReceiptWeek(x.WeekStart,
                WeekReceiptId(manifest.Request.OperationId, x.WeekStart), x.StoredPlanIds, x.AssignmentIds)).ToArray(), null, "");
        payload = payload with { RequestSha256 = CanonicalRecipeMigrationManifest.Hash(JsonSerializer.Serialize(payload, Json)) };
        var command = new MaintenanceCommand
        {
            Id = manifest.Request.OperationId,
            CommandType = CommandType,
            Status = "completed",
            Attempts = 1,
            CreatedAt = at,
            StartedAt = at,
            CompletedAt = at,
            Payload = JsonSerializer.Serialize(payload, Json),
            Result = JsonSerializer.Serialize(new CanonicalMigrationReceiptResult(1, "inert", payload.RequestSha256,
                "plan-retained", null, null, null, null, null, null, null, null, null), Json)
        };
        _ = Read(MaintenanceCommandObservation.From(command));
        return command;
    }
    internal static CanonicalMigrationReceiptPayload WeekPayload(MaintenanceCommandObservation plan, DateOnly week)
    {
        var binding = Read(plan).Payload;
        Require(binding.Phase == "plan" && binding.Weeks.Count(x => x.WeekStart == week) == 1);
        var payload = binding with { Phase = "week", WeekStart = week, RequestSha256 = "" };
        return payload with { RequestSha256 = CanonicalRecipeMigrationManifest.Hash(JsonSerializer.Serialize(payload, Json)) };
    }

    internal static void RequireWeekBinding(MaintenanceCommandObservation actual, MaintenanceCommandObservation plan, DateOnly week)
        => Require(Read(actual).Payload.RequestSha256 == WeekPayload(plan, week).RequestSha256);

    internal static MaintenanceCommand Week(MaintenanceCommandObservation plan, RecipeApi.Models.WeeklyPlan state,
        string protectedWeekSha256, DateTimeOffset at)
    {
        var payload = WeekPayload(plan, state.WeekStartDate);
        var result = new CanonicalMigrationReceiptResult(1, "inert", payload.RequestSha256, "week-reset-committed",
            state.WeekStartDate, state.Id, state.GroceryListVersion, payload.OperationId.ToString("N"),
            CanonicalRecipeMigrationManifest.Hash(state.GroceryItems), CanonicalRecipeMigrationManifest.Hash(state.GroceryDemandEvidence),
            CanonicalRecipeMigrationManifest.Hash(state.GroceryState), CanonicalRecipeMigrationManifest.Hash(state.GroceryCheckedDemandBaselines), protectedWeekSha256);
        var command = new MaintenanceCommand
        {
            Id = WeekReceiptId(payload.OperationId, state.WeekStartDate),
            CommandType = CommandType,
            Status = "completed",
            Attempts = 1,
            CreatedAt = at,
            StartedAt = at,
            CompletedAt = at,
            Payload = JsonSerializer.Serialize(payload, Json),
            Result = JsonSerializer.Serialize(result, Json)
        };
        _ = Read(MaintenanceCommandObservation.From(command));
        return command;
    }

    internal static void RequireBinding(MaintenanceCommandObservation command, MaintenanceCommand expected)
    {
        var actual = Read(command); var requested = Read(MaintenanceCommandObservation.From(expected));
        Require(command.Id == expected.Id && actual.Payload.RequestSha256 == requested.Payload.RequestSha256);
    }
    public static IReadOnlyList<FoodVocabularyReference> VocabularyReferences(MaintenanceCommandObservation command)
    {
        var payload = Read(command).Payload;
        return Array.AsReadOnly(payload.References.Concat(payload.SourceSnapshot.References).Distinct()
            .OrderBy(x => x.Revision, StringComparer.Ordinal).ThenBy(x => x.Sha256, StringComparer.Ordinal).ToArray());
    }

    internal static (CanonicalMigrationReceiptPayload Payload, CanonicalMigrationReceiptResult Result) Read(MaintenanceCommandObservation command)
    {
        Require(command.Id != Guid.Empty && command.CommandType == CommandType && command.Status == "completed"
            && command.Attempts == 1 && command.RequestedBy is null && command.ScheduledFor is null && command.LastError is null
            && command.CreatedAt != default && command.StartedAt == command.CreatedAt && command.CompletedAt == command.CreatedAt
            && command.Result is not null);
        var payload = FoodVocabularyDefinitions.ReadStrict<CanonicalMigrationReceiptPayload>(command.Payload);
        var result = FoodVocabularyDefinitions.ReadStrict<CanonicalMigrationReceiptResult>(command.Result!);
        ValidatePayload(payload);
        Require(result.Version == 1 && result.ExecutionDisposition == "inert" && result.RequestSha256 == payload.RequestSha256);
        if (payload.Phase == "plan")
            Require(command.Id == payload.OperationId && result.Outcome == "plan-retained" && result.WeekStart is null
                && result.PlanId is null && result.ListVersion is null && result.ResetEpoch is null && result.RowsSha256 is null
                && result.DemandSha256 is null && result.ChecksSha256 is null && result.BaselinesSha256 is null && result.ProtectedWeekSha256 is null);
        else
            Require(command.Id == WeekReceiptId(payload.OperationId, payload.WeekStart!.Value)
                && result.Outcome == "week-reset-committed" && result.WeekStart == payload.WeekStart
                && result.PlanId is { } plan && plan != Guid.Empty && GroceryRowState.IsVersion(result.ListVersion)
                && result.ResetEpoch == payload.OperationId.ToString("N") && Sha(result.RowsSha256) && Sha(result.DemandSha256)
                && Sha(result.ChecksSha256) && Sha(result.BaselinesSha256) && Sha(result.ProtectedWeekSha256));
        return (payload, result);
    }

    private static void ValidatePayload(CanonicalMigrationReceiptPayload payload)
    {
        Require(payload.Version == 1 && payload.ExecutionDisposition == "inert" && payload.Phase is "plan" or "week"
            && payload.OperationId != Guid.Empty && Sha(payload.ManifestSha256) && Sha(payload.CandidateArtifactSha256)
            && Regex.IsMatch(payload.CandidateCommit ?? "", "^[a-f0-9]{40}$", RegexOptions.CultureInvariant)
            && Sha(payload.SchemaSha256) && !string.IsNullOrWhiteSpace(payload.ModelRevision) && payload.SourceSnapshot is not null
            && payload.References is not null && payload.Recipes is { Count: > 0 } && payload.Weeks is not null && Sha(payload.RequestSha256));
        Require(payload.SourceSnapshot.SnapshotId != Guid.Empty && Sha(payload.SourceSnapshot.ManifestSha256)
            && Sha(payload.SourceSnapshot.VocabularyIndexSha256) && Generation(payload.SourceSnapshot.Generation)
            && Generation(payload.LiveGeneration) && payload.SourceSnapshot.References is not null);
        foreach (var references in new[] { payload.References, payload.SourceSnapshot.References })
        {
            Require(references.All(x => x is not null) && references.Distinct().Count() == references.Count);
            foreach (var reference in references) FoodVocabularyDefinitions.ValidateReference(reference);
        }
        Require(payload.Recipes.All(x => x is not null && x.RecipeId != Guid.Empty && x.OperationId != Guid.Empty
            && x.OperationId != payload.OperationId && !string.IsNullOrWhiteSpace(x.ContentRevision)
            && !string.IsNullOrWhiteSpace(x.SourceRevision) && Sha(x.OriginalFieldsSha256))
            && payload.Recipes.Select(x => x.RecipeId).Distinct().Count() == payload.Recipes.Count
            && payload.Recipes.Select(x => x.OperationId).Distinct().Count() == payload.Recipes.Count);
        Require(payload.Weeks.All(x => x is not null && x.WeekStart.DayOfWeek == DayOfWeek.Monday
            && x.ReceiptId != payload.OperationId && x.ReceiptId == WeekReceiptId(payload.OperationId, x.WeekStart)
            && x.StoredPlanIds is not null && x.AssignmentIds is not null && (x.StoredPlanIds.Count != 0 || x.AssignmentIds.Count != 0)
            && x.StoredPlanIds.All(id => id != Guid.Empty) && x.AssignmentIds.All(id => id != Guid.Empty))
            && payload.Weeks.Select(x => x.WeekStart).Distinct().Count() == payload.Weeks.Count
            && payload.Weeks.SelectMany(x => x.StoredPlanIds).Distinct().Count() == payload.Weeks.Sum(x => x.StoredPlanIds.Count)
            && payload.Weeks.SelectMany(x => x.AssignmentIds).Distinct().Count() == payload.Weeks.Sum(x => x.AssignmentIds.Count));
        Require(payload.Phase == "plan" ? payload.WeekStart is null
            : payload.WeekStart is { } week && payload.Weeks.Count(x => x.WeekStart == week) == 1);
        Require(payload.RequestSha256 == CanonicalRecipeMigrationManifest.Hash(JsonSerializer.Serialize(payload with { RequestSha256 = "" }, Json)));
    }
    private static bool Generation(string? generation) => generation is null || Guid.TryParseExact(generation, "N", out var id) && id != Guid.Empty;
    private static bool Sha(string? value) => Regex.IsMatch(value ?? "", "^[a-f0-9]{64}$", RegexOptions.CultureInvariant);
    private static void Require(bool condition) => CanonicalRecipeMigrationManifest.Require(condition, "Migration receipt identity, inert progress or retained binding is inconsistent.");
}
