using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CurrentRecoveryScopeTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "wfs-scope-" + Guid.NewGuid().ToString("N"));
    private readonly Guid _household = Guid.NewGuid();
    private readonly string _schema = new('A', 64);

    public void Dispose() { if (Directory.Exists(_root)) Directory.Delete(_root, true); }

    private async Task WriteAsync(JsonObject? scope = null)
    {
        Directory.CreateDirectory(_root);
        scope ??= new() { ["format"] = "wfs-recovery-scope", ["version"] = 1, ["householdId"] = _household, ["schemaFingerprint"] = _schema };
        await File.WriteAllTextAsync(Path.Combine(_root, CurrentRecoveryScopeStore.FileName), scope.ToJsonString());
    }

    [Fact]
    public async Task MissingSelection_ReadNeverCreatesDirectoryOrIdentity()
    {
        await Assert.ThrowsAsync<FileNotFoundException>(() => CurrentRecoveryScopeStore.ReadAsync(_root));
        Assert.False(Directory.Exists(_root));
    }

    [Fact]
    public async Task SelectedScope_IsDurableIndependentAndReadOnly()
    {
        await WriteAsync();
        var before = await File.ReadAllBytesAsync(Path.Combine(_root, CurrentRecoveryScopeStore.FileName));
        var first = await CurrentRecoveryScopeStore.ReadAsync(_root);
        Assert.Equal(_household, first.HouseholdId);
        Assert.Equal(_schema, first.SchemaFingerprint);
        Assert.Equal(first, await CurrentRecoveryScopeStore.ReadAsync(_root));
        Assert.Equal(before, await File.ReadAllBytesAsync(Path.Combine(_root, CurrentRecoveryScopeStore.FileName)));
        Assert.Single(Directory.EnumerateFileSystemEntries(_root));
    }

    [Theory]
    [InlineData("format")]
    [InlineData("version")]
    [InlineData("householdId")]
    [InlineData("schemaFingerprint")]
    [InlineData("empty-id")]
    [InlineData("short-hash")]
    [InlineData("unknown")]
    [InlineData("duplicate")]
    [InlineData("oversized")]
    public async Task InvalidSelection_IsRefusedWithoutRepairOrWrites(string mutation)
    {
        await WriteAsync();
        var path = Path.Combine(_root, CurrentRecoveryScopeStore.FileName);
        var scope = JsonNode.Parse(await File.ReadAllTextAsync(path))!.AsObject();
        if (mutation is "format" or "version" or "householdId" or "schemaFingerprint") scope.Remove(mutation);
        else if (mutation == "empty-id") scope["householdId"] = Guid.Empty;
        else if (mutation == "short-hash") scope["schemaFingerprint"] = "not-a-shape-fingerprint";
        else if (mutation == "unknown") scope["private"] = "secret";
        var bytes = mutation == "duplicate"
            ? "{\"format\":\"wfs-recovery-scope\",\"format\":\"wfs-recovery-scope\",\"version\":1,\"householdId\":\"" + _household + "\",\"schemaFingerprint\":\"" + _schema + "\"}"
            : mutation == "oversized" ? new string(' ', 8193) + scope.ToJsonString() : scope.ToJsonString();
        await File.WriteAllTextAsync(path, bytes);
        var error = await Assert.ThrowsAsync<InvalidDataException>(() => CurrentRecoveryScopeStore.ReadAsync(_root));
        Assert.DoesNotContain("secret", error.Message);
        Assert.Equal(bytes, await File.ReadAllTextAsync(path));
        Assert.Single(Directory.EnumerateFileSystemEntries(_root));
    }

    [Fact]
    public async Task MissingPersistedScope_StopsSelectedInspectionBeforeDatabaseOrArchiveAccess()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var data = scope.ServiceProvider.GetRequiredService<DataRootResolver>();
        Assert.False(File.Exists(Path.Combine(data.Root, CurrentRecoveryScopeStore.FileName)));
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().DisposeAsync();
        await Assert.ThrowsAsync<FileNotFoundException>(() => service.InspectSelectedCurrentRecoveryAsync("unread archive", []));
        Assert.False(File.Exists(Path.Combine(data.Root, CurrentRecoveryScopeStore.FileName)));
    }

    [Fact]
    public async Task Cancellation_IsNotInputCorruptionAndCreatesNothing()
    {
        using var cancelled = new CancellationTokenSource();
        cancelled.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => CurrentRecoveryScopeStore.ReadAsync(_root, cancelled.Token));
        Assert.False(Directory.Exists(_root));
    }

    [Fact]
    public async Task LinkedSelection_IsRejectedWithoutFollowingOrReplacingIt()
    {
        await WriteAsync();
        var path = Path.Combine(_root, CurrentRecoveryScopeStore.FileName);
        var retained = Path.Combine(_root, "retained-original.json");
        File.Move(path, retained);
        File.CreateSymbolicLink(path, retained);
        var before = await File.ReadAllBytesAsync(retained);
        await Assert.ThrowsAsync<InvalidDataException>(() => CurrentRecoveryScopeStore.ReadAsync(_root));
        Assert.Equal(before, await File.ReadAllBytesAsync(retained));
        Assert.NotNull(new FileInfo(path).LinkTarget);
    }
}
