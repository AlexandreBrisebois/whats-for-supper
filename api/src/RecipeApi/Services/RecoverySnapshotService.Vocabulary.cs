using System.Text.Json;

namespace RecipeApi.Services;

public partial class RecoverySnapshotService
{
    private static readonly string[] VocabularyObservationTables = ["workflow_instances", "workflow_tasks", "workflow_launch_intents",
        "workflow_child_intents", "workflow_reset_intents", "workflow_processor_attempts", "workflow_lifecycle_records",
        "maintenance_command_lifecycle_records", "recipe_physical_deletions", "household_food_overrides", "maintenance_commands"];

    private async Task CaptureVocabularyAsync(string stage, Guid snapshotId, bool demo, CancellationToken ct)
    {
        var observation = await vocabulary.ObserveRecoveryAsync(demo ? "demo" : "snapshot", snapshotId, null, ct);
        var overrides = await foodOverrides.ReadRecoveryRowsAsync(ct);
        var feed = overrides.Select(x => new FoodVocabularyScopedOverrideObservation(x.Id, x.Revision, x.FoodId,
            x.DictionaryRevision, x.Document, x.FallbackKey, x.ShoppingName, x.GrocerySection, x.ProtectedFields,
            x.PresentationSequence, x.CreatedAt, x.UpdatedAt)).ToArray();
        FoodVocabularyDefinitions.Require(JsonSerializer.Serialize(feed, Json) == JsonSerializer.Serialize(observation.Live.Overrides.Rows, Json));
        foreach (var (path, bytes) in VocabularyArtifacts(observation, snapshotId, recipes.Generation, demo ? "demo" : "snapshot"))
        {
            var destination = Path.Combine(stage, path);
            Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
            await File.WriteAllBytesAsync(destination, bytes, ct);
        }
    }

    private static IReadOnlyDictionary<string, byte[]> VocabularyArtifacts(FoodVocabularyRecoveryObservation observation,
        Guid snapshotId, string? generation, string kind)
    {
        var artifacts = new Dictionary<string, byte[]>(StringComparer.Ordinal)
        {
            ["vocabulary/history-observations.json"] = observation.HistoryBytes
        };
        var documents = new List<FoodVocabularyRecoveryDocument>();
        foreach (var capture in observation.Documents)
        {
            var path = "recipes/" + FoodVocabularyStore.PathFor(capture.Reference);
            artifacts.Add(path, capture.RawBytes);
            documents.Add(new(capture.Reference, path, capture.RawBytes.Length));
        }
        var index = new FoodVocabularyRecoveryIndex(1, snapshotId, generation, observation.Live.Membership.RawJson,
            FoodVocabularyDefinitions.Sha256(observation.HistoryBytes), observation.Live.Overrides.Coverage, documents.ToArray(), observation.Origins);
        var indexBytes = FoodVocabularyInventoryQualification.WriteRecoveryIndex(index);
        _ = FoodVocabularyInventoryQualification.ValidateRecoveryArtifacts(indexBytes, observation.HistoryBytes,
            observation.Documents, kind);
        artifacts.Add("vocabulary/index.json", indexBytes);
        return artifacts;
    }
}
