using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed record RecoveryError(string State, string Message, Guid? SnapshotId = null);
public sealed record RecoveryResult(string State, string Message, Guid? SnapshotId = null, [property: System.Text.Json.Serialization.JsonIgnore] Guid? OperationId = null, [property: System.Text.Json.Serialization.JsonIgnore] IReadOnlyDictionary<string, int>? StateCounts = null);
public sealed record RecoveryFile(string Path, long Length, string Sha256);
public sealed record RecoveryManifest(int Version, Guid Id, DateTimeOffset CapturedAt, string Schema, string[] Tables, RecoveryFile[] Files);

/// <summary>Versioned independent recovery artifacts. All paths are server-owned.</summary>
public partial class RecoverySnapshotService(RecipeDbContext db, RecipesRootResolver recipes,
    DataRootResolver data, IConfiguration configuration, IClock clock, RecoveryBoundary boundary, IRecoveryCheckpoint? checkpoint = null, DemoModeOptions? demoMode = null)
{
    private readonly DemoModeOptions _demoPolicy = demoMode ?? new DemoModeOptions(configuration);
    internal static readonly string[] Tables = ["family_members", "recipes", "feature_flag_overrides", "recipe_import_reports", "weekly_plans", "calendar_events", "family_settings", "ingredient_categories", "weekly_household_interest", "grocery_extra_occurrences"];
    private static readonly JsonSerializerOptions Json = JsonDefaults.CamelCase;
    private static readonly string[] ImageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    internal string BackupRoot
    {
        get
        {
            var root = configuration["Recovery:BackupRoot"];
            if (string.IsNullOrWhiteSpace(root) || !Path.IsPathFullyQualified(root))
                throw new InvalidOperationException("Configure an absolute Recovery:BackupRoot outside live data and recipe roots.");
            root = Path.GetFullPath(root);
            foreach (var live in new[] { data.Root, recipes.BaseRoot })
            {
                RejectLinks(live);
                if (Contains(root, live) || Contains(live, root))
                    throw new InvalidOperationException("Recovery storage must be independent of live roots (neither ancestor nor descendant).");
            }
            RejectLinks(root);
            return root;
        }
    }
    internal static bool Contains(string parent, string child) => Path.GetFullPath(child).Equals(Path.GetFullPath(parent), StringComparison.Ordinal)
        || Path.GetFullPath(child).StartsWith(Path.TrimEndingDirectorySeparator(Path.GetFullPath(parent)) + Path.DirectorySeparatorChar, StringComparison.Ordinal);
    internal static void RejectLinks(string path)
    {
        for (var item = new DirectoryInfo(Path.GetFullPath(path)); item is not null; item = item.Parent)
            if (item.LinkTarget is not null) throw new InvalidDataException("Recovery paths cannot contain symbolic links.");
        if (File.Exists(path) && new FileInfo(path).LinkTarget is not null) throw new InvalidDataException("Recovery files cannot be symbolic links.");
    }
    internal async Task<NpgsqlConnection> OpenAsync(CancellationToken ct)
    {
        if (!db.Database.IsNpgsql()) throw new InvalidOperationException("Exact recovery requires PostgreSQL.");
        var connection = new NpgsqlConnection(db.Database.GetConnectionString());
        try { await connection.OpenAsync(ct); return connection; }
        catch { await connection.DisposeAsync(); throw; }
    }
    internal static async Task<string> ScalarAsync(NpgsqlConnection connection, string sql, CancellationToken ct, string? json = null)
    {
        await using var command = new NpgsqlCommand(sql, connection);
        if (json is not null) command.Parameters.AddWithValue("json", NpgsqlDbType.Jsonb, json);
        return Convert.ToString(await command.ExecuteScalarAsync(ct), System.Globalization.CultureInfo.InvariantCulture) ?? "";
    }
    internal static async Task<string> SchemaAsync(NpgsqlConnection connection, CancellationToken ct, string[]? tableNames = null)
    {
        var names = string.Join(',', (tableNames ?? Tables).Select(t => "'" + t + "'"));
        var columns = await ScalarAsync(connection,
            "SELECT coalesce(jsonb_agg(jsonb_build_array(table_name,column_name,data_type,udt_name,is_nullable,column_default) ORDER BY table_name,ordinal_position)::text,'[]') FROM information_schema.columns WHERE table_schema='public' AND table_name IN (" + names + ")", ct);
        var constraints = await ScalarAsync(connection,
            "SELECT coalesce(jsonb_agg(jsonb_build_array(t.relname,pg_get_constraintdef(c.oid)) ORDER BY t.relname,c.conname)::text,'[]') FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND t.relname IN (" + names + ")", ct);
        return Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(columns + constraints)));
    }

    public async Task<RecoveryResult> CaptureAsync(CancellationToken ct)
    {
        return await CaptureToAsync(BackupRoot, false, ct);
    }

    private async Task<RecoveryResult> CaptureToAsync(string root, bool demo, CancellationToken ct)
    {
        var tables = demo ? DemoTables : Tables;
        await using var lease = await boundary.EnterAsync(RecoveryAccess.Snapshot, ct);
        using var duration = CancellationTokenSource.CreateLinkedTokenSource(ct);
        duration.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Recovery:MaxFreezeSeconds", 30), 1, 3600)));
        ct = duration.Token;
        Directory.CreateDirectory(root);
        var id = Guid.NewGuid();
        var stage = Path.Combine(root, ".pending-" + id.ToString("N"));
        var target = Path.Combine(root, id.ToString("N"));
        Directory.CreateDirectory(stage);
        try
        {
            await using var connection = await OpenAsync(ct);
            await using var transaction = await connection.BeginTransactionAsync(ct);
            await ScalarAsync(connection, "LOCK TABLE " + string.Join(',', tables) + " IN SHARE MODE", ct);
            Directory.CreateDirectory(Path.Combine(stage, "tables"));
            if (checkpoint is not null) await checkpoint.ReachedAsync("capture-locked", ct);
            if (demo) await ValidateDemoInventoryAsync(connection, ct);
            Directory.CreateDirectory(Path.Combine(stage, "recipes"));
            foreach (var table in tables)
            {
                var rows = await ScalarAsync(connection, $"SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]')::text FROM {table} t", ct);
                if (demo) rows = NormalizeDemoRows(table, rows);
                await File.WriteAllTextAsync(Path.Combine(stage, "tables", table + ".json"), rows, ct);
            }
            var household = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(stage, "tables", "recipes.json"), ct));
            using (household)
            {
                foreach (var row in household.RootElement.EnumerateArray()) await CopyRecipeAsync(row, stage, ct);
            }
            var history = demo ? new List<WeeklyHouseholdInterest>() : await db.WeeklyHouseholdInterests.AsNoTracking().OrderBy(r => r.WeekStartDate).ThenBy(r => r.RecipeId).ToListAsync(ct);
            var state = await db.VotingRoundStates.AsNoTracking().SingleOrDefaultAsync(ct);
            await WriteAsync(Path.Combine(stage, "weekly-household-interest.json"), new { version = 1, generation = state?.HistoryGeneration ?? Guid.NewGuid(), rows = history }, ct);
            if (demo) await WriteAsync(Path.Combine(stage, "dispositions.json"), DemoDispositions, ct);
            var files = new List<RecoveryFile>();
            foreach (var path in SafeFiles(stage).Order())
                files.Add(await InventoryAsync(stage, path, ct));
            var schema = await SchemaAsync(connection, ct, demo ? DemoDispositions.Keys.Order().ToArray() : null);
            await WriteAsync(Path.Combine(stage, "manifest.json"), new RecoveryManifest(demo ? 2 : 1, id, clock.UtcNow, schema, tables, files.ToArray()), ct);
            await transaction.CommitAsync(ct);
            if (checkpoint is not null) await checkpoint.ReachedAsync("export-staged", ct);
            ct.ThrowIfCancellationRequested();
            RecoveryDurability.FlushTree(stage, ct);
            Directory.Move(stage, target);
            RecoveryDurability.Flush(root);
            return new("completed", "Independent snapshot published; copy to a separate failure domain for disk-loss protection.", id);
        }
        finally { if (Directory.Exists(stage)) Directory.Delete(stage, true); }
    }

    private async Task CopyRecipeAsync(JsonElement row, string stage, CancellationToken ct)
    {
        var id = row.GetProperty("id").GetGuid();
        var source = Path.Combine(recipes.Root, id.ToString());
        var destination = Path.Combine(stage, "recipes", id.ToString());
        Directory.CreateDirectory(destination);
        RejectLinks(source);
        var count = row.GetProperty("image_count").GetInt32();
        if (count < 0) throw new InvalidDataException($"Recipe {id}: invalid image count.");
        for (var index = 0; index < count; index++)
        {
            var matches = ImageExtensions.Select(ext => Path.Combine(source, "original", index + ext)).Where(File.Exists).ToArray();
            if (matches.Length != 1) throw new InvalidDataException($"Recipe {id}: original/page {index} is missing or ambiguous.");
        }
        // Actual originals, PDF and hero bytes are authoritative; stale metadata/search sidecars are not.
        if (Directory.Exists(source))
        {
            foreach (var path in SafeFiles(source))
            {
                RejectLinks(path);
                var relative = Path.GetRelativePath(source, path).Replace('\\', '/');
                if (relative != "hero.webp" && !relative.StartsWith("original/", StringComparison.Ordinal)) continue;
                var target = Path.Combine(destination, relative);
                Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                await CopyFileAsync(path, target, ct);
                ct.ThrowIfCancellationRequested();
            }
        }
        // Preserve all database content without accidentally trusting an old export envelope.
        await File.WriteAllTextAsync(Path.Combine(destination, "recovery-row.json"), row.GetRawText(), ct);
    }
    internal static async Task CopyFileAsync(string source, string destination, CancellationToken ct)
    {
        await using var input = File.OpenRead(source);
        await using var output = new FileStream(destination, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        await input.CopyToAsync(output, ct);
        await output.FlushAsync(ct);
        output.Flush(true);
    }
    internal static async Task WriteAsync<T>(string path, T value, CancellationToken ct)
    {
        await using var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        await JsonSerializer.SerializeAsync(stream, value, Json, ct);
        await stream.FlushAsync(ct);
        stream.Flush(true);
        RecoveryDurability.Flush(Path.GetDirectoryName(path)!);
    }
    internal static async Task<RecoveryFile> InventoryAsync(string root, string path, CancellationToken ct)
    {
        await using var stream = File.OpenRead(path);
        var hash = await SHA256.HashDataAsync(stream, ct);
        return new(Path.GetRelativePath(root, path).Replace('\\', '/'), stream.Length, Convert.ToHexString(hash));
    }
}
