using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Infrastructure;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>
/// Integration tests for <c>GET /api/stream</c> (StreamController).
///
/// Covers:
///   1. Connect with valid x-family-member-id cookie → receive connected event with schedule snapshot
///   2. Connect without cookie → 400
///   3. Disconnect → connection removed from SseConnectionManager
/// </summary>
public class StreamControllerIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
    }

    public async Task DisposeAsync()
    {
        await _factory.DisposeAsync();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 1 — Valid cookie → connected event with schedule snapshot
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Stream_WithValidCookie_ReceivesConnectedEventWithSchedule()
    {
        // Arrange
        var client = _factory.CreateClient();
        var memberId = _factory.DefaultFamilyMemberId;

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/stream");
        // Simulate the x-family-member-id cookie that EventSource sends automatically
        // because it was set during onboarding (withCredentials: true).
        request.Headers.Add("Cookie", $"x-family-member-id={memberId}");

        // Use a CancellationToken so the long-lived SSE connection is cancelled
        // after we've read the first event — we don't want the test to hang.
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        // Act
        var response = await client.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cts.Token);

        // Assert — HTTP 200 with SSE content type
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/event-stream", response.Content.Headers.ContentType?.MediaType);

        // Read the first SSE event from the stream
        await using var stream = await response.Content.ReadAsStreamAsync(cts.Token);
        using var reader = new StreamReader(stream);

        var eventLine = await reader.ReadLineAsync(cts.Token);   // "event: connected"
        var dataLine = await reader.ReadLineAsync(cts.Token);    // "data: {...}"

        Assert.NotNull(eventLine);
        Assert.Equal("event: connected", eventLine);

        Assert.NotNull(dataLine);
        Assert.StartsWith("data: ", dataLine);

        // Parse the JSON payload and verify the schedule snapshot is present
        var json = dataLine!["data: ".Length..];
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("type", out var typeProp));
        Assert.Equal("connected", typeProp.GetString());

        Assert.True(root.TryGetProperty("schedule", out var scheduleProp));
        Assert.True(scheduleProp.TryGetProperty("weekOffset", out _),
            "schedule snapshot must include weekOffset");
        Assert.True(scheduleProp.TryGetProperty("days", out _),
            "schedule snapshot must include days array");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 2 — Missing cookie → 400
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Stream_WithoutCookie_Returns400()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act — no Cookie header at all
        var response = await client.GetAsync("/api/stream");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("x-family-member-id", body);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 3 — Disconnect → connection removed from SseConnectionManager
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Stream_OnDisconnect_RemovesConnectionFromManager()
    {
        // Arrange
        var client = _factory.CreateClient();
        var memberId = _factory.DefaultFamilyMemberId;

        var manager = _factory.Services.GetRequiredService<SseConnectionManager>();
        var countBefore = manager.ConnectionCount;

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/stream");
        request.Headers.Add("Cookie", $"x-family-member-id={memberId}");

        using var cts = new CancellationTokenSource();

        // Act — open the connection
        var responseTask = client.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cts.Token);

        var response = await responseTask;
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Read past the connected event so the server has registered the connection
        await using var stream = await response.Content.ReadAsStreamAsync();
        using var reader = new StreamReader(stream);

        // Read the connected event lines (event:, data:, blank line)
        await reader.ReadLineAsync(); // event: connected
        await reader.ReadLineAsync(); // data: {...}
        await reader.ReadLineAsync(); // blank line

        // Verify the connection was registered
        Assert.Equal(countBefore + 1, manager.ConnectionCount);

        // Simulate client disconnect by cancelling and disposing
        cts.Cancel();
        response.Dispose();
        client.Dispose();

        // Give the server a moment to process the disconnect and clean up
        await Task.Delay(200);

        // Assert — connection count returns to baseline
        Assert.Equal(countBefore, manager.ConnectionCount);
    }
}
