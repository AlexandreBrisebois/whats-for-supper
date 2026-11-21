using System.Text.Json;
using System.Text.Json.Serialization;

namespace RecipeApi.Infrastructure;

public sealed record CurrentRecoveryScope(string Format, int Version, Guid HouseholdId, string SchemaFingerprint);

// Operational destination identity, outside the incoming archive. Read never
// provisions a household or replaces a previous explicit selection.
public static class CurrentRecoveryScopeStore
{
    public const string FileName = ".current-recovery-scope.json";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = false,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        RespectRequiredConstructorParameters = true
    };

    public static async Task<CurrentRecoveryScope> ReadAsync(string root, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        var path = Path.Combine(Path.GetFullPath(root), FileName);
        RejectLink(root);
        RejectLink(path);
        try
        {
            await using var input = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
            if (input.Length is < 1 or > 8192) throw Invalid();
            var bytes = new byte[(int)input.Length];
            await input.ReadExactlyAsync(bytes, ct);
            if (await input.ReadAsync(new byte[1], ct) != 0) throw Invalid();
            using var document = JsonDocument.Parse(bytes);
            if (document.RootElement.ValueKind != JsonValueKind.Object
                || document.RootElement.EnumerateObject().Select(x => x.Name).Distinct(StringComparer.Ordinal).Count()
                    != document.RootElement.EnumerateObject().Count()) throw Invalid();
            var scope = document.RootElement.Deserialize<CurrentRecoveryScope>(Json) ?? throw Invalid();
            if (scope.Format != "wfs-recovery-scope" || scope.Version != 1 || scope.HouseholdId == Guid.Empty
                || !ValidFingerprint(scope.SchemaFingerprint)) throw Invalid();
            return scope;
        }
        catch (DirectoryNotFoundException) { throw new FileNotFoundException("Select the destination household recovery scope before inspection."); }
        catch (JsonException) { throw Invalid(); }
    }

    // Explicit provisioning only. Ordinary reads never call this, and repeated
    // selection cannot retarget a destination or silently advance its schema.
    public static async Task<CurrentRecoveryScope> SelectAsync(string root, Guid householdId, string schemaFingerprint,
        CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        if (householdId == Guid.Empty || !ValidFingerprint(schemaFingerprint))
            throw new ArgumentException("Select an independent household identity and database schema fingerprint.");
        root = Path.GetFullPath(root);
        var path = Path.Combine(root, FileName);
        RejectLink(root);
        RejectLink(path);
        if (!OperatingSystem.IsLinux())
            throw new PlatformNotSupportedException("Durable recovery scope selection requires the qualified Linux storage host.");
        if (File.Exists(path))
        {
            var existing = Match(await ReadAsync(root, ct), householdId, schemaFingerprint);
            // Retry can follow a previous rename whose directory flush failed.
            // Reestablish durability before acknowledging that explicit selection.
            FlushSelection(root, path);
            return existing;
        }
        Directory.CreateDirectory(root);
        RejectLink(root);
        var temporary = Path.Combine(root, ".current-recovery-scope-" + Guid.NewGuid().ToString("N") + ".tmp");
        var selected = new CurrentRecoveryScope("wfs-recovery-scope", 1, householdId, schemaFingerprint.ToUpperInvariant());
        try
        {
            await using (var output = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                await JsonSerializer.SerializeAsync(output, selected, Json, ct);
                await output.FlushAsync(ct);
                output.Flush(flushToDisk: true);
            }
            ct.ThrowIfCancellationRequested();
            RejectLink(path);
            try { File.Move(temporary, path, overwrite: false); }
            catch (IOException) when (File.Exists(path))
            {
                var existing = Match(await ReadAsync(root, ct), householdId, schemaFingerprint);
                FlushSelection(root, path);
                return existing;
            }
            // After rename, finish its durability without introducing a later
            // cancellation point that could hide an already published selection.
            FlushSelection(root, path);
            return selected;
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }

    private static CurrentRecoveryScope Match(CurrentRecoveryScope saved, Guid householdId, string fingerprint)
        => saved.HouseholdId == householdId && saved.SchemaFingerprint.Equals(fingerprint, StringComparison.OrdinalIgnoreCase)
            ? saved : throw new InvalidOperationException("The destination recovery scope is already selected; explicit migration is required to change it.");

    private static bool ValidFingerprint(string? value) => value is { Length: 64 } && value.All(Uri.IsHexDigit);

    private static void FlushSelection(string root, string path)
    {
        RecoveryDurability.Flush(path);
        RecoveryDurability.Flush(root);
        RecoveryDurability.Flush(Path.GetDirectoryName(root)!);
    }

    private static void RejectLink(string path)
    {
        if (new FileInfo(path).LinkTarget is not null || new DirectoryInfo(path).LinkTarget is not null)
            throw Invalid();
    }

    private static InvalidDataException Invalid() => new("Invalid destination recovery scope; no identity was created or repaired.");
}
