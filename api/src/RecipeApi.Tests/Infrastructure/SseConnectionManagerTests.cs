using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using RecipeApi.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Infrastructure;

public class SseConnectionManagerTests
{
    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    /// <summary>
    /// Creates a real DefaultHttpContext whose Body is a MemoryStream so we can
    /// inspect what was written without any network I/O.
    /// </summary>
    private static (HttpResponse Response, MemoryStream Body) MakeResponse()
    {
        var ctx = new DefaultHttpContext();
        var body = new MemoryStream();
        ctx.Response.Body = body;
        return (ctx.Response, body);
    }

    private static string ReadBody(MemoryStream body)
    {
        body.Position = 0;
        return Encoding.UTF8.GetString(body.ToArray());
    }

    // ---------------------------------------------------------------------------
    // Test 1 — Broadcast to 2 connections: both receive the event data
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task BroadcastAsync_WritesToAllConnections()
    {
        // Arrange
        var manager = new SseConnectionManager();

        var (resp1, body1) = MakeResponse();
        var (resp2, body2) = MakeResponse();

        manager.AddConnection(resp1);
        manager.AddConnection(resp2);

        var payload = new { date = "2025-01-01", recipe = "Lasagna" };

        // Act
        await manager.BroadcastAsync("slot_updated", payload);

        // Assert — both streams received the event
        var expected = $"event: slot_updated\ndata: {JsonSerializer.Serialize(payload)}\n\n";

        Assert.Equal(expected, ReadBody(body1));
        Assert.Equal(expected, ReadBody(body2));
        Assert.Equal(2, manager.ConnectionCount);
    }

    // ---------------------------------------------------------------------------
    // Test 2 — Dead connection removed immediately on broadcast
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task BroadcastAsync_RemovesDeadConnectionImmediately()
    {
        // Arrange
        var manager = new SseConnectionManager();

        // Healthy connection
        var (healthyResp, healthyBody) = MakeResponse();
        manager.AddConnection(healthyResp);

        // Dead connection: use a stream that throws on Write to simulate a
        // disposed / disconnected response body (BS-6).
        var deadCtx = new DefaultHttpContext();
        deadCtx.Response.Body = new ThrowingStream();
        manager.AddConnection(deadCtx.Response);

        Assert.Equal(2, manager.ConnectionCount);

        var payload = new { message = "hello" };

        // Act — broadcast should not throw; dead connection must be removed
        await manager.BroadcastAsync("test_event", payload);

        // Assert — dead connection removed immediately (before BroadcastAsync returns)
        Assert.Equal(1, manager.ConnectionCount);

        // Healthy connection still received the event
        var expected = $"event: test_event\ndata: {JsonSerializer.Serialize(payload)}\n\n";
        Assert.Equal(expected, ReadBody(healthyBody));
    }

    // ---------------------------------------------------------------------------
    // Helper: a stream that throws on every write (simulates disposed response)
    // ---------------------------------------------------------------------------

    private sealed class ThrowingStream : Stream
    {
        public override bool CanRead => false;
        public override bool CanSeek => false;
        public override bool CanWrite => true;
        public override long Length => throw new NotSupportedException();
        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override void Flush() { }
        public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count)
            => throw new ObjectDisposedException(nameof(ThrowingStream));

        public override ValueTask WriteAsync(ReadOnlyMemory<byte> buffer, CancellationToken cancellationToken = default)
            => throw new ObjectDisposedException(nameof(ThrowingStream));

        public override Task WriteAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
            => throw new ObjectDisposedException(nameof(ThrowingStream));
    }
}
