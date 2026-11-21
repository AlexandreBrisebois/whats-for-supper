using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace RecipeApi.Infrastructure;

public sealed record CurrentRecoveryArtifact(string Path, string Kind, Guid? RecipeId, string[] Dependencies);
public sealed record CurrentRecoveryHash(long Length, string Sha256);
public sealed record CurrentRecoverySource(string SourceRef, string SourceRevision, string[] Artifacts);
public sealed record CurrentRecoveryRecipe(Guid RecipeId, string Metadata, string Content, CurrentRecoverySource[] Sources);
public sealed record CurrentRecoveryManifest(string Format, int Version, string SchemaFingerprint, Guid HouseholdId,
    CurrentRecoveryArtifact[] Artifacts, Dictionary<string, CurrentRecoveryHash> Hashes, CurrentRecoveryRecipe[] Recipes);
public sealed record CurrentRecoveryDiagnostic(string Path, string Code);

public sealed class CurrentRecoveryPreflightException(IReadOnlyList<CurrentRecoveryDiagnostic> diagnostics)
    : IOException("Current recovery inventory failed validation; no live state was changed.")
{
    public IReadOnlyList<CurrentRecoveryDiagnostic> Diagnostics { get; } = diagnostics;
}

/// <summary>
/// A frozen, read-only inventory, NOT publication authority. Domain/relational validation,
/// reviewed merge authority and coordinated publication must succeed separately.
/// </summary>
public sealed class CurrentRecoveryArchive
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = false,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        RespectRequiredConstructorParameters = true
    };
    private readonly Dictionary<string, byte[]> _artifacts;
    private readonly byte[] _manifest;

    private CurrentRecoveryArchive(byte[] manifest, Dictionary<string, byte[]> artifacts)
    {
        _manifest = manifest;
        _artifacts = artifacts;
        Paths = Array.AsReadOnly(artifacts.Keys.Order(StringComparer.Ordinal).ToArray());
    }

    public IReadOnlyList<string> Paths { get; }
    // Never expose mutable manifest arrays or buffers retained by the inventory.
    public JsonDocument ReadManifest() => JsonDocument.Parse(_manifest);
    public Stream OpenRead(string path) => new MemoryStream(_artifacts[path], writable: false);

    public static IReadOnlyList<string> HouseholdArtifactKinds { get; } = Array.AsReadOnly(new[]
    {
        "family-members", "weekly-plans", "calendar-events", "family-settings", "ingredient-categories",
        "recipe-import-reports", "grocery-extras", "supper-servings", "weekly-household-interest",
        "durable-obligations", "food-dictionary", "household-food-overrides"
    });

    public static async Task<CurrentRecoveryArchive> InspectAsync(string root, Guid expectedHouseholdId,
        string expectedSchemaFingerprint, CancellationToken ct = default,
        long maxArtifactBytes = 128 * 1024 * 1024, long maxTotalBytes = 512 * 1024 * 1024)
    {
        ct.ThrowIfCancellationRequested();
        ArgumentOutOfRangeException.ThrowIfLessThan(maxArtifactBytes, 1);
        ArgumentOutOfRangeException.ThrowIfLessThan(maxTotalBytes, 1);
        if (expectedHouseholdId == Guid.Empty || string.IsNullOrWhiteSpace(expectedSchemaFingerprint))
            throw new ArgumentException("An independently selected household and schema are required.");
        var errors = new List<CurrentRecoveryDiagnostic>();
        void Error(string path, string code) => errors.Add(new(path, code));
        void Require(bool valid, string path, string code) { if (!valid) Error(path, code); }
        root = Path.GetFullPath(root);

        byte[] manifestBytes;
        CurrentRecoveryManifest manifest;
        try
        {
            RejectLink(root);
            RejectLink(Path.Combine(root, "manifest.json"));
            manifestBytes = await ReadBoundedAsync(Path.Combine(root, "manifest.json"), Math.Min(4 * 1024 * 1024, maxTotalBytes), ct);
            using var document = Parse(manifestBytes);
            manifest = document.RootElement.Deserialize<CurrentRecoveryManifest>(Json)
                ?? throw new InvalidDataException();
            if (manifest.Format != "wfs-snapshot" || manifest.Version != 2
                || manifest.HouseholdId != expectedHouseholdId || manifest.SchemaFingerprint != expectedSchemaFingerprint
                || manifest.Artifacts is null || manifest.Hashes is null || manifest.Recipes is null)
                throw new InvalidDataException();
        }
        catch (Exception ex) when (InputFailure(ex))
        {
            throw new CurrentRecoveryPreflightException([new("manifest.json", "unsupported-or-invalid-manifest")]);
        }

        var entries = new Dictionary<string, CurrentRecoveryArtifact>(StringComparer.Ordinal);
        var portablePaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var ids = manifest.Recipes.Where(x => x is not null).Select(x => x.RecipeId).ToHashSet();
        Require(!ids.Contains(Guid.Empty) && ids.Count == manifest.Recipes.Length, "manifest.json", "invalid-recipe-membership");
        foreach (var artifact in manifest.Artifacts)
        {
            ct.ThrowIfCancellationRequested();
            if (artifact is null || !SafePath(artifact.Path) || artifact.Path == "manifest.json"
                || !portablePaths.Add(artifact.Path) || !entries.TryAdd(artifact.Path, artifact))
            {
                Error("manifest.json", "unsafe-or-duplicate-artifact");
                continue;
            }
            if (HouseholdArtifactKinds.Contains(artifact.Kind))
                Require(artifact.RecipeId is null && !artifact.Path.StartsWith("recipes/", StringComparison.Ordinal), artifact.Path, "invalid-household-membership");
            else
                Require(artifact.Kind is "recipe-metadata" or "recipe-content" or "recipe-media" or "recipe-evidence"
                    && artifact.RecipeId is { } id && ids.Contains(id)
                    && artifact.Path.StartsWith($"recipes/{id}/", StringComparison.Ordinal), artifact.Path, "invalid-recipe-artifact");
            Require(artifact.Dependencies is not null, artifact.Path, "missing-dependencies");
        }
        foreach (var kind in HouseholdArtifactKinds)
            Require(entries.Values.Count(x => x.Kind == kind) == 1, "manifest.json", "missing-or-duplicate-" + kind);
        Require(entries.Keys.ToHashSet(StringComparer.Ordinal).SetEquals(manifest.Hashes.Keys), "manifest.json", "hash-membership-mismatch");
        foreach (var artifact in entries.Values)
        {
            if (artifact.Dependencies is not { } dependencies) continue;
            Require(dependencies.Distinct(StringComparer.Ordinal).Count() == dependencies.Length
                && dependencies.All(x => x is not null && x != artifact.Path && entries.ContainsKey(x)), artifact.Path, "invalid-dependency");
        }

        // Capture bytes once, then parse only those captured bytes. Changes to the
        // input directory after inspection can never change the returned inventory.
        var captured = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        long total = manifestBytes.Length;
        foreach (var (path, artifact) in entries)
        {
            ct.ThrowIfCancellationRequested();
            if (!manifest.Hashes.TryGetValue(path, out var expected) || expected is null || expected.Length < 0
                || expected.Length > maxArtifactBytes || expected.Length > maxTotalBytes - total
                || expected.Sha256 is null || expected.Sha256.Length != 64 || !expected.Sha256.All(Uri.IsHexDigit))
            {
                Error(path, "invalid-hash-or-size");
                continue;
            }
            total += expected.Length;
            try
            {
                var current = root;
                foreach (var segment in path.Split('/')) { current = Path.Combine(current, segment); RejectLink(current); }
                var bytes = await ReadBoundedAsync(current, expected.Length, ct);
                if (bytes.LongLength != expected.Length || !Convert.ToHexString(SHA256.HashData(bytes)).Equals(expected.Sha256, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException();
                captured.Add(path, bytes);
                if (artifact.Kind is not ("recipe-media" or "recipe-evidence"))
                {
                    using var parsed = Parse(bytes);
                    if (HouseholdArtifactKinds.Contains(artifact.Kind)
                        && parsed.RootElement.ValueKind is not (JsonValueKind.Object or JsonValueKind.Array))
                        throw new InvalidDataException();
                }
            }
            catch (Exception ex) when (InputFailure(ex)) { Error(path, "invalid-artifact"); }
        }
        try
        {
            var actual = EnumerateFiles(root, ct).Select(x => Path.GetRelativePath(root, x).Replace('\\', '/'))
                .Where(x => x != "manifest.json").ToHashSet(StringComparer.Ordinal);
            Require(actual.SetEquals(entries.Keys), "manifest.json", "unlisted-or-missing-artifacts");
        }
        catch (Exception ex) when (InputFailure(ex)) { Error("manifest.json", "unsafe-inventory-tree"); }

        foreach (var recipe in manifest.Recipes)
        {
            ct.ThrowIfCancellationRequested();
            if (recipe is null) continue;
            var prefix = $"recipes/{recipe.RecipeId}/";
            Require(recipe.Metadata == prefix + "recipe.info" && recipe.Content == prefix + "recipe.json", "manifest.json", "invalid-recipe-paths");
            foreach (var (path, kind) in new[] { (recipe.Metadata, "recipe-metadata"), (recipe.Content, "recipe-content") })
                Require(path is not null && entries.TryGetValue(path, out var entry) && entry.Kind == kind && entry.RecipeId == recipe.RecipeId,
                    "manifest.json", "missing-recipe-record");
            Require(entries.Values.Count(x => x.RecipeId == recipe.RecipeId && x.Kind == "recipe-content") == 1
                && entries.Values.Count(x => x.RecipeId == recipe.RecipeId && x.Kind == "recipe-metadata") == 1, "manifest.json", "duplicate-recipe-record");
            var sources = new Dictionary<string, CurrentRecoverySource>(StringComparer.Ordinal);
            if (recipe.Sources is null) Error(recipe.Content ?? "manifest.json", "missing-source-associations");
            else foreach (var source in recipe.Sources)
                if (source is null || string.IsNullOrWhiteSpace(source.SourceRef) || string.IsNullOrWhiteSpace(source.SourceRevision)
                    || !sources.TryAdd(source.SourceRef, source) || source.Artifacts is not { Length: > 0 } paths
                    || paths.Distinct(StringComparer.Ordinal).Count() != paths.Length
                    || paths.Any(x => x is null || !entries.TryGetValue(x, out var entry)
                        || entry.Kind is not ("recipe-evidence" or "recipe-media") || entry.RecipeId != recipe.RecipeId))
                    Error(recipe.Content ?? "manifest.json", "invalid-source-association");
            var associated = sources.Values.SelectMany(x => x.Artifacts ?? []).ToHashSet(StringComparer.Ordinal);
            foreach (var evidence in entries.Values.Where(x => x.RecipeId == recipe.RecipeId && x.Kind == "recipe-evidence"))
                Require(associated.Contains(evidence.Path), evidence.Path, "unassociated-retained-evidence");
            if (recipe.Content is { } contentPath && captured.TryGetValue(contentPath, out var contentBytes))
            {
                try
                {
                    using var document = Parse(contentBytes);
                    var content = RecipeExportContent.ReadCurrent(document.RootElement, recipe.RecipeId);
                    Require(content.Content.IngredientLines.All(x => x.Provenance.SourceRef is null || sources.ContainsKey(x.Provenance.SourceRef)),
                        contentPath, "missing-retained-source");
                }
                catch (Exception ex) when (InputFailure(ex)) { Error(contentPath, "invalid-current-content"); }
            }
            if (recipe.Metadata is { } infoPath && captured.TryGetValue(infoPath, out var infoBytes))
            {
                try
                {
                    using var document = Parse(infoBytes);
                    var info = document.RootElement;
                    var count = info.GetProperty("imageCount").GetInt32();
                    var finished = info.GetProperty("finishedDishImageIndex").GetInt32();
                    if (info.GetProperty("id").GetGuid() != recipe.RecipeId || count < 0 || finished < -1 || finished >= count)
                        throw new InvalidDataException();
                    // This validates the declared original/page membership, not image
                    // decoding, readiness policy or complete metadata field semantics.
                    var originals = entries.Values.Where(x => x.RecipeId == recipe.RecipeId && x.Kind == "recipe-media").ToArray();
                    Require(count <= originals.Length, infoPath, "missing-or-ambiguous-original");
                    for (var index = 0; index < count && count <= originals.Length; index++)
                        Require(originals.Count(x => new[] { ".jpg", ".jpeg", ".png", ".webp" }.Any(ext => x.Path == prefix + "original/" + index + ext)) == 1,
                            infoPath, "missing-or-ambiguous-original");
                }
                catch (Exception ex) when (InputFailure(ex)) { Error(infoPath, "invalid-recipe-metadata-membership"); }
            }
        }
        ct.ThrowIfCancellationRequested();
        if (errors.Count != 0) throw new CurrentRecoveryPreflightException(errors.AsReadOnly());
        return new(manifestBytes, captured);
    }

    private static bool SafePath(string? path) => !string.IsNullOrEmpty(path) && !path.Contains('\\')
        && !path.Contains(':') && !path.Contains('\0') && !Path.IsPathRooted(path)
        && path.Split('/').All(x => x is not ("" or "." or "..") && x == x.Trim());

    // The explicitly selected root may have a platform alias in its ancestors
    // (e.g. macOS /var). Reject links at that root and every descendant, and never
    // traverse unlisted paths. This read-only inspector does not publish file paths.
    private static void RejectLink(string path)
    {
        if (new FileInfo(path).LinkTarget is not null || new DirectoryInfo(path).LinkTarget is not null)
            throw new InvalidDataException();
    }

    private static IEnumerable<string> EnumerateFiles(string root, CancellationToken ct)
    {
        foreach (var entry in Directory.EnumerateFileSystemEntries(root))
        {
            ct.ThrowIfCancellationRequested();
            RejectLink(entry);
            if (Directory.Exists(entry)) { foreach (var file in EnumerateFiles(entry, ct)) yield return file; }
            else yield return entry;
        }
    }

    private static async Task<byte[]> ReadBoundedAsync(string path, long limit, CancellationToken ct)
    {
        await using var input = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        if (input.Length > limit || input.Length > int.MaxValue) throw new InvalidDataException();
        var bytes = new byte[(int)input.Length];
        await input.ReadExactlyAsync(bytes, ct);
        var extra = new byte[1];
        if (await input.ReadAsync(extra, ct) != 0) throw new InvalidDataException();
        return bytes;
    }

    private static JsonDocument Parse(byte[] bytes)
    {
        var document = JsonDocument.Parse(bytes);
        try { Unique(document.RootElement); return document; }
        catch { document.Dispose(); throw; }
    }

    private static void Unique(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Object)
        {
            var names = new HashSet<string>(StringComparer.Ordinal);
            foreach (var property in value.EnumerateObject())
            {
                if (!names.Add(property.Name)) throw new InvalidDataException();
                Unique(property.Value);
            }
        }
        else if (value.ValueKind == JsonValueKind.Array) foreach (var item in value.EnumerateArray()) Unique(item);
    }

    private static bool InputFailure(Exception ex) => ex is InvalidDataException or IOException or UnauthorizedAccessException
        or JsonException or ArgumentException or InvalidOperationException or KeyNotFoundException or FormatException or OverflowException;
}
