using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public partial class ManagementService
{
    // An integrity record inside the existing disk backup, not another recovery
    // operation. Legacy-only operation remains fenced by the separate cutover.
    private sealed record CanonicalBackupInventory(int Version, Guid[] Recipes, Dictionary<string, string> Files);
    private sealed record CanonicalSeedInput(CanonicalRecipeExport Content, string Info, string Json);
    private string CanonicalBackupInventoryPath => Path.Combine(DataRoot, "canonical-backup.json");

    private async Task WriteCanonicalBackupInventoryAsync(IReadOnlyCollection<Guid> canonicalIds, CancellationToken ct)
    {
        var files = new Dictionary<string, string>(StringComparer.Ordinal);
        if (canonicalIds.Count > 0)
        {
            foreach (var name in new[] { "family-members.json", "weekly-plans.json", "calendar-events.json", "ingredient-categories.csv",
                "recipe-import-reports.json", "grocery-extras.json", "supper-servings.json", "weekly-household-interest.json" })
            {
                var path = Path.Combine(DataRoot, name);
                if (!File.Exists(path)) throw new InvalidDataException($"Canonical backup is missing {name}.");
                files["data/" + name] = await BackupHashAsync(path, ct);
            }
            foreach (var id in canonicalIds)
            {
                var root = Path.Combine(ActiveRecipesRoot, id.ToString());
                foreach (var path in Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories))
                {
                    var relative = Path.GetRelativePath(root, path).Replace(Path.DirectorySeparatorChar, '/');
                    if (relative.StartsWith(".publications/", StringComparison.Ordinal)) continue;
                    files[$"recipes/{id}/{relative}"] = await BackupHashAsync(path, ct);
                }
            }
        }
        var temporary = CanonicalBackupInventoryPath + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await WriteJsonAsync(temporary, new CanonicalBackupInventory(2, canonicalIds.Order().ToArray(), files), ct);
            File.Move(temporary, CanonicalBackupInventoryPath, overwrite: true);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }

    private async Task<Dictionary<Guid, CanonicalSeedInput>> PreflightCanonicalSeedAsync(CancellationToken ct)
    {
        var inputs = new Dictionary<Guid, CanonicalSeedInput>();
        foreach (var id in await recipeStore.ListRecipeIdsAsync(ct))
        {
            var json = await recipeStore.ReadRecipeJsonAsync(id, ct);
            if (json is null) continue;
            JsonDocument document;
            try { document = JsonDocument.Parse(json); }
            catch (JsonException) { continue; } // Declared canonical membership below still fails closed.
            using var documentLifetime = document;
            if (document.RootElement.ValueKind != JsonValueKind.Object || !document.RootElement.TryGetProperty("format", out _)) continue;
            var content = RecipeExportContent.ReadCurrent(document.RootElement, id);
            var info = await recipeStore.ReadInfoAsync(id, ct) ?? throw new InvalidDataException("Canonical recipe metadata is missing.");
            if (info.Id != id || info.ImageCount is < 0 or > 20 || string.IsNullOrWhiteSpace(info.Name) && info.IsReady != false
                || info.RotationVersion is < 0 or > 1 || info.RotationVersion == 1 &&
                (info.RotationSource is not ("Unknown" or "Human" or "AI" or "Dreaming") || info.RotationHumanOff && info.RotationSource != "Human")) throw new InvalidDataException("Canonical recipe metadata identity differs.");
            inputs.Add(id, new(content, JsonSerializer.Serialize(info, JsonDefaults.CamelCase), json));
        }
        if (!File.Exists(CanonicalBackupInventoryPath))
        {
            if (inputs.Count > 0) throw new InvalidDataException("Canonical seed requires its existing-backup integrity record.");
            return inputs;
        }
        var inventory = await ReadJsonAsync<CanonicalBackupInventory>(CanonicalBackupInventoryPath, ct);
        if (inventory is null || inventory.Version != 2 || inventory.Recipes is null || inventory.Files is null
            || !inventory.Recipes.Order().SequenceEqual(inputs.Keys.Order()) || inventory.Recipes.Distinct().Count() != inventory.Recipes.Length)
            throw new InvalidDataException("Canonical backup inventory does not match recipe membership.");
        if (inputs.Count > 0)
            foreach (var name in new[] { "family-members.json", "weekly-plans.json", "calendar-events.json", "ingredient-categories.csv",
                "recipe-import-reports.json", "grocery-extras.json", "supper-servings.json", "weekly-household-interest.json" })
                if (!inventory.Files.ContainsKey("data/" + name)) throw new InvalidDataException("Canonical backup lacks a required household artifact.");
        foreach (var (relative, expected) in inventory.Files)
        {
            var parts = relative.Split('/');
            if (parts.Any(x => x is "" or "." or ".." || x.Contains('\\') || x.Contains(':')))
                throw new InvalidDataException("Unsafe backup artifact path.");
            var root = parts[0] switch { "data" => DataRoot, "recipes" => ActiveRecipesRoot, _ => throw new InvalidDataException("Unsupported backup artifact root.") };
            var path = Path.Combine(root, Path.Combine(parts.Skip(1).ToArray()));
            if (!File.Exists(path) || await BackupHashAsync(path, ct) != expected)
                throw new InvalidDataException("Canonical backup artifact is missing or changed.");
        }
        foreach (var id in inputs.Keys.ToArray())
        {
            foreach (var name in new[] { "recipe.info", "recipe.json" })
                if (!inventory.Files.ContainsKey($"recipes/{id}/{name}")) throw new InvalidDataException("Canonical backup lacks required recipe artifacts.");
            // Bind decoded values to the exact bytes covered by the inventory.
            // Later recipe reads use these frozen buffers, never mutable files.
            var root = Path.Combine(ActiveRecipesRoot, id.ToString());
            var info = await File.ReadAllTextAsync(Path.Combine(root, "recipe.info"), ct);
            var json = await File.ReadAllTextAsync(Path.Combine(root, "recipe.json"), ct);
            foreach (var pair in new[] { (Name: "recipe.info", Value: info), (Name: "recipe.json", Value: json) })
                if (Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(pair.Value))) != inventory.Files[$"recipes/{id}/{pair.Name}"])
                    throw new InvalidDataException("Canonical backup changed during preflight.");
            using var content = JsonDocument.Parse(json);
            var metadata = JsonSerializer.Deserialize<RecipeInfo>(info, JsonDefaults.CamelCase);
            if (metadata?.Id != id) throw new InvalidDataException("Canonical metadata identity differs.");
            inputs[id] = new(RecipeExportContent.ReadCurrent(content.RootElement, id), info, json);
        }
        return inputs;
    }

    private async Task<string> BackupHashAsync(string path, CancellationToken ct)
    {
        // Reject links at each existing component rather than hashing outside the
        // operator's selected backup roots through a symlink.
        for (var entry = new FileInfo(path) as FileSystemInfo; entry is not null; entry = entry is FileInfo f ? f.Directory : ((DirectoryInfo)entry).Parent)
        {
            if (entry.LinkTarget is not null) throw new InvalidDataException("Linked backup artifacts are unsupported.");
            if (entry.FullName == Path.GetFullPath(DataRoot) || entry.FullName == Path.GetFullPath(ActiveRecipesRoot)) break;
        }
        await using var stream = File.OpenRead(path);
        return Convert.ToHexString(await SHA256.HashDataAsync(stream, ct));
    }

    private static void SetCanonicalSeedContent(Recipe recipe, CanonicalRecipeExport export)
    {
        recipe.CanonicalContent = JsonSerializer.Serialize(export.Content, JsonDefaults.CamelCase);
        recipe.Ingredients = JsonSerializer.Serialize(export.Content.IngredientLines.Select(CanonicalRecipeContentStore.Render), JsonDefaults.CamelCase);
        recipe.RawMetadata = export.RawMetadata;
        recipe.Servings = export.Content.Servings;
    }

    private static bool IdenticalCanonicalSeed(Recipe incoming, Recipe current)
    {
        var saved = CanonicalRecipeContentStore.Read(current);
        var candidate = CanonicalRecipeContentStore.Read(incoming);
        return saved is not null && candidate is not null
            && RecipeExportContent.IsIdenticalCurrent(new(incoming.Id, candidate, incoming.RawMetadata), new(current.Id, saved, current.RawMetadata))
            && JsonSerializer.Serialize(RecipeFilePublicationStore.Observe(incoming), JsonDefaults.CamelCase)
                == JsonSerializer.Serialize(RecipeFilePublicationStore.Observe(current), JsonDefaults.CamelCase);
    }
}
