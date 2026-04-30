using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using RecipeApi.Data;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>
/// Integration tests for Phase 12 — Settings persistence (Phase B).
/// Covers GET/POST round-trips, upsert behaviour, and the SynthesizeRecipeAsync stub.
/// </summary>
public class SettingsIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    private SettingsService _service = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var logger = _scope.ServiceProvider.GetRequiredService<ILogger<SettingsService>>();
        _service = new SettingsService(_db, logger);
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    // ── GET unknown key returns null ──────────────────────────────────────────

    [Fact]
    public async Task GetSettingAsync_UnknownKey_ReturnsNull()
    {
        var result = await _service.GetSettingAsync("does_not_exist");
        Assert.Null(result);
    }

    // ── POST then GET round-trips the value ───────────────────────────────────

    [Fact]
    public async Task UpsertThenGet_RoundTripsValue()
    {
        var value = JsonDocument.Parse("""{"description":"Our Family Spaghetti","recipeId":"660e8400-e29b-41d4-a716-446655440010"}""").RootElement;

        await _service.UpsertSettingAsync("family_goto", value);

        var retrieved = await _service.GetSettingAsync("family_goto");

        Assert.NotNull(retrieved);
        Assert.Equal("family_goto", retrieved.Key);
        Assert.Equal("Our Family Spaghetti", retrieved.Value.GetProperty("description").GetString());
        Assert.Equal("660e8400-e29b-41d4-a716-446655440010", retrieved.Value.GetProperty("recipeId").GetString());
    }

    // ── Second POST with same key updates (upsert), does not duplicate ────────

    [Fact]
    public async Task UpsertSettingAsync_SameKey_UpdatesNotDuplicates()
    {
        var first = JsonDocument.Parse("""{"description":"Spaghetti"}""").RootElement;
        var second = JsonDocument.Parse("""{"description":"Tacos"}""").RootElement;

        await _service.UpsertSettingAsync("family_goto", first);
        await _service.UpsertSettingAsync("family_goto", second);

        var count = _db.FamilySettings.Count(s => s.Key == "family_goto");
        Assert.Equal(1, count);

        var retrieved = await _service.GetSettingAsync("family_goto");
        Assert.Equal("Tacos", retrieved!.Value.GetProperty("description").GetString());
    }

    // ── SynthesizeRecipeAsync stub returns a non-null placeholder ─────────────

    [Fact]
    public async Task SynthesizeRecipeAsync_Stub_ReturnsNonNullPlaceholder()
    {
        var result = await _service.SynthesizeRecipeAsync("Our Family Spaghetti");

        Assert.NotNull(result);
        Assert.Contains("Our Family Spaghetti", result.Name);
        Assert.Equal(0, result.Rating);
        Assert.Empty(result.Ingredients!);
    }
}
