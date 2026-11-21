using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace RecipeApi.Services;

public sealed record FoodVocabularyDestinationBaseline(int Version, string Revision, string? Generation,
    string? MembershipSha256, string OverridesSha256, string HistorySha256, FoodVocabularyReference[] Documents);
public sealed record RecoveryRestorePreflight(Guid SnapshotId, string ManifestSha256,
    FoodVocabularyDestinationBaseline Destination, bool RequiresExpectedDestinationRevision);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RecoveryRestoreRequest(string? ExpectedDestinationRevision = null);
public sealed class RecoveryDestinationConflictException(string message) : Exception(message);

public partial class RecoverySnapshotService
{
    private sealed record DestinationVocabularyObservation(FoodVocabularyRecoveryObservation Observation,
        FoodVocabularyDestinationBaseline Baseline);

    public async Task<RecoveryRestorePreflight> PreflightRestoreAsync(Guid snapshotId, CancellationToken ct)
    {
        _demoPolicy.EnsureManagementAvailable();
        var source = await ReadCurrentSnapshotAsync(Path.Combine(BackupRoot, snapshotId.ToString("N")), snapshotId, false, ct);
        await using var lease = await boundary.EnterAsync(RecoveryAccess.Snapshot, ct);
        await ValidateCurrentSnapshotAsync(source, ct);
        await RequireUnchangedSnapshotAsync(source, ct);
        var destination = await ObserveDestinationVocabularyAsync(ct);
        _ = MergeRecoveryVocabulary(source, destination);
        return new(snapshotId, FoodVocabularyDefinitions.Sha256(source.ManifestBytes), destination.Baseline,
            RequiresExpectedDestinationRevision(source, destination));
    }

    private static bool IsDestinationRevision(string value) => value.Length == 64 && value.All(c => c is >= '0' and <= '9' or >= 'a' and <= 'f');

    private static void RequireLegacyDestination(DestinationVocabularyObservation destination)
    {
        var facts = destination.Observation.Live;
        if (facts.Membership.RawJson is not null || facts.Overrides.Rows!.Count != 0 || destination.Observation.Origins.Length != 0
            || facts.Recipes.Any(x => x.FoodMappingEvidence is not null))
            throw new InvalidDataException("Historical snapshots cannot replace destination food vocabulary authority.");
        foreach (var operation in facts.CanonicalOperations)
        {
            if (operation.OriginalRequest is null) continue;
            using var request = JsonDocument.Parse(operation.OriginalRequest);
            if (request.RootElement.GetProperty("version").GetInt32() == 2)
                throw new InvalidDataException("Historical snapshots cannot replace current canonical operation authority.");
        }
    }

    private async Task<DestinationVocabularyObservation> ObserveDestinationVocabularyAsync(CancellationToken ct, bool demo = false)
    {
        var observed = await vocabulary.ObserveRecoveryAsync(demo ? "demo-destination" : "destination", null, null, ct);
        var membershipHash = observed.Live.Membership.RawJson is { } raw ? FoodVocabularyDefinitions.Sha256(Encoding.UTF8.GetBytes(raw)) : null;
        var overridesHash = FoodVocabularyDefinitions.Sha256(JsonSerializer.SerializeToUtf8Bytes(observed.Live.Overrides.Rows, Json));
        var historyHash = FoodVocabularyDefinitions.Sha256(observed.HistoryBytes);
        var documents = observed.Documents.Select(x => x.Reference).OrderBy(x => x.Revision, StringComparer.Ordinal)
            .ThenBy(x => x.Sha256, StringComparer.Ordinal).ToArray();
        var generation = recipes.Generation;
        var revision = FoodVocabularyDefinitions.Sha256(JsonSerializer.SerializeToUtf8Bytes(new
        { version = 1, generation, membershipSha256 = membershipHash, overridesSha256 = overridesHash, historySha256 = historyHash, documents }, Json));
        return new(observed, new(1, revision, generation, membershipHash, overridesHash, historyHash, documents));
    }

    private static FoodVocabularyReference? Head(string? membership) => membership is null ? null : FoodVocabularyStore.InspectMembership(membership).ActiveRef;
    private static bool RequiresExpectedDestinationRevision(CurrentSnapshotSource source, DestinationVocabularyObservation destination) =>
        Head(source.Index.MembershipRawJson) is { } sourceHead && Head(destination.Observation.Live.Membership.RawJson) is { } destinationHead
        && sourceHead != destinationHead;

    private static (byte[] History, FoodVocabularyCapture[] Documents) MergeRecoveryVocabulary(CurrentSnapshotSource source,
        DestinationVocabularyObservation destination)
    {
        if (source.Index.MembershipRawJson is null && (destination.Observation.Origins.Length != 0 || destination.Observation.Live.Overrides.Rows!.Count != 0))
            throw new InvalidDataException("An absent source vocabulary head cannot replace retained destination food authority.");
        var history = FoodVocabularyInventoryQualification.MergeHistoryObservations(source.HistoryBytes, destination.Observation.HistoryBytes);
        var documents = new List<FoodVocabularyCapture>();
        foreach (var group in source.Documents.Concat(destination.Observation.Documents).GroupBy(x => x.Reference)
            .OrderBy(x => x.Key.Revision, StringComparer.Ordinal).ThenBy(x => x.Key.Sha256, StringComparer.Ordinal))
        {
            var captured = group.ToArray();
            FoodVocabularyDefinitions.Require(captured.All(x => x.RawBytes.AsSpan().SequenceEqual(captured[0].RawBytes)));
            documents.Add(captured[0]);
        }
        _ = FoodVocabularyInventoryQualification.ValidateHistoryAuthority(history, documents);
        return (history, documents.ToArray());
    }

    private async Task<RecoveryManifest> StageCurrentSnapshotAsync(CurrentSnapshotSource source, string stage,
        DestinationVocabularyObservation? destination, CancellationToken ct)
    {
        var merged = destination is null ? (History: source.HistoryBytes, Documents: source.Documents) : MergeRecoveryVocabulary(source, destination);
        foreach (var file in source.Manifest.Files)
        {
            var copied = Path.Combine(stage, file.Path.StartsWith("recipes/", StringComparison.Ordinal) ? file.Path[8..] : ".snapshot/" + file.Path);
            Directory.CreateDirectory(Path.GetDirectoryName(copied)!);
            if (source.Artifacts.TryGetValue(file.Path, out var bytes)) await File.WriteAllBytesAsync(copied, bytes, ct);
            else
            {
                var original = Path.Combine(source.Root, file.Path);
                RejectLinks(original);
                await CopyFileAsync(original, copied, ct);
            }
            var inventory = await InventoryAsync(stage, copied, ct);
            FoodVocabularyDefinitions.Require(inventory.Length == file.Length && inventory.Sha256 == file.Sha256);
        }
        foreach (var document in merged.Documents)
        {
            var path = Path.Combine(stage, FoodVocabularyStore.PathFor(document.Reference));
            if (File.Exists(path)) FoodVocabularyDefinitions.Require((await File.ReadAllBytesAsync(path, ct)).AsSpan().SequenceEqual(document.RawBytes));
            else
            {
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                await File.WriteAllBytesAsync(path, document.RawBytes, ct);
            }
        }
        var registry = Path.Combine(stage, FoodVocabularyStore.RetainedHistoryPath);
        Directory.CreateDirectory(Path.GetDirectoryName(registry)!);
        await File.WriteAllBytesAsync(registry, merged.History, ct);
        using var rows = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(stage, ".snapshot", "tables", "recipes.json"), ct));
        foreach (var row in rows.RootElement.EnumerateArray())
            await WriteRecipeMetadataAsync(row, Path.Combine(stage, row.GetProperty("id").GetGuid().ToString("D")), ct);
        return source.Manifest;
    }
}
