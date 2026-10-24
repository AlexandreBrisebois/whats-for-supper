using System.Net;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;

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

    [PostgresFact]
    public async Task OrdinaryBackupMergeRepeatExplicitEmptyAndLegacyAbsencePreserveExactOccurrenceFacts()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var management = scope.ServiceProvider.GetRequiredService<ManagementService>();
        var dataRoot = scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root;
        var artifact = Path.Combine(dataRoot, "grocery-extras.json");
        var lineage = Guid.NewGuid();
        var first = GroceryExtraOccurrence.Create(Guid.NewGuid(), lineage, new(2026, 10, 12),
            "Milk", "milk", "Dairy & Eggs", DateTimeOffset.Parse("2026-10-12T12:00:00Z"));
        var second = GroceryExtraOccurrence.Create(Guid.NewGuid(), lineage, new(2026, 10, 19),
            "Oat milk", "oat milk", "Pantry", DateTimeOffset.Parse("2026-10-19T12:00:00Z"), first.Id);
        second.Checked = true;
        second.Version = 4;
        db.GroceryExtraOccurrences.AddRange(first, second);
        await db.SaveChangesAsync();
        await management.BackupAsync();
        db.GroceryExtraOccurrences.RemoveRange(first, second);
        await db.SaveChangesAsync();

        await management.RestoreAsync();
        await management.RestoreAsync();

        var restored = await db.GroceryExtraOccurrences.AsNoTracking().OrderBy(row => row.WeekStartDate).ToListAsync();
        Assert.Equal(2, restored.Count);
        Assert.Equal(first.Id, restored[0].Id);
        Assert.Equal(first.Id, restored[1].PredecessorId);
        Assert.Equal("Oat milk", restored[1].Name);
        Assert.Equal("Oat milk", restored[1].CreationName);
        Assert.Equal("Pantry", restored[1].GrocerySection);
        Assert.True(restored[1].Checked);
        Assert.Equal(4, restored[1].Version);

        await File.WriteAllTextAsync(artifact, "{\"version\":1,\"occurrences\":[]}");
        await management.RestoreAsync();
        Assert.Equal(2, await db.GroceryExtraOccurrences.CountAsync());
        File.Delete(artifact);
        await management.RestoreAsync();
        Assert.Equal(2, await db.GroceryExtraOccurrences.CountAsync());
    }

    [PostgresFact]
    public async Task OrdinaryInvalidArtifactIsReportedWithoutPartialMergeOrDestinationMutation()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var management = scope.ServiceProvider.GetRequiredService<ManagementService>();
        var artifact = Path.Combine(scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root,
            "grocery-extras.json");
        Directory.CreateDirectory(Path.GetDirectoryName(artifact)!);
        var destination = GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 19),
            "Destination", "destination", "Grocery", DateTimeOffset.UtcNow);
        db.GroceryExtraOccurrences.Add(destination);
        await db.SaveChangesAsync();
        var lineage = Guid.NewGuid();
        await File.WriteAllTextAsync(artifact, JsonSerializer.Serialize(new
        {
            version = 1,
            occurrences = new object[]
            {
                new { id = Guid.NewGuid(), lineageId = lineage, predecessorId = (Guid?)null, weekStartDate = "2026-10-12", name = "Root", normalizedKey = "root", grocerySection = "Grocery", @checked = true, removedAt = (string?)null, version = 1, createdAt = DateTimeOffset.UtcNow, updatedAt = DateTimeOffset.UtcNow },
                new { id = Guid.NewGuid(), lineageId = lineage, predecessorId = (Guid?)null, weekStartDate = "2026-10-19", name = "Phantom", normalizedKey = "phantom", grocerySection = "Garage", @checked = false, removedAt = (string?)null, version = 1, createdAt = DateTimeOffset.UtcNow, updatedAt = DateTimeOffset.UtcNow }
            }
        }, JsonDefaults.CamelCase));

        var result = await management.RestoreAsync();

        Assert.Equal(1, result.Errors);
        var rows = await db.GroceryExtraOccurrences.AsNoTracking().ToListAsync();
        Assert.Single(rows);
        Assert.Equal(destination.Id, rows[0].Id);
    }

    [PostgresFact]
    public async Task OrdinaryMergeRejectsAValidArtifactThatWouldInvalidateDestinationLineage()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var management = scope.ServiceProvider.GetRequiredService<ManagementService>();
        var root = GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 12),
            "Coffee", "coffee", "Grocery", DateTimeOffset.UtcNow);
        root.Checked = true;
        db.GroceryExtraOccurrences.Add(root);
        await db.SaveChangesAsync();
        await management.BackupAsync();
        root.Checked = false;
        var successor = GroceryExtraOccurrence.Create(Guid.NewGuid(), root.LineageId, new(2026, 10, 19),
            "Coffee beans", "coffee beans", "Pantry", DateTimeOffset.UtcNow, root.Id);
        db.GroceryExtraOccurrences.Add(successor);
        await db.SaveChangesAsync();

        var result = await management.RestoreAsync();

        Assert.Equal(1, result.Errors);
        db.ChangeTracker.Clear();
        Assert.False((await db.GroceryExtraOccurrences.SingleAsync(row => row.Id == root.Id)).Checked);
        Assert.Equal("Coffee beans", (await db.GroceryExtraOccurrences.SingleAsync(row => row.Id == successor.Id)).Name);
    }

    [LinuxPostgresTheory]
    [InlineData("cross-lineage")]
    [InlineData("nonconsecutive")]
    [InlineData("multiple-roots")]
    [InlineData("terminal-successor")]
    public async Task ExactPreflightRejectsInvalidLineageWithoutReplacingLiveRows(string invalidCase)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var lineage = Guid.NewGuid();
        var root = GroceryExtraOccurrence.Create(Guid.NewGuid(), lineage, new(2026, 10, 12),
            "Root", "root", "Grocery", DateTimeOffset.UtcNow.AddDays(-7));
        var child = GroceryExtraOccurrence.Create(Guid.NewGuid(), lineage, new(2026, 10, 19),
            "Child", "child", "Grocery", DateTimeOffset.UtcNow, root.Id);
        db.GroceryExtraOccurrences.AddRange(root, child);
        await db.SaveChangesAsync();
        var recovery = scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>();
        var capture = await recovery.CaptureAsync(CancellationToken.None);
        var snapshotId = Assert.IsType<Guid>(capture.SnapshotId);
        var snapshotRoot = Path.Combine(backup, snapshotId.ToString("N"));
        var tablePath = Path.Combine(snapshotRoot, "tables", "grocery_extra_occurrences.json");
        var rows = JsonNode.Parse(await File.ReadAllTextAsync(tablePath))!.AsArray();
        var rootJson = rows.Single(row => row!["id"]!.GetValue<Guid>() == root.Id)!.AsObject();
        var childJson = rows.Single(row => row!["id"]!.GetValue<Guid>() == child.Id)!.AsObject();
        switch (invalidCase)
        {
            case "cross-lineage": childJson["lineage_id"] = Guid.NewGuid(); break;
            case "nonconsecutive": childJson["week_start_date"] = "2026-10-26"; break;
            case "multiple-roots": childJson["predecessor_id"] = null; break;
            case "terminal-successor": rootJson["checked"] = true; break;
        }
        await RewriteInventoriedArtifactAsync(snapshotRoot, "tables/grocery_extra_occurrences.json", rows);
        db.ChangeTracker.Clear();
        var live = await db.GroceryExtraOccurrences.SingleAsync(row => row.Id == root.Id);
        live.Name = "Still live";
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidDataException>(() => recovery.RestoreExactAsync(snapshotId, CancellationToken.None));

        db.ChangeTracker.Clear();
        Assert.Equal("Still live", (await db.GroceryExtraOccurrences.SingleAsync(row => row.Id == root.Id)).Name);
    }

    private static async Task RewriteInventoriedArtifactAsync(string snapshotRoot, string relativePath,
        JsonNode content)
    {
        var artifactPath = Path.Combine(snapshotRoot, relativePath);
        await File.WriteAllTextAsync(artifactPath, content.ToJsonString());
        var bytes = await File.ReadAllBytesAsync(artifactPath);
        var manifestPath = Path.Combine(snapshotRoot, "manifest.json");
        var manifest = JsonNode.Parse(await File.ReadAllTextAsync(manifestPath))!.AsObject();
        var file = manifest["files"]!.AsArray().Single(item => item!["path"]!.GetValue<string>() == relativePath)!.AsObject();
        file["length"] = bytes.LongLength;
        file["sha256"] = Convert.ToHexString(SHA256.HashData(bytes));
        await File.WriteAllTextAsync(manifestPath, manifest.ToJsonString());
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

    private sealed class LinuxPostgresTheoryAttribute : TheoryAttribute
    {
        public LinuxPostgresTheoryAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")))
                Skip = "Set WFS_TEST_POSTGRES_CONNECTION to run isolated PostgreSQL recovery verification.";
            else if (!OperatingSystem.IsLinux())
                Skip = "Exact recovery publication requires the supported Linux fsync host.";
        }
    }
}
