using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Services;
using SkiaSharp;
using Xunit;

namespace RecipeApi.Tests.Infrastructure;

public class CurrentRecoveryTestSet : IDisposable
{
    protected static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    protected readonly string _root = Path.Combine(Path.GetTempPath(), "wfs-current-inventory-" + Guid.NewGuid().ToString("N"));
    protected readonly Guid _household = Guid.NewGuid();
    protected readonly Guid _recipe = CurrentRecipeExportTests.Example().RecipeId;
    protected const string Schema = "synthetic-schema-fingerprint";
    protected readonly Dictionary<string, byte[]> _files = new(StringComparer.Ordinal);
    protected CurrentRecoveryManifest _manifest;

    public CurrentRecoveryTestSet()
    {
        Directory.CreateDirectory(_root);
        var artifacts = new List<CurrentRecoveryArtifact>();
        foreach (var kind in CurrentRecoveryArchive.HouseholdArtifactKinds)
        {
            var path = kind + ".json";
            _files[path] = Encoding.UTF8.GetBytes("[]");
            artifacts.Add(new(path, kind, null, []));
        }
        foreach (var (kind, value) in CurrentRecoveryHouseholdTestData.Example(_recipe, _household))
            _files[kind + ".json"] = JsonSerializer.SerializeToUtf8Bytes(value, Json);
        var prefix = $"recipes/{_recipe}/";
        var content = CurrentRecipeExportTests.Example();
        _files[prefix + "recipe.json"] = Encoding.UTF8.GetBytes(RecipeExportContent.WriteCurrent(content));
        _files[prefix + "recipe.info"] = RecipeMetadata();
        _files[prefix + "original/0.png"] = RecipeImage();
        _files[prefix + "original/content.html"] = Encoding.UTF8.GetBytes("<p>Retained source 🥣</p>");
        artifacts.Add(new(prefix + "recipe.info", "recipe-metadata", _recipe, []));
        artifacts.Add(new(prefix + "recipe.json", "recipe-content", _recipe, [prefix + "recipe.info", prefix + "original/content.html"]));
        artifacts.Add(new(prefix + "original/0.png", "recipe-media", _recipe, [prefix + "recipe.info"]));
        artifacts.Add(new(prefix + "original/content.html", "recipe-evidence", _recipe, [prefix + "recipe.info"]));
        _manifest = new("wfs-snapshot", 2, Schema, _household, artifacts.ToArray(), Hashes(),
            [new(_recipe, prefix + "recipe.info", prefix + "recipe.json",
                [new("evidence:retained", "source-opaque", [prefix + "original/content.html"])])]);
    }

    public void Dispose() => Directory.Delete(_root, true);

    protected static byte[] RecipeImage(SKEncodedImageFormat format = SKEncodedImageFormat.Png)
    {
        using var bitmap = new SKBitmap(2, 2);
        bitmap.Erase(SKColors.Coral);
        using var encoded = bitmap.Encode(format, 100);
        return encoded.ToArray();
    }

    protected byte[] RecipeMetadata() => JsonSerializer.SerializeToUtf8Bytes(new
    {
        id = _recipe, finishedDishImageIndex = 0, imageCount = 1, isSynthesized = false,
        addedBy = (Guid?)null, notes = "Private note", description = (string?)null, name = "Recipe 🥣",
        rating = 2, language = (string?)null, createdAt = "2026-11-01T00:00:00Z", updatedAt = "2026-11-02T00:00:00Z",
        category = "Supper", cuisineType = (string?)null, mealTypes = new[] { "Supper" },
        isDiscoverable = true, rotationVersion = 1, rotationHumanOff = false, rotationSource = "AI",
        cookedSuppressed = false, supperSuitable = (bool?)true, isReady = true, isVegetarian = (bool?)null,
        totalTime = (string?)null, lastCookedDate = (string?)null, deletedAt = (string?)null,
        deletedBy = (Guid?)null, deleteNote = (string?)null, sourceUrl = "https://example.invalid/recipe"
    });

    protected Dictionary<string, CurrentRecoveryHash> Hashes() => _files.ToDictionary(x => x.Key,
        x => new CurrentRecoveryHash(x.Value.Length, Convert.ToHexString(SHA256.HashData(x.Value))), StringComparer.Ordinal);

    protected async Task WriteAsync()
    {
        foreach (var (path, bytes) in _files)
        {
            var target = Path.Combine(_root, path);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            await File.WriteAllBytesAsync(target, bytes);
        }
        await File.WriteAllTextAsync(Path.Combine(_root, "manifest.json"), JsonSerializer.Serialize(_manifest, Json));
    }

    protected Task<CurrentRecoveryArchive> InspectAsync() => CurrentRecoveryArchive.InspectAsync(_root, _household, Schema);

    protected Dictionary<string, string> DiskHashes() => Directory.EnumerateFiles(_root, "*", SearchOption.AllDirectories)
        .ToDictionary(p => Path.GetRelativePath(_root, p), p => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(p))));

    public async Task CheckManagementAsync(IServiceProvider services)
    {
        await WriteAsync();
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        using var document = JsonDocument.Parse(_files[_manifest.Recipes[0].Content]);
        var incoming = RecipeExportContent.ReadCurrent(document.RootElement, _recipe);
        var content = incoming.Content with { ContentRevision = "destination-opaque", Servings = 4 };
        var row = new Recipe
        {
            Id = _recipe, Name = "Protected current title", Notes = "Protected current note", Servings = 4,
            CanonicalContent = JsonSerializer.Serialize(content, Json), RawMetadata = incoming.RawMetadata,
            CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
        };
        db.Recipes.Add(row);
        await db.SaveChangesAsync();
        var committed = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == _recipe);
        var destination = new CanonicalRecipeExport(_recipe, CanonicalRecipeContentStore.Read(committed)!, committed.RawMetadata);
        var baseline = new CurrentRecipeRecoveryBaseline(_recipe, content.ContentRevision, CurrentRecipeRecoveryAuthority.ContentHash(destination),
            content.SourceRevision, CurrentRecipeRecoveryAuthority.RawMetadataHash(destination), ["servings"]);
        var before = DiskHashes();
        var operations = await db.CanonicalRecipeOperations.CountAsync();
        var publications = await db.RecipeFilePublications.CountAsync();
        // A tracked draft must neither become the baseline nor be reloaded/lost.
        row.CanonicalContent = "{}";
        row.Notes = "Unsaved local draft";
        var withoutAuthority = await service.InspectCurrentRecoveryAsync(_root, _household, Schema, []);
        Assert.Equal("deferred", Assert.Single(withoutAuthority.Recipes).Assessment.State);
        var inspection = await service.InspectCurrentRecoveryAsync(_root, _household, Schema, [baseline]);
        Assert.Equal("captured-baseline-matches", Assert.Single(inspection.Recipes).Assessment.State);
        Assert.Equal("{}", row.CanonicalContent);
        Assert.Equal("Unsaved local draft", row.Notes);
        var unchanged = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == _recipe);
        Assert.Equal(committed.CanonicalContent, unchanged.CanonicalContent);
        Assert.Equal("Protected current note", unchanged.Notes);
        Assert.Equal(operations, await db.CanonicalRecipeOperations.CountAsync());
        Assert.Equal(publications, await db.RecipeFilePublications.CountAsync());
        Assert.Equal(before.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
        await db.Entry(row).ReloadAsync();
        row.CanonicalContent = JsonSerializer.Serialize(content with { ContentRevision = "new-human-opaque", Servings = 5 }, Json);
        row.Servings = 5;
        await db.SaveChangesAsync();
        var stale = await service.InspectCurrentRecoveryAsync(_root, _household, Schema, [baseline]);
        Assert.Equal("stale-content-baseline", Assert.Single(stale.Recipes).Assessment.Reason);
        Assert.Equal(5, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == _recipe)).Servings);
    }

    public async Task CheckRefusalsAsync(IServiceProvider services)
    {
        await WriteAsync();
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        var absent = await service.InspectCurrentRecoveryAsync(_root, _household, Schema, []);
        Assert.Equal("missing-captured-membership", Assert.Single(absent.Recipes).Assessment.Reason);
        Assert.False(await db.Recipes.AnyAsync(x => x.Id == _recipe));

        var row = new Recipe { Id = _recipe, Name = "Legacy current", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        db.Recipes.Add(row);
        await db.SaveChangesAsync();
        var legacy = await service.InspectCurrentRecoveryAsync(_root, _household, Schema, []);
        Assert.Equal("destination-requires-forward-conversion", Assert.Single(legacy.Recipes).Assessment.Reason);
        Assert.Null((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == _recipe)).CanonicalContent);

        using var document = JsonDocument.Parse(_files[_manifest.Recipes[0].Content]);
        var incoming = RecipeExportContent.ReadCurrent(document.RootElement, _recipe);
        row.CanonicalContent = JsonSerializer.Serialize(incoming.Content, Json);
        row.RawMetadata = incoming.RawMetadata;
        var pending = new RecipeFilePublication
        {
            RecipeId = _recipe, OperationId = Guid.NewGuid(), InputHash = new string('0', 64), ResultHash = new string('1', 64),
            Payload = "{}", CreatedAt = DateTimeOffset.UtcNow, Delivered = false
        };
        db.RecipeFilePublications.Add(pending);
        await db.SaveChangesAsync();
        var before = DiskHashes();
        var journal = await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.RecipeId == _recipe);
        var busy = await service.InspectCurrentRecoveryAsync(_root, _household, Schema, []);
        Assert.Equal("pending-file-publication", Assert.Single(busy.Recipes).Assessment.Reason);
        Assert.Equal(JsonSerializer.Serialize(journal), JsonSerializer.Serialize(await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.RecipeId == _recipe)));
        Assert.Equal(before.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));

        pending.Delivered = true;
        await db.SaveChangesAsync();
        var identical = await service.InspectCurrentRecoveryAsync(_root, _household, Schema, []);
        Assert.Equal("identical-no-write", Assert.Single(identical.Recipes).Assessment.State);
        Assert.Empty(Assert.Single(identical.Recipes).Assessment.SelectedFields);
        // Corrupt the copied input, not the destination: PostgreSQL correctly
        // prevents a direct same-token content mutation of its saved owner.
        _files[_manifest.Recipes[0].Content] = Encoding.UTF8.GetBytes(RecipeExportContent.WriteCurrent(
            incoming with { Content = incoming.Content with { Servings = 4 } }));
        _manifest = _manifest with { Hashes = Hashes() };
        await WriteAsync();
        var corruptBefore = DiskHashes();
        var corrupt = await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => service.InspectCurrentRecoveryAsync(_root, _household, Schema, []));
        Assert.Contains(corrupt.Diagnostics, x => x.Code == "invalid-destination-or-authority");
        Assert.Equal(incoming.Content.Servings, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == _recipe)).Servings);
        Assert.Equal(corruptBefore.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }

    public async Task CheckCallerTransactionAsync(IServiceProvider services)
    {
        await WriteAsync();
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        using var document = JsonDocument.Parse(_files[_manifest.Recipes[0].Content]);
        var incoming = RecipeExportContent.ReadCurrent(document.RootElement, _recipe);
        await using (var transaction = await db.Database.BeginTransactionAsync())
        {
            db.Recipes.Add(new Recipe
            {
                Id = _recipe, Name = "Uncommitted destination", CanonicalContent = JsonSerializer.Serialize(incoming.Content, Json),
                RawMetadata = incoming.RawMetadata, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();
            // Reusing this transaction would label the caller's uncommitted row
            // as a committed destination. It must never become recovery authority.
            await Assert.ThrowsAsync<InvalidOperationException>(() => service.InspectCurrentRecoveryAsync(_root, _household, Schema, []));
        }
        Assert.False(await db.Recipes.AsNoTracking().AnyAsync(x => x.Id == _recipe));
    }

    public async Task CheckSemanticRefusalsAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        using var document = JsonDocument.Parse(_files[_manifest.Recipes[0].Content]);
        var incoming = RecipeExportContent.ReadCurrent(document.RootElement, _recipe);
        var row = new Recipe
        {
            Id = _recipe, Name = "Protected destination", Notes = "Keep current note", CanonicalContent = JsonSerializer.Serialize(incoming.Content, Json),
            RawMetadata = incoming.RawMetadata, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
        };
        db.Recipes.Add(row);
        await db.SaveChangesAsync();
        var beforeRow = JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == _recipe));
        var counts = new[] { await db.FamilyMembers.CountAsync(), await db.CanonicalRecipeOperations.CountAsync(),
            await db.RecipeFilePublications.CountAsync(), await db.WorkflowInstances.CountAsync(), await db.WorkflowTasks.CountAsync() };
        row.Notes = "Unsaved draft";
        var originalInfo = _files[_manifest.Recipes[0].Metadata];
        foreach (var invalid in new[] { "metadata", "image" })
        {
            if (invalid == "metadata")
            {
                var info = JsonNode.Parse(originalInfo)!.AsObject();
                info.Remove("isReady");
                _files[_manifest.Recipes[0].Metadata] = Encoding.UTF8.GetBytes(info.ToJsonString());
            }
            else
            {
                _files[_manifest.Recipes[0].Metadata] = originalInfo;
                _files[$"recipes/{_recipe}/original/0.png"] = "invalid image with matching manifest digest"u8.ToArray();
            }
            _manifest = _manifest with { Hashes = Hashes() };
            await WriteAsync();
            var beforeDisk = DiskHashes();
            var error = await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => service.InspectCurrentRecoveryAsync(_root, _household, Schema, []));
            Assert.Contains(error.Diagnostics, x => x.Code == (invalid == "metadata" ? "invalid-current-recipe-metadata" : "invalid-current-image"));
            Assert.Equal(beforeRow, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == _recipe)));
            Assert.Equal("Unsaved draft", row.Notes);
            Assert.Equal(counts, new[] { await db.FamilyMembers.CountAsync(), await db.CanonicalRecipeOperations.CountAsync(),
                await db.RecipeFilePublications.CountAsync(), await db.WorkflowInstances.CountAsync(), await db.WorkflowTasks.CountAsync() });
            Assert.Equal(beforeDisk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
        }
    }

    public async Task CheckScopeSelectionAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        var data = scope.ServiceProvider.GetRequiredService<DataRootResolver>();
        var path = Path.Combine(data.Root, CurrentRecoveryScopeStore.FileName);
        var before = JsonSerializer.Serialize(await db.Recipes.IgnoreQueryFilters().AsNoTracking().OrderBy(x => x.Id).ToListAsync());
        await Assert.ThrowsAsync<ArgumentException>(() => service.SelectCurrentRecoveryScopeAsync(Guid.Empty));
        Assert.False(File.Exists(path));
        var selected = await service.SelectCurrentRecoveryScopeAsync(_household);
        Assert.Equal(_household, selected.HouseholdId);
        Assert.Equal(64, selected.SchemaFingerprint.Length);
        Assert.All(selected.SchemaFingerprint, x => Assert.True(Uri.IsHexDigit(x)));
        var selectedBytes = await File.ReadAllBytesAsync(path);
        Assert.Equal(selected, await service.SelectCurrentRecoveryScopeAsync(_household));
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SelectCurrentRecoveryScopeAsync(Guid.NewGuid()));
        Assert.Equal(selectedBytes, await File.ReadAllBytesAsync(path));
        await using (var transaction = await db.Database.BeginTransactionAsync())
            await Assert.ThrowsAsync<InvalidOperationException>(() => service.SelectCurrentRecoveryScopeAsync(_household));
        Assert.Equal(selectedBytes, await File.ReadAllBytesAsync(path));
        // Creation races publish one complete identical selection and leave only
        // that file. Each losing initializer removes only its own temporary file.
        var concurrentRoot = Path.Combine(data.Root, "scope-concurrency-fixture");
        var concurrent = await Task.WhenAll(Enumerable.Range(0, 4).Select(_ =>
            CurrentRecoveryScopeStore.SelectAsync(concurrentRoot, _household, selected.SchemaFingerprint)));
        Assert.All(concurrent, value => Assert.Equal(selected, value));
        Assert.Single(Directory.EnumerateFileSystemEntries(concurrentRoot));
        _manifest = _manifest with { SchemaFingerprint = selected.SchemaFingerprint };
        await WriteAsync();
        var sourceBefore = DiskHashes();
        var inspection = await service.InspectSelectedCurrentRecoveryAsync(_root, []);
        Assert.Equal("missing-captured-membership", Assert.Single(inspection.Recipes).Assessment.Reason);
        Assert.Equal(selectedBytes, await File.ReadAllBytesAsync(path));
        Assert.Equal(sourceBefore.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
        Assert.Equal(before, JsonSerializer.Serialize(await db.Recipes.IgnoreQueryFilters().AsNoTracking().OrderBy(x => x.Id).ToListAsync()));

        _manifest = _manifest with { HouseholdId = Guid.NewGuid() };
        await WriteAsync();
        await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => service.InspectSelectedCurrentRecoveryAsync(_root, []));
        Assert.Equal(selectedBytes, await File.ReadAllBytesAsync(path));

        // A matching forged archive/selection pair still cannot substitute an
        // incompatible current database shape. The schema is rechecked locally.
        var stale = selected with { SchemaFingerprint = new string('0', 64) };
        await File.WriteAllTextAsync(path, JsonSerializer.Serialize(stale, Json));
        _manifest = _manifest with { HouseholdId = _household, SchemaFingerprint = stale.SchemaFingerprint };
        await WriteAsync();
        await Assert.ThrowsAsync<InvalidDataException>(() => service.InspectSelectedCurrentRecoveryAsync(_root, []));
        Assert.Equal(before, JsonSerializer.Serialize(await db.Recipes.IgnoreQueryFilters().AsNoTracking().OrderBy(x => x.Id).ToListAsync()));
        await File.WriteAllBytesAsync(path, selectedBytes);
    }
}
