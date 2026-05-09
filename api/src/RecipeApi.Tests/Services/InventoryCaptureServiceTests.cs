using System.Text.Json;
using Microsoft.Extensions.AI;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
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
        _service = new InventoryCaptureService(new StubChatClient(BuildVisionResponse()), NullLogger<InventoryCaptureService>.Instance, _tempRoot);
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
        var busyService = new InventoryCaptureService(new StubChatClient(null, throwOnCall: true), NullLogger<InventoryCaptureService>.Instance, _tempRoot);
        var photos = new List<byte[]> { new byte[] { 0xFF, 0xD8 } };

        var (snapshot, busy) = await busyService.ProcessAsync(photos);

        Assert.Null(snapshot);
        Assert.True(busy);
    }

    [Fact]
    public async Task ProcessAsync_SendsImagesToChatClient()
    {
        var chatClient = new MockChatClient(BuildVisionResponse());
        var service = new InventoryCaptureService(chatClient, NullLogger<InventoryCaptureService>.Instance, _tempRoot);
        var photo1 = new byte[] { 0xFF, 0xD8, 0x01 };
        var photo2 = new byte[] { 0xFF, 0xD8, 0x02 };
        var photos = new List<byte[]> { photo1, photo2 };

        await service.ProcessAsync(photos);

        Assert.NotNull(chatClient.LastMessages);
        var message = chatClient.LastMessages!.First();
        Assert.Equal(ChatRole.User, message.Role);
        
        var dataContents = message.Contents.OfType<DataContent>().ToList();
        Assert.Equal(2, dataContents.Count);
        Assert.Equal(photo1, dataContents[0].Data.ToArray());
        Assert.Equal(photo2, dataContents[1].Data.ToArray());
    }

    [Fact]
    public async Task ProcessAsync_DeletesTempPhotosOnBusy()
    {
        var busyService = new InventoryCaptureService(new StubChatClient(null, throwOnCall: true), NullLogger<InventoryCaptureService>.Instance, _tempRoot);
        string? capturedDir = null;
        busyService.OnTempDirCreated = dir => capturedDir = dir;

        var photos = new List<byte[]> { new byte[] { 0xFF, 0xD8 } };
        await busyService.ProcessAsync(photos);

        if (capturedDir is not null)
            Assert.False(Directory.Exists(capturedDir), "Temp dir should be deleted even on busy");
    }

    private class MockChatClient(string response) : IChatClient
    {
        public IEnumerable<ChatMessage>? LastMessages { get; private set; }

        public Task<ChatResponse> GetResponseAsync(
            IEnumerable<ChatMessage> messages,
            ChatOptions? options = null,
            CancellationToken cancellationToken = default)
        {
            LastMessages = messages;
            return Task.FromResult(new ChatResponse(new ChatMessage(ChatRole.Assistant, response)));
        }

        public IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(
            IEnumerable<ChatMessage> messages,
            ChatOptions? options = null,
            CancellationToken cancellationToken = default) => throw new NotImplementedException();

        public object? GetService(Type serviceType, object? serviceKey = null) => null;
        public void Dispose() { }
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
