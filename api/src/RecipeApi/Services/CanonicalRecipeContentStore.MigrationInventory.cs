using RecipeApi.Infrastructure;
using System.Data;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class CanonicalRecipeContentStore
{
    internal async Task<CanonicalMigrationInventory> CaptureMigrationManifestAsync(CanonicalMigrationRequest request,
        RecoverySnapshotService snapshots, RecoveryBoundary boundary, RecipesRootResolver roots, CancellationToken ct = default)
    {
        _ = await snapshots.RequireSourceCoverageAsync(request.SnapshotId, ct);
        var observation = await ObserveMigrationManifestAsync(request, snapshots, boundary, roots, ct);
        _ = await snapshots.RequireSourceCoverageAsync(request.SnapshotId, ct);
        return observation;
    }

    internal async Task<CanonicalMigrationInventory> ObserveMigrationManifestAsync(CanonicalMigrationRequest request,
        RecoverySnapshotService snapshots, RecoveryBoundary boundary, RecipesRootResolver roots, CancellationToken ct = default)
    {
        request = CanonicalRecipeMigrationManifest.FreezeRequest(request);
        var evaluationDate = (migrationCalendar ?? throw new InvalidOperationException("Migration observation requires its deployment calendar owner.")).Capture(clock.UtcNow).Today;
        CanonicalRecipeMigrationManifest.Require(db.Database.IsNpgsql(), "Migration inventory requires PostgreSQL observations.");
        CanonicalRecipeMigrationManifest.Require(db.Database.CurrentTransaction is null, "Migration inventory requires its own read-only observation boundary.");
        await using var lease = await boundary.EnterAsync(RecoveryAccess.Snapshot, ct);
        var source = await snapshots.InspectSnapshotIdentityAsync(request.SnapshotId, ct);
        var generation = roots.Generation;
        var root = roots.Root; // Existing owner validates any generation pointer.
        // Raw table rows and typed-owner/recipe queries share one DB snapshot.
        // The caller's tracked entities are never saved or used as observations.
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        var connection = (NpgsqlConnection)db.Database.GetDbConnection();
        await new NpgsqlCommand("SET TRANSACTION READ ONLY", connection).ExecuteNonQueryAsync(ct);
        var names = new List<string>();
        await using (var reader = await new NpgsqlCommand("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename", connection).ExecuteReaderAsync(ct))
            while (await reader.ReadAsync(ct)) names.Add(reader.GetString(0));
        CanonicalRecipeMigrationManifest.Require(names.Count > 0 && names.All(x => System.Text.RegularExpressions.Regex.IsMatch(x, "^[A-Za-z_][A-Za-z0-9_]*$")), "Unsupported table membership.");
        var schema = (await RecoverySnapshotService.SchemaAsync(connection, ct, names.ToArray())).ToLowerInvariant();
        CanonicalRecipeMigrationManifest.Require(schema == request.SchemaSha256, "Observed schema differs from the selected migration request.");
        var tables = new List<CanonicalMigrationTable>(); var rawTables = new Dictionary<string, JsonElement>(StringComparer.Ordinal);
        foreach (var name in names)
        {
            var quoted = new NpgsqlCommandBuilder().QuoteIdentifier(name);
            var keys = new List<string>();
            await using (var command = new NpgsqlCommand("""
                SELECT a.attname FROM pg_index i
                CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
                JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum
                WHERE i.indrelid=to_regclass(@name) AND i.indisprimary ORDER BY k.ord
                """, connection))
            {
                command.Parameters.AddWithValue("name", "public." + quoted);
                await using var reader = await command.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct)) keys.Add(reader.GetString(0));
            }
            var text = (string)(await new NpgsqlCommand("SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]')::text FROM public." + quoted + " t", connection).ExecuteScalarAsync(ct))!;
            // These are complete database rows, not vocabulary envelopes. Keep
            // arbitrary source/private JSON opaque; its nested IDs are not food IDs.
            using var document = JsonDocument.Parse(text);
            var rows = document.RootElement.Clone();
            rawTables.Add(name, rows);
            tables.Add(CanonicalRecipeMigrationManifest.ObserveTable(name, keys, rows));
        }
        var required = FoodVocabularyInventoryQualification.RequiredReferences(await vocabulary.ObserveInventoryFactsAsync(ct))
            .Select(x => x.Reference).Distinct().OrderBy(x => x.Revision, StringComparer.Ordinal).ThenBy(x => x.Sha256, StringComparer.Ordinal).ToArray();
        foreach (var reference in required) _ = await vocabulary.LoadCapturedAsync(reference, ct);
        var recipes = await db.Recipes.IgnoreQueryFilters().AsNoTracking().ToArrayAsync(ct);
        var files = await ObserveMigrationFiles(root, ct);
        var selected = request.Selected.Select(selection => ObserveMigrationRecipe(selection,
            recipes.SingleOrDefault(x => x.Id == selection.RecipeId), files)).ToArray();
        var weeks = CanonicalRecipeMigrationManifest.ObserveWeeks(rawTables["weekly_plans"], rawTables["calendar_events"]);
        var sourceAgain = await snapshots.InspectSnapshotIdentityAsync(request.SnapshotId, ct);
        CanonicalRecipeMigrationManifest.Require(source.ManifestSha256 == sourceAgain.ManifestSha256
            && source.VocabularyIndexSha256 == sourceAgain.VocabularyIndexSha256 && generation == roots.Generation
            && files.SequenceEqual(await ObserveMigrationFiles(root, ct)), "Source snapshot or live generation/files changed during observation.");
        await transaction.CommitAsync(ct); // READ ONLY transaction; no owner rows or files are published.
        var observation = new CanonicalMigrationInventory(1, request,
            new(source.SnapshotId, source.ManifestSha256, source.Generation, source.VocabularyIndexSha256, Array.AsReadOnly(source.References.ToArray())),
            schema, generation, Array.AsReadOnly(required), tables.AsReadOnly(), files,
            Array.AsReadOnly(selected), weeks, "", evaluationDate);
        return observation with { ObservationSha256 = CanonicalRecipeMigrationManifest.Hash(JsonSerializer.Serialize(observation, Json)) };
    }

    private static async Task<IReadOnlyList<CanonicalMigrationFile>> ObserveMigrationFiles(string root, CancellationToken ct)
    {
        RecoverySnapshotService.RejectLinks(root);
        if (!Directory.Exists(root)) return Array.AsReadOnly(Array.Empty<CanonicalMigrationFile>());
        var result = new List<CanonicalMigrationFile>();
        foreach (var path in RecoverySnapshotService.SafeFiles(root).Order(StringComparer.Ordinal))
        {
            ct.ThrowIfCancellationRequested();
            await using var stream = File.OpenRead(path);
            result.Add(new(Path.GetRelativePath(root, path).Replace('\\', '/'), stream.Length,
                Convert.ToHexStringLower(await SHA256.HashDataAsync(stream, ct))));
        }
        return result.AsReadOnly();
    }

    private static CanonicalMigrationRecipe ObserveMigrationRecipe(CanonicalMigrationSelection selection, Recipe? recipe, IReadOnlyList<CanonicalMigrationFile> files)
    {
        var prefix = selection.RecipeId.ToString("D") + "/";
        var paths = Array.AsReadOnly(files.Where(x => x.Path.StartsWith(prefix, StringComparison.Ordinal)).Select(x => x.Path).ToArray());
        if (recipe is null) return new(selection.RecipeId, selection.OperationId, "missing", "selected-recipe-membership-absent", null, null, null, null, null, null, paths);
        var original = CanonicalRecipeMigrationManifest.Hash(JsonSerializer.Serialize(RecipeFilePublicationStore.Observe(recipe), Json));
        var content = InspectContentRevision(recipe); var source = InspectSourceRevision(recipe);
        if (recipe.DeletedAt is not null) return new(recipe.Id, selection.OperationId, "defer", "retired-membership-preserved", content, source, original, null, null, null, paths);
        for (var image = 0; image < recipe.ImageCount; image++)
        {
            var expected = prefix + "original/" + image;
            if (paths.Count(path => new[] { ".jpg", ".jpeg", ".png", ".webp" }.Any(extension => path == expected + extension)) != 1)
                return new(recipe.Id, selection.OperationId, "conflict", "declared-source-media-missing-or-ambiguous", content, source, original, null, null, null, paths);
        }
        if (Read(recipe) is not { } canonical)
            return new(recipe.Id, selection.OperationId, "requires-forward-assessment", "lossless-conversion-not-executed-or-certified", content, source, original, null, null, null, paths);
        RecipeExportContent.ValidateRetainedHistory(new(recipe.Id, canonical, recipe.RawMetadata));
        return new(recipe.Id, selection.OperationId, "observed-canonical", null, content, source, original,
            canonical.IngredientLines.Count, canonical.InstructionSections.Sum(x => x.Steps.Count),
            canonical.InstructionSections.Sum(x => x.Steps.Sum(step => step.Bindings.Count)), paths);
    }
}
