using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class CaptureFailureIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client  = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    // ── Task 18: Controller tests — GET /api/captures/failures + POST retry ──

    // Task18-1: POST .../retry sets status = 'retrying' atomically
    [Fact]
    public async Task RetryAsync_SetsStatus_Retrying()
    {
        var id = await SeedFailureAsync();

        var response = await _client.PostAsync($"/api/captures/failures/{id}/retry", null);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var body = await ReadDataAsync<RetryResponseBody>(response);
        Assert.True(body.Queued);

        var row = await GetRowByIdAsync(id);
        Assert.NotNull(row);
        Assert.Equal("retrying", row.Status);
    }

    // Task18-2: Second concurrent POST .../retry while status = 'retrying' returns HTTP 409
    [Fact]
    public async Task RetryAsync_WhenAlreadyRetrying_Returns409()
    {
        var id = await SeedFailureAsync(status: "retrying");

        var response = await _client.PostAsync($"/api/captures/failures/{id}/retry", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    // Task18-3: POST .../retry returns HTTP 202 with { queued: true } for status = 'failed'
    [Fact]
    public async Task RetryAsync_ForFailedStatus_Returns202_WithQueued()
    {
        var id = await SeedFailureAsync(status: "failed");

        var response = await _client.PostAsync($"/api/captures/failures/{id}/retry", null);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var body = await ReadDataAsync<RetryResponseBody>(response);
        Assert.True(body.Queued);
    }

    // Task18-4: payload_version = 2 (unsupported) returns HTTP 422
    [Fact]
    public async Task RetryAsync_UnsupportedPayloadVersion_Returns422()
    {
        var id = await SeedFailureAsync(payloadVersion: 2);

        var response = await _client.PostAsync($"/api/captures/failures/{id}/retry", null);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    // Task18-5: GET /api/captures/failures returns active failures (HTTP 200)
    [Fact]
    public async Task GetFailures_Returns200_WithActiveFailures()
    {
        var id = await SeedFailureAsync();

        var response = await _client.GetAsync("/api/captures/failures");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        Assert.Contains(id.ToString(), json);
    }

    // Task18-6: GET /api/captures/failures excludes resolved rows
    [Fact]
    public async Task GetFailures_DoesNotReturn_ResolvedRows()
    {
        var id = await SeedFailureAsync(status: "resolved");

        var response = await _client.GetAsync("/api/captures/failures");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(id.ToString(), json);
    }

    // ── helpers for controller tests ─────────────────────────────────────────

    private async Task<Guid> SeedFailureAsync(string status = "failed", int payloadVersion = 1)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var now = DateTimeOffset.UtcNow;
        var failure = new CaptureFailure
        {
            Id = Guid.NewGuid(),
            SourceType = "url",
            RetryPayload = BuildUrlRetryPayload("https://example.com"),
            PayloadVersion = payloadVersion,
            FriendlyReason = "Test failure",
            Status = status,
            CreatedAt = now,
            LastFailedAt = now,
        };
        db.CaptureFailures.Add(failure);
        await db.SaveChangesAsync();
        return failure.Id;
    }

    private async Task<CaptureFailure?> GetRowByIdAsync(Guid id)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        return await db.CaptureFailures.FindAsync(id);
    }

    private static async Task<T> ReadDataAsync<T>(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        var doc = JsonSerializer.Deserialize<JsonElement>(json);
        var data = doc.GetProperty("data");
        return JsonSerializer.Deserialize<T>(data.GetRawText(), new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
        })!;
    }

    private record RetryResponseBody(bool Queued);

    // Test 1: Failed URL capture creates a capture_failures row with sourceType = "url"
    [Fact]
    public async Task PersistFailureAsync_CreatesRow_WithSourceTypeUrl()
    {
        var service = GetService();
        var recipeId = Guid.NewGuid();

        await service.PersistFailureAsync(
            recipeId: recipeId,
            workflowId: "url-import",
            failureCode: "url_unreadable",
            technicalReason: "HTTP 403 from example.com",
            retryPayload: BuildUrlRetryPayload("https://example.com"));

        var row = await GetFailureRowAsync(recipeId);
        Assert.NotNull(row);
        Assert.Equal("url", row.SourceType);
    }

    // Test 2: Row has friendlyReason set to a human-readable string
    [Fact]
    public async Task PersistFailureAsync_Sets_FriendlyReason()
    {
        var service = GetService();
        var recipeId = Guid.NewGuid();

        await service.PersistFailureAsync(
            recipeId: recipeId,
            workflowId: "url-import",
            failureCode: "url_unreadable",
            technicalReason: "HTTP 403",
            retryPayload: BuildUrlRetryPayload("https://example.com"));

        var row = await GetFailureRowAsync(recipeId);
        Assert.NotNull(row);
        Assert.False(string.IsNullOrWhiteSpace(row.FriendlyReason));
    }

    // Test 3: Row has technicalReason set to the raw error detail
    [Fact]
    public async Task PersistFailureAsync_Sets_TechnicalReason()
    {
        var service = GetService();
        var recipeId = Guid.NewGuid();
        const string technical = "Connection timed out after 30s";

        await service.PersistFailureAsync(
            recipeId: recipeId,
            workflowId: "url-import",
            failureCode: "model_timeout",
            technicalReason: technical,
            retryPayload: BuildUrlRetryPayload("https://example.com"));

        var row = await GetFailureRowAsync(recipeId);
        Assert.NotNull(row);
        Assert.Equal(technical, row.TechnicalReason);
    }

    // Test 4: Row has status = "failed"
    [Fact]
    public async Task PersistFailureAsync_Sets_StatusFailed()
    {
        var service = GetService();
        var recipeId = Guid.NewGuid();

        await service.PersistFailureAsync(
            recipeId: recipeId,
            workflowId: "url-import",
            failureCode: "extraction_incomplete",
            technicalReason: "Missing title element",
            retryPayload: BuildUrlRetryPayload("https://example.com"));

        var row = await GetFailureRowAsync(recipeId);
        Assert.NotNull(row);
        Assert.Equal("failed", row.Status);
    }

    // Test 5: Row is accessible via GetActiveFailuresAsync (the query backing GET /api/captures/failures)
    [Fact]
    public async Task GetActiveFailuresAsync_Returns_PersistedRow()
    {
        var service = GetService();
        var recipeId = Guid.NewGuid();

        await service.PersistFailureAsync(
            recipeId: recipeId,
            workflowId: "url-import",
            failureCode: "url_unreadable",
            technicalReason: "403",
            retryPayload: BuildUrlRetryPayload("https://example.com"));

        var results = await service.GetActiveFailuresAsync();
        Assert.Contains(results, r => r.RecipeId == recipeId);
    }

    // Test 6: Resolved rows do NOT appear in GetActiveFailuresAsync
    [Fact]
    public async Task GetActiveFailuresAsync_DoesNotReturn_ResolvedRows()
    {
        var service = GetService();
        var recipeId = Guid.NewGuid();

        await service.PersistFailureAsync(
            recipeId: recipeId,
            workflowId: "url-import",
            failureCode: "url_unreadable",
            technicalReason: "403",
            retryPayload: BuildUrlRetryPayload("https://example.com"));

        // Manually set status to resolved
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var row = await db.CaptureFailures.FirstAsync(f => f.RecipeId == recipeId);
        row.Status = "resolved";
        await db.SaveChangesAsync();

        var results = await service.GetActiveFailuresAsync();
        Assert.DoesNotContain(results, r => r.RecipeId == recipeId);
    }

    // Test 7: failure_code "url_unreadable" maps to the correct friendly reason
    [Fact]
    public async Task PersistFailureAsync_UrlUnreadable_Maps_CorrectFriendlyReason()
    {
        var service = GetService();
        var recipeId = Guid.NewGuid();

        await service.PersistFailureAsync(
            recipeId: recipeId,
            workflowId: "url-import",
            failureCode: "url_unreadable",
            technicalReason: "403",
            retryPayload: BuildUrlRetryPayload("https://example.com"));

        var row = await GetFailureRowAsync(recipeId);
        Assert.NotNull(row);
        Assert.Equal(
            "We couldn't read the recipe page. The site may be blocking import right now.",
            row.FriendlyReason);
    }

    // Test 8: failure_code "extraction_incomplete" maps to the correct friendly reason
    [Fact]
    public async Task PersistFailureAsync_ExtractionIncomplete_Maps_CorrectFriendlyReason()
    {
        var service = GetService();
        var recipeId = Guid.NewGuid();

        await service.PersistFailureAsync(
            recipeId: recipeId,
            workflowId: "url-import",
            failureCode: "extraction_incomplete",
            technicalReason: "Missing required fields",
            retryPayload: BuildUrlRetryPayload("https://example.com"));

        var row = await GetFailureRowAsync(recipeId);
        Assert.NotNull(row);
        Assert.Equal(
            "We found the page, but not enough recipe details to save it cleanly.",
            row.FriendlyReason);
    }

    // Test 9: failure_code "model_timeout" maps to the correct friendly reason
    [Fact]
    public async Task PersistFailureAsync_ModelTimeout_Maps_CorrectFriendlyReason()
    {
        var service = GetService();
        var recipeId = Guid.NewGuid();

        await service.PersistFailureAsync(
            recipeId: recipeId,
            workflowId: "url-import",
            failureCode: "model_timeout",
            technicalReason: "Timeout after 30s",
            retryPayload: BuildUrlRetryPayload("https://example.com"));

        var row = await GetFailureRowAsync(recipeId);
        Assert.NotNull(row);
        Assert.Equal(
            "The recipe took too long to process. Try again in a moment.",
            row.FriendlyReason);
    }

    // Test 10: failure_code "image_parse_failure" maps to the correct friendly reason
    [Fact]
    public async Task PersistFailureAsync_ImageParseFailure_Maps_CorrectFriendlyReason()
    {
        var service = GetService();
        var recipeId = Guid.NewGuid();

        await service.PersistFailureAsync(
            recipeId: recipeId,
            workflowId: "url-import",
            failureCode: "image_parse_failure",
            technicalReason: "Could not decode image",
            retryPayload: BuildUrlRetryPayload("https://example.com"));

        var row = await GetFailureRowAsync(recipeId);
        Assert.NotNull(row);
        Assert.Equal(
            "The photos were too unclear to turn into a recipe.",
            row.FriendlyReason);
    }

    // Bonus: unknown failure code maps to the generic fallback friendly reason
    [Fact]
    public async Task PersistFailureAsync_UnknownCode_Maps_FallbackFriendlyReason()
    {
        var service = GetService();
        var recipeId = Guid.NewGuid();

        await service.PersistFailureAsync(
            recipeId: recipeId,
            workflowId: "url-import",
            failureCode: "some_unknown_code",
            technicalReason: "Mystery error",
            retryPayload: BuildUrlRetryPayload("https://example.com"));

        var row = await GetFailureRowAsync(recipeId);
        Assert.NotNull(row);
        Assert.Equal(
            "Something went wrong importing the recipe. Try again or come back later.",
            row.FriendlyReason);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private CaptureFailureService GetService()
    {
        var scope = _factory.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<CaptureFailureService>();
    }

    private async Task<CaptureFailure?> GetFailureRowAsync(Guid recipeId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        return await db.CaptureFailures.FirstOrDefaultAsync(f => f.RecipeId == recipeId);
    }

    private static string BuildUrlRetryPayload(string url) =>
        JsonSerializer.Serialize(new
        {
            version = 1,
            sourceType = "url",
            url,
            description = (string?)null,
            photoIds = (string[]?)null,
        });
}
