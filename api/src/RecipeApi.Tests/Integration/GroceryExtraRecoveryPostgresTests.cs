using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed class GroceryExtraRecoveryPostgresTests : IAsyncLifetime
{
    private readonly string database = $"wfs_grocery_extra_recovery_{Guid.NewGuid():N}";
    private readonly string backup = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
        $".wfs-grocery-extra-recovery-{Guid.NewGuid():N}");
    private readonly string liveRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
        $".wfs-grocery-extra-live-{Guid.NewGuid():N}");
    private NpgsqlConnection admin = null!;
    private TestWebApplicationFactory app = null!;

    public async Task InitializeAsync()
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        admin = new(settings.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        settings.Database = database;
        await using var sql = new NpgsqlConnection(settings.ConnectionString);
        await sql.OpenAsync();
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !File.Exists(Path.Combine(root.FullName, "database", "schema.sql"))) root = root.Parent;
        await new NpgsqlCommand(await File.ReadAllTextAsync(Path.Combine(root!.FullName, "database", "schema.sql")), sql).ExecuteNonQueryAsync();
        app = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
        {
            ["Tests:PostgresConnectionString"] = settings.ConnectionString,
            ["Tests:LocalRecipeStore"] = "true",
            ["DataRoot"] = Path.Combine(liveRoot, "data"),
            ["RecipesRoot"] = Path.Combine(liveRoot, "recipes"),
            ["Recovery:BackupRoot"] = backup
        });
    }

    public async Task DisposeAsync()
    {
        if (app is not null) await app.DisposeAsync();
        if (admin is not null)
        {
            await new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", admin).ExecuteNonQueryAsync();
            await admin.DisposeAsync();
        }
        if (Directory.Exists(backup)) Directory.Delete(backup, true);
        if (Directory.Exists(liveRoot)) Directory.Delete(liveRoot, true);
    }

    [LinuxPostgresFact]
    public async Task ExactSnapshotRestoresMembershipIdentityLineageTombstoneAndVersion()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var lineage = Guid.NewGuid();
        var first = GroceryExtraOccurrence.Create(Guid.NewGuid(), lineage, new(2026, 10, 12), "Milk", "milk", "Dairy & Eggs", DateTimeOffset.UtcNow.AddDays(-7));
        var second = GroceryExtraOccurrence.Create(Guid.NewGuid(), lineage, new(2026, 10, 19), "Oat milk", "oat milk", "Pantry", DateTimeOffset.UtcNow, first.Id);
        second.RemovedAt = DateTimeOffset.UtcNow;
        second.Version = 4;
        db.GroceryExtraOccurrences.AddRange(first, second);
        await db.SaveChangesAsync();

        var capture = await scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>()
            .CaptureAsync(CancellationToken.None);
        var id = Assert.IsType<Guid>(capture.SnapshotId);
        var folder = Path.Combine(backup, id.ToString("N"));
        using (var manifest = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(folder, "manifest.json"))))
            Assert.Contains("grocery_extra_occurrences", manifest.RootElement.GetProperty("tables").EnumerateArray().Select(item => item.GetString()));

        db.GroceryExtraOccurrences.RemoveRange(first, second);
        db.GroceryExtraOccurrences.Add(GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 19), "Not saved", "not saved", "Grocery", DateTimeOffset.UtcNow));
        await db.SaveChangesAsync();
        using var client = app.CreateAuthenticatedClient();
        var restore = await client.PostAsync($"/api/management/recovery/restore/{id}", null);
        Assert.Equal(HttpStatusCode.OK, restore.StatusCode);
        db.ChangeTracker.Clear();
        var restored = await db.GroceryExtraOccurrences.OrderBy(row => row.WeekStartDate).ToListAsync();
        Assert.Equal(2, restored.Count);
        Assert.Equal(first.Id, restored[0].Id);
        Assert.Equal(first.Id, restored[1].PredecessorId);
        Assert.Equal(4, restored[1].Version);
        Assert.NotNull(restored[1].RemovedAt);
    }

    [LinuxPostgresFact]
    public async Task MissingGroceryExtraTableArtifactFailsPreflightWithoutReplacingLiveRows()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var saved = GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 19), "Saved", "saved", "Grocery", DateTimeOffset.UtcNow);
        db.GroceryExtraOccurrences.Add(saved);
        await db.SaveChangesAsync();
        using var client = app.CreateAuthenticatedClient();
        var capture = await client.PostAsync("/api/management/recovery/snapshots", null);
        var capturePayload = await capture.Content.ReadAsStringAsync();
        Assert.True(capture.StatusCode == HttpStatusCode.OK, capturePayload);
        using var payload = JsonDocument.Parse(capturePayload);
        var id = payload.RootElement.GetProperty("snapshotId").GetGuid();
        File.Delete(Path.Combine(backup, id.ToString("N"), "tables", "grocery_extra_occurrences.json"));
        saved.Name = "Still live";
        await db.SaveChangesAsync();

        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync($"/api/management/recovery/restore/{id}", null)).StatusCode);
        db.ChangeTracker.Clear();
        Assert.Equal("Still live", (await db.GroceryExtraOccurrences.SingleAsync()).Name);
    }

    private sealed class LinuxPostgresFactAttribute : FactAttribute
    {
        public LinuxPostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")))
                Skip = "Set WFS_TEST_POSTGRES_CONNECTION to run isolated PostgreSQL recovery verification.";
            else if (!OperatingSystem.IsLinux())
                Skip = "Exact recovery publication requires the supported Linux fsync host.";
        }
    }
}
