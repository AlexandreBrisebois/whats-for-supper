using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

// Disposable-copy operator entrypoint. It never starts a host, worker, migration,
// schema installer, vocabulary publisher or automatic reopening procedure.
internal static class CanonicalRecipeMigrationOperator
{
    internal static async Task<int> RunAsync(IServiceProvider services, string[] args, CancellationToken ct = default)
    {
        try
        {
            var allowed = new HashSet<string>(StringComparer.Ordinal) { "--input", "--output", "--candidate-commit", "--marker-sha256", "--disposable-database", "--recipes-root" };
            if (args.Length != 14 || args[0] != "--canonical-migration" || args[1] is not ("capture" or "execute"))
                throw new ArgumentException("Invalid disposable migration invocation.");
            var options = new Dictionary<string, string>(StringComparer.Ordinal);
            for (var i = 2; i < args.Length; i += 2)
                if (!allowed.Contains(args[i]) || !options.TryAdd(args[i], args[i + 1]) || string.IsNullOrWhiteSpace(args[i + 1]))
                    throw new ArgumentException("Invalid or duplicate operator option.");
            await using var scope = services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var roots = scope.ServiceProvider.GetRequiredService<RecipesRootResolver>();
            var actualDatabase = new NpgsqlConnectionStringBuilder(db.Database.GetConnectionString()).Database;
            if (!db.Database.IsNpgsql() || actualDatabase != options["--disposable-database"] || actualDatabase is null
                || !actualDatabase.StartsWith("wfs_", StringComparison.Ordinal)
                || Path.GetFullPath(roots.BaseRoot) != Path.GetFullPath(options["--recipes-root"]) || !Directory.Exists(roots.Root))
                throw new InvalidDataException("Operator target differs from the explicitly selected disposable copy.");
            var inputPath = Path.GetFullPath(options["--input"]);
            var outputPath = Path.GetFullPath(options["--output"]);
            if (inputPath == outputPath || File.Exists(outputPath) || Directory.Exists(outputPath)
                || IsWithin(outputPath, roots.BaseRoot)
                || IsWithin(outputPath, scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root))
                throw new InvalidDataException("Operator output must be a new artifact outside live stores.");
            RecoverySnapshotService.RejectLinks(inputPath);
            RecoverySnapshotService.RejectLinks(Path.GetDirectoryName(outputPath)!);
            var bytes = await File.ReadAllBytesAsync(inputPath, ct);
            if (bytes.Length > 64 * 1024 * 1024) throw new InvalidDataException("Operator input exceeds its bounded artifact size.");
            var content = new System.Text.UTF8Encoding(false, true).GetString(bytes);
            var boundary = scope.ServiceProvider.GetRequiredService<RecoveryBoundary>();
            var snapshots = scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>();
            var store = scope.ServiceProvider.GetRequiredService<CanonicalRecipeContentStore>();
            var commit = options["--candidate-commit"];
            var marker = options["--marker-sha256"];
            object result;
            var completed = true;
            if (args[1] == "capture")
            {
                var request = FoodVocabularyDefinitions.ReadStrict<CanonicalMigrationRequest>(content);
                result = await boundary.RunMaintenanceAsync(request.OperationId, commit, marker, async token =>
                {
                    boundary.ValidateMaintenanceInvocation(request.OperationId, commit, request.CandidateSha256);
                    if (request.ModelRevision != CanonicalRecipeContentStore.MigrationModelRevision) throw new InvalidDataException("Executing migration model differs.");
                    return await store.CaptureMigrationManifestAsync(request, snapshots, boundary, roots, token);
                }, ct);
            }
            else
            {
                var inventory = FoodVocabularyDefinitions.ReadStrict<CanonicalMigrationInventory>(content);
                var report = await boundary.RunMaintenanceAsync(inventory.Request.OperationId, commit, marker,
                    token => store.ExecuteMigrationAsync(inventory, commit, snapshots, boundary, roots,
                        scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>(), ct: token), ct);
                result = report;
                completed = report.Completed;
            }
            var output = JsonSerializer.SerializeToUtf8Bytes(result, result.GetType(), new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true });
            // Progress authority is the DB receipt, never this operator artifact.
            // CreateNew preserves every earlier artifact including after unknown outcomes.
            await using var stream = new FileStream(outputPath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
            await stream.WriteAsync(output, ct);
            await stream.FlushAsync(ct);
            stream.Flush(true);
            return completed ? 0 : 3;
        }
        catch (Exception error) when (error is ArgumentException or InvalidDataException or IOException or RecoveryBusyException or JsonException)
        {
            Console.Error.WriteLine("Disposable migration stopped: " + error.GetType().Name + ". Retain the hold and inspect authoritative receipts before retry.");
            return 2;
        }
    }

    private static bool IsWithin(string path, string root)
    {
        var relative = Path.GetRelativePath(Path.GetFullPath(root), path);
        return relative != ".." && !relative.StartsWith(".." + Path.DirectorySeparatorChar, StringComparison.Ordinal) && !Path.IsPathRooted(relative);
    }
}
