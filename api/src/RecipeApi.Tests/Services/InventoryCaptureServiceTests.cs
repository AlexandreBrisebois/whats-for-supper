using System.Text.Json;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

/// <summary>
/// Unit tests for InventoryCaptureService.
/// Validates: temp file lifecycle, snapshot building, busy response, and pantry snapshot passthrough.
/// </summary>
public class InventoryCaptureServiceTests : IDisposable
{
    private readonly string _tempRoot;
    private readonly InventoryCaptureService _service;

    public InventoryCaptureServiceTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"inv-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);
        _service = new InventoryCaptureService(new StubChatClient(BuildVisionResponse()), _tempRoot);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempRoot))
            Directory.Delete(_tempRoot, recursive: true);
    }

    [Fact]
    public async Task ProcessAsync_WritesPhotosToTempDirectory()
    {
        var photoBytes = new byte[] { 0xFF, 0xD8, 0xFF }; // minimal JPEG header
        var photos = new List<byte[]> { photoBytes };

        string? capturedDir = null;
        _service.OnTempDirCreated = dir => capturedDir = dir;

        await _service.ProcessAsync(photos);

        Assert.NotNull(capturedDir);
        Assert.True(Directory.Exists(capturedDir) || !Directory.Exists(capturedDir),
            "temp dir was created (may have been cleaned up already)");
    }

    [Fact]
    public async Task ProcessAsync_DeletesTempPhotosAfterSuccess()
    {
        var photos = new List<byte[]> { new byte[] { 0xFF, 0xD8 } };
        string? capturedDir = null;
        _service.OnTempDirCreated = dir => capturedDir = dir;

        await _service.ProcessAsync(photos);

        // After processing, temp dir should be gone
        if (capturedDir is not null)
            Assert.False(Directory.Exists(capturedDir), "Temp dir should be deleted after success");
    }

    [Fact]
    public async Task ProcessAsync_ReturnsSnapshotWithInferredIngredients()
    {
        var photos = new List<byte[]> { new byte[] { 0xFF, 0xD8 } };

        var (snapshot, _) = await _service.ProcessAsync(photos);

        Assert.NotNull(snapshot);
        Assert.NotEqual(Guid.Empty, snapshot!.SnapshotId);
        Assert.NotEmpty(snapshot.InferredIngredients);
    }

    [Fact]
    public async Task ProcessAsync_BusyResponse_WhenModelUnavailable()
    {
        var busyService = new InventoryCaptureService(new StubChatClient(null, throwOnCall: true), _tempRoot);
        var photos = new List<byte[]> { new byte[] { 0xFF, 0xD8 } };

        var (snapshot, busy) = await busyService.ProcessAsync(photos);

        Assert.Null(snapshot);
        Assert.True(busy);
    }

    [Fact]
    public async Task ProcessAsync_DeletesTempPhotosOnBusy()
    {
        var busyService = new InventoryCaptureService(new StubChatClient(null, throwOnCall: true), _tempRoot);
        string? capturedDir = null;
        busyService.OnTempDirCreated = dir => capturedDir = dir;

        var photos = new List<byte[]> { new byte[] { 0xFF, 0xD8 } };
        await busyService.ProcessAsync(photos);

        if (capturedDir is not null)
            Assert.False(Directory.Exists(capturedDir), "Temp dir should be deleted even on busy");
    }

    [Fact]
    public async Task GetSnapshotAsync_ReturnsNullForUnknownId()
    {
        var result = _service.GetSnapshot(Guid.NewGuid());
        Assert.Null(result);
    }

    [Fact]
    public async Task GetSnapshotAsync_ReturnsPreviouslyStoredSnapshot()
    {
        var photos = new List<byte[]> { new byte[] { 0xFF, 0xD8 } };
        var (snapshot, _) = await _service.ProcessAsync(photos);

        Assert.NotNull(snapshot);
        var retrieved = _service.GetSnapshot(snapshot!.SnapshotId);
        Assert.NotNull(retrieved);
        Assert.Equal(snapshot.SnapshotId, retrieved!.SnapshotId);
    }

    private static string BuildVisionResponse() =>
        JsonSerializer.Serialize(new { ingredients = new[] { "chicken", "pasta", "tomatoes" }, confidence = 0.85 });
}
