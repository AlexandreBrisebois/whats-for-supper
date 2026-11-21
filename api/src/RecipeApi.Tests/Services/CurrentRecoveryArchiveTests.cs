using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CurrentRecoveryArchiveTests : CurrentRecoveryTestSet
{
    [Fact]
    public async Task CompleteInventory_InspectsAllArtifactsWithoutAnyWrites()
    {
        await WriteAsync();
        var before = DiskHashes();
        await InspectAsync();
        Assert.Equal(before.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }

    [Theory]
    [InlineData("version")]
    [InlineData("format")]
    [InlineData("schema")]
    [InlineData("household")]
    [InlineData("missing-kind")]
    [InlineData("duplicate-kind")]
    [InlineData("missing-hash")]
    [InlineData("extra-hash")]
    [InlineData("duplicate-path")]
    [InlineData("missing-file")]
    [InlineData("digest")]
    [InlineData("length")]
    [InlineData("unknown-kind")]
    [InlineData("dependency")]
    [InlineData("foreign-recipe")]
    [InlineData("duplicate-recipe")]
    [InlineData("missing-source")]
    [InlineData("foreign-evidence")]
    [InlineData("missing-media")]
    [InlineData("metadata-id")]
    [InlineData("metadata-count")]
    [InlineData("legacy-content")]
    [InlineData("malformed-json")]
    [InlineData("null-household-artifact")]
    [InlineData("orphan-evidence")]
    public async Task InvalidCompleteSet_IsRejectedWithoutChangingAnyArtifact(string mutation)
    {
        var contentPath = _manifest.Recipes[0].Content;
        var infoPath = _manifest.Recipes[0].Metadata;
        switch (mutation)
        {
            case "version": _manifest = _manifest with { Version = 1 }; break;
            case "format": _manifest = _manifest with { Format = "other" }; break;
            case "schema": _manifest = _manifest with { SchemaFingerprint = "other" }; break;
            case "household": _manifest = _manifest with { HouseholdId = Guid.NewGuid() }; break;
            case "missing-kind": _manifest = _manifest with { Artifacts = _manifest.Artifacts.Skip(1).ToArray() }; break;
            case "duplicate-kind": _manifest = _manifest with { Artifacts = [.. _manifest.Artifacts, new("extra.json", "family-members", null, [])] }; _files["extra.json"] = "[]"u8.ToArray(); break;
            case "missing-hash": _manifest.Hashes.Remove(contentPath); break;
            case "extra-hash": _manifest.Hashes.Add("unknown.json", new(0, new string('0', 64))); break;
            case "duplicate-path": _manifest = _manifest with { Artifacts = [.. _manifest.Artifacts, _manifest.Artifacts[0]] }; break;
            case "missing-file": _files.Remove(contentPath); break;
            case "digest": _files[contentPath] = "{}"u8.ToArray(); break;
            case "length": _manifest.Hashes[contentPath] = _manifest.Hashes[contentPath] with { Length = -1 }; break;
            case "unknown-kind": _manifest.Artifacts[0] = _manifest.Artifacts[0] with { Kind = "mystery" }; break;
            case "dependency": _manifest.Artifacts[0] = _manifest.Artifacts[0] with { Dependencies = ["missing.json"] }; break;
            case "foreign-recipe": _manifest.Artifacts[^1] = _manifest.Artifacts[^1] with { RecipeId = Guid.NewGuid() }; break;
            case "duplicate-recipe": _manifest = _manifest with { Recipes = [.. _manifest.Recipes, _manifest.Recipes[0]] }; break;
            case "missing-source": _manifest.Recipes[0] = _manifest.Recipes[0] with { Sources = [] }; break;
            case "foreign-evidence": _manifest.Recipes[0].Sources[0] = _manifest.Recipes[0].Sources[0] with { Artifacts = ["family-members.json"] }; break;
            case "missing-media": _manifest = _manifest with { Artifacts = _manifest.Artifacts.Where(x => x.Kind != "recipe-media").ToArray() }; break;
            case "metadata-id": _files[infoPath] = Encoding.UTF8.GetBytes($$"""{"id":"{{Guid.NewGuid()}}","imageCount":1,"finishedDishImageIndex":0}"""); _manifest = _manifest with { Hashes = Hashes() }; break;
            case "metadata-count": _files[infoPath] = Encoding.UTF8.GetBytes($$"""{"id":"{{_recipe}}","imageCount":2,"finishedDishImageIndex":0}"""); _manifest = _manifest with { Hashes = Hashes() }; break;
            case "legacy-content": _files[contentPath] = "{\"backupContentVersion\":1}"u8.ToArray(); _manifest = _manifest with { Hashes = Hashes() }; break;
            case "malformed-json": _files["grocery-extras.json"] = "{"u8.ToArray(); _manifest = _manifest with { Hashes = Hashes() }; break;
            case "null-household-artifact": _files["grocery-extras.json"] = "null"u8.ToArray(); _manifest = _manifest with { Hashes = Hashes() }; break;
            case "orphan-evidence":
                var orphan = $"recipes/{_recipe}/original/older.html";
                _files[orphan] = "retained historical evidence"u8.ToArray();
                _manifest = _manifest with { Artifacts = [.. _manifest.Artifacts, new(orphan, "recipe-evidence", _recipe, [])], Hashes = Hashes() };
                break;
        }
        await WriteAsync();
        var before = DiskHashes();
        var failure = await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(InspectAsync);
        Assert.NotEmpty(failure.Diagnostics);
        Assert.Equal(before.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }

    [Theory]
    [InlineData("../outside.json")]
    [InlineData("/tmp/outside.json")]
    [InlineData("a\\b.json")]
    [InlineData("a//b.json")]
    [InlineData("./a.json")]
    public async Task UnsafeInventoryPath_IsRejectedBeforeArtifactAccess(string path)
    {
        _manifest.Artifacts[0] = _manifest.Artifacts[0] with { Path = path };
        await WriteAsync();
        await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(InspectAsync);
    }

    [Theory]
    [InlineData("format")]
    [InlineData("version")]
    [InlineData("schemaFingerprint")]
    [InlineData("householdId")]
    [InlineData("artifacts")]
    [InlineData("hashes")]
    [InlineData("recipes")]
    public async Task MissingManifestMember_IsNotAnExplicitEmptyValue(string property)
    {
        await WriteAsync();
        var node = JsonSerializer.SerializeToNode(_manifest, Json)!.AsObject();
        node.Remove(property);
        await File.WriteAllTextAsync(Path.Combine(_root, "manifest.json"), node.ToJsonString());
        await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(InspectAsync);
    }

    [Fact]
    public async Task LaterRecordsAreStillInspectedAndNoPrivatePayloadEntersDiagnostics()
    {
        _files[_manifest.Recipes[0].Content] = "{private malformed source"u8.ToArray();
        _files["calendar-events.json"] = "{private later source"u8.ToArray();
        _manifest = _manifest with { Hashes = Hashes() };
        await WriteAsync();
        var failure = await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(InspectAsync);
        Assert.Contains(failure.Diagnostics, x => x.Path == _manifest.Recipes[0].Content);
        Assert.Contains(failure.Diagnostics, x => x.Path == "calendar-events.json");
        Assert.DoesNotContain("private", JsonSerializer.Serialize(failure.Diagnostics));
    }

    [Fact]
    public async Task UnlistedArtifactAndSymlinkAreRejected()
    {
        await WriteAsync();
        await File.WriteAllTextAsync(Path.Combine(_root, "unlisted.json"), "[]");
        await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(InspectAsync);
        File.Delete(Path.Combine(_root, "unlisted.json"));
        File.CreateSymbolicLink(Path.Combine(_root, "linked.json"), Path.Combine(_root, "family-members.json"));
        await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(InspectAsync);
    }

    [Fact]
    public async Task SizeLimitsAndCancellationRejectBeforeReturningAnInventory()
    {
        await WriteAsync();
        await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => CurrentRecoveryArchive.InspectAsync(_root, _household, Schema, maxArtifactBytes: 1));
        await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => CurrentRecoveryArchive.InspectAsync(_root, _household, Schema, maxTotalBytes: 1));
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => CurrentRecoveryArchive.InspectAsync(_root, _household, Schema, cancellation.Token));
    }

    [Fact]
    public async Task ManagementInspection_UsesCommittedDestinationAndReviewedCapturedBaselineWithoutWriting()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        await CheckManagementAsync(factory.Services);
    }

    [Fact]
    public async Task ManagementInspection_DoesNotCreateConvertResumeOrOverwriteUnreviewedState()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        await CheckRefusalsAsync(factory.Services);
    }

    [Fact]
    public async Task RetainedSourceMayIncludeOriginalMediaWithoutDuplicatingItsBytes()
    {
        var source = _manifest.Recipes[0].Sources[0];
        _manifest.Recipes[0].Sources[0] = source with { Artifacts = [.. source.Artifacts, $"recipes/{_recipe}/original/0.png"] };
        await WriteAsync();
        var inventory = await InspectAsync();
        Assert.Equal(_files.Count, inventory.Paths.Count);
    }

    [Fact]
    public async Task FrozenInventoryNeverRereadsSourceAndDoesNotExposeMutableBuffers()
    {
        await WriteAsync();
        var inventory = await InspectAsync();
        var path = _manifest.Recipes[0].Content;
        await File.WriteAllTextAsync(Path.Combine(_root, path), "changed after inspection");
        await using var frozen = inventory.OpenRead(path);
        using var captured = new MemoryStream();
        await frozen.CopyToAsync(captured);
        Assert.Equal(_files[path], captured.ToArray());
        Assert.False(frozen.CanWrite);
        Assert.False(((MemoryStream)frozen).TryGetBuffer(out _));
        using var manifest = inventory.ReadManifest();
        Assert.Equal("wfs-snapshot", manifest.RootElement.GetProperty("format").GetString());
        Assert.Equal(_files.Keys.Order(), inventory.Paths.Order());
    }

    [Fact]
    public async Task ManagementInspection_InvalidInventoryStopsBeforeDestinationDatabaseAccess()
    {
        await WriteAsync();
        await File.WriteAllTextAsync(Path.Combine(_root, "calendar-events.json"), "malformed");
        var before = DiskHashes();
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().DisposeAsync();
        // Any premature destination access would throw ObjectDisposedException.
        await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => service.InspectCurrentRecoveryAsync(_root, _household, Schema, []));
        Assert.Equal(before.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }
}
