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
        var historyPath = Path.Combine(stage, "vocabulary", "history-observations.json");
        Directory.CreateDirectory(Path.GetDirectoryName(historyPath)!);
        await File.WriteAllBytesAsync(historyPath, observation.HistoryBytes, ct);
        var documents = new List<FoodVocabularyRecoveryDocument>();
        foreach (var capture in observation.Documents)
        {
            var path = "recipes/" + FoodVocabularyStore.PathFor(capture.Reference);
            var destination = Path.Combine(stage, path);
            Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
            await File.WriteAllBytesAsync(destination, capture.RawBytes, ct);
            documents.Add(new(capture.Reference, path, capture.RawBytes.Length));
        }
        var index = new FoodVocabularyRecoveryIndex(1, snapshotId, recipes.Generation, observation.Live.Membership.RawJson,
            FoodVocabularyDefinitions.Sha256(observation.HistoryBytes), observation.Live.Overrides.Coverage, documents.ToArray(), observation.Origins);
        var indexBytes = FoodVocabularyInventoryQualification.WriteRecoveryIndex(index);
        _ = FoodVocabularyInventoryQualification.ValidateRecoveryArtifacts(indexBytes, observation.HistoryBytes,
            observation.Documents, demo ? "demo" : "snapshot");
        await File.WriteAllBytesAsync(Path.Combine(stage, "vocabulary", "index.json"), indexBytes, ct);
    }
}
