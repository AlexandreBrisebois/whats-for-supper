using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(false, "publication")]
    [InlineData(false, "repair")]
    [InlineData(true, "publication")]
    public Task LegacyRecovery_RejectsReferenceOnlyV4AuthorityBeforeReplacingLiveState(bool demo, string owner) =>
        WithStore(async (sourceServices, _, sourceStore, _) =>
        {
            var backups = Path.Combine(Path.GetTempPath(), "wfs-legacy-reference-" + Guid.NewGuid().ToString("N"));
            try
            {
                sourceServices.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = backups;
                var source = sourceServices.GetRequiredService<RecoverySnapshotService>();
                var captured = demo ? await source.CaptureDemoAsync(default) : await source.CaptureAsync(default);
                var snapshotId = captured.SnapshotId!.Value;
                var sourceRoot = demo
                    ? Path.Combine(sourceServices.GetRequiredService<DataRootResolver>().Root, "demo", snapshotId.ToString("N"))
                    : Path.Combine(backups, snapshotId.ToString("N"));
                var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                    "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
                var installed = await sourceServices.GetRequiredService<FoodVocabularyStore>().PublishReviewedAsync(bytes, null,
                    Guid.NewGuid(), "legacy-source-reference-only");
                var sourceDb = sourceServices.GetRequiredService<RecipeDbContext>();
                if (owner == "publication")
                {
                    var capture = await sourceStore.CaptureAsync(Id);
                    Assert.Equal(4, capture.FieldHashVersion);
                    await sourceStore.PublishAsync(capture, Candidate(), Guid.NewGuid());
                    var publication = await sourceDb.RecipeFilePublications.AsNoTracking().SingleAsync();
                    Assert.Contains(installed.NewHead, RecipeFilePublicationStore.VocabularyReferences(publication));
                }
                else
                {
                    var operation = Guid.NewGuid();
                    var parameters = new Dictionary<string, string> { ["recipeId"] = Id.ToString("D") };
                    var workflow = new WorkflowInstance { Id = operation, WorkflowId = "recipe-import",
                        Parameters = JsonSerializer.Serialize(parameters), CreatedAt = DateTimeOffset.UtcNow,
                        Tasks = [new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = operation,
                            TaskName = "extract", ProcessorName = "ExtractRecipe", Payload = JsonSerializer.Serialize(new { recipeId = Id }), DependsOn = [] }] };
                    await sourceStore.CaptureLaunchAsync(workflow);
                    var repairOwner = typeof(RecoverySnapshotService).Assembly.GetType("RecipeApi.Services.RecipeReportRepairIntent")!;
                    var repair = (RecipeRepairIntent)repairOwner.GetMethod("Create", BindingFlags.NonPublic | BindingFlags.Static)!
                        .Invoke(null, [operation, Id, "recipe-import", parameters, workflow, DateTimeOffset.UtcNow])!;
                    var references = (FoodVocabularyReference[])repairOwner.GetMethod("VocabularyReferences", BindingFlags.NonPublic | BindingFlags.Static)!
                        .Invoke(null, [repair])!;
                    Assert.Contains(installed.NewHead, references);
                    sourceDb.RecipeRepairIntents.Add(repair);
                    await sourceDb.SaveChangesAsync();
                }
                await using (var connection = new NpgsqlConnection(sourceDb.Database.GetConnectionString()))
                {
                    await connection.OpenAsync();
                    var table = owner == "publication" ? "recipe_file_publications" : "recipe_repair_intents";
                    var rows = (string)(await new NpgsqlCommand($"SELECT jsonb_agg(to_jsonb(t))::text FROM {table} t", connection).ExecuteScalarAsync())!;
                    await File.WriteAllTextAsync(Path.Combine(sourceRoot, "tables", table + ".json"), rows);
                    await MakeLegacyRecoverySource(sourceRoot, snapshotId, demo, connection);
                }
                // No current mapped recipe, membership or canonical V2 operation is
                // present in this source. Its only authority is a valid retained V4.
                var sourceRecipes = JsonNode.Parse(await File.ReadAllTextAsync(Path.Combine(sourceRoot, "tables", "recipes.json")))!.AsArray();
                Assert.All(sourceRecipes, row => Assert.Null(row!["food_mapping_evidence"]));
                Assert.DoesNotContain("food_vocabulary_publication", await File.ReadAllTextAsync(Path.Combine(sourceRoot, "tables", "family_settings.json")));
                Assert.Equal("[]", (await File.ReadAllTextAsync(Path.Combine(sourceRoot, "tables", "canonical_recipe_operations.json"))).Trim());
                await WithStore(async (targetServices, targetRepository, _, _) =>
                {
                    targetServices.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = backups;
                    var targetDb = targetServices.GetRequiredService<RecipeDbContext>();
                    var recipe = await targetDb.Recipes.SingleAsync(x => x.Id == Id);
                    recipe.Name = "Keep destination human name";
                    await targetDb.SaveChangesAsync();
                    var beforeRows = JsonSerializer.Serialize(await targetDb.Recipes.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync());
                    var beforeSource = await targetRepository.GetRecipeJsonAsync(Id, default);
                    var roots = targetServices.GetRequiredService<RecipesRootResolver>();
                    var recovery = targetServices.GetRequiredService<RecoverySnapshotService>();
                    if (demo)
                    {
                        var targetDemo = Path.Combine(targetServices.GetRequiredService<DataRootResolver>().Root, "demo");
                        var targetSnapshot = Path.Combine(targetDemo, snapshotId.ToString("N"));
                        CopyRecoveryDirectory(sourceRoot, targetSnapshot);
                        await File.WriteAllTextAsync(Path.Combine(targetDemo, "current"), snapshotId.ToString("N"));
                    }
                    var error = await Assert.ThrowsAsync<InvalidDataException>(() => demo
                        ? recovery.RestoreDemoAsync(null, default) : recovery.RestoreExactAsync(snapshotId, default));
                    Assert.Contains("authority", error.Message, StringComparison.OrdinalIgnoreCase);
                    targetDb.ChangeTracker.Clear();
                    Assert.Equal(beforeRows, JsonSerializer.Serialize(await targetDb.Recipes.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync()));
                    Assert.Equal(beforeSource, await targetRepository.GetRecipeJsonAsync(Id, default));
                    Assert.Null(roots.Generation);
                    Assert.False(File.Exists(Path.Combine(roots.BaseRoot, ".recovery-journal.json")));
                    Assert.False(await targetDb.RecoveryPublications.AnyAsync());
                }, localRecipeStore: true);
            }
            finally { if (Directory.Exists(backups)) Directory.Delete(backups, true); }
        }, localRecipeStore: true);

    private static void CopyRecoveryDirectory(string source, string destination)
    {
        Directory.CreateDirectory(destination);
        foreach (var file in Directory.GetFiles(source, "*", SearchOption.AllDirectories))
        {
            var target = Path.Combine(destination, Path.GetRelativePath(source, file));
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.Copy(file, target);
        }
    }

    private static async Task MakeLegacyRecoverySource(string root, Guid id, bool demo, NpgsqlConnection connection)
    {
        var manifest = JsonSerializer.Deserialize<RecoveryManifest>(await File.ReadAllTextAsync(Path.Combine(root, "manifest.json")), JsonDefaults.CamelCase)!;
        var tables = manifest.Tables.Where(x => x != "household_food_overrides").ToArray();
        foreach (var file in manifest.Files.Where(x => x.Path.StartsWith("vocabulary/", StringComparison.Ordinal)
            || x.Path.StartsWith("recipes/.household/", StringComparison.Ordinal) || x.Path == "tables/household_food_overrides.json"))
            File.Delete(Path.Combine(root, file.Path));
        if (demo)
        {
            var dispositions = JsonNode.Parse(await File.ReadAllTextAsync(Path.Combine(root, "dispositions.json")))!.AsObject();
            dispositions.Remove("household_food_overrides");
            await File.WriteAllTextAsync(Path.Combine(root, "dispositions.json"), dispositions.ToJsonString());
        }
        var schemaOwner = typeof(RecoverySnapshotService).GetMethod("SchemaAsync", BindingFlags.NonPublic | BindingFlags.Static)!;
        var schemaTables = demo
            ? (JsonNode.Parse(await File.ReadAllTextAsync(Path.Combine(root, "dispositions.json")))!.AsObject().Select(x => x.Key).Order().ToArray())
            : tables;
        var schema = await (Task<string>)schemaOwner.Invoke(null, [connection, CancellationToken.None, schemaTables])!;
        var inventory = new List<RecoveryFile>();
        foreach (var file in Directory.GetFiles(root, "*", SearchOption.AllDirectories).Where(x => Path.GetFileName(x) != "manifest.json"))
        {
            var bytes = await File.ReadAllBytesAsync(file);
            inventory.Add(new(Path.GetRelativePath(root, file).Replace('\\', '/'), bytes.Length, Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(bytes))));
        }
        await File.WriteAllTextAsync(Path.Combine(root, "manifest.json"), JsonSerializer.Serialize(manifest with
        { Version = demo ? 2 : 1, Id = id, Schema = schema, Tables = tables, Files = inventory.ToArray() }, JsonDefaults.CamelCase));
    }
}
