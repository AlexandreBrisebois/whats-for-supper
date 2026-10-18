using System.Net;
using System.Net.Http.Json;
using RecipeApi.Services;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using PostgresTheory = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresTheoryAttribute;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;

namespace RecipeApi.Tests.Integration;

public class OnlineRecoveryPostgresTests : IAsyncLifetime
{
    private readonly string database = "wfs_recovery_test_" + Guid.NewGuid().ToString("N");
    private readonly string backup = Path.Combine(Path.GetTempPath(), "wfs-recovery-backup-" + Guid.NewGuid().ToString("N"));
    private NpgsqlConnection admin = null!;
    private string connection = null!;
    private TestWebApplicationFactory app = null!;

    public async Task InitializeAsync()
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        admin = new(settings.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        settings.Database = database;
        connection = settings.ConnectionString;
        await using var sql = new NpgsqlConnection(connection);
        await sql.OpenAsync();
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !File.Exists(Path.Combine(root.FullName, "database", "schema.sql"))) root = root.Parent;
        await new NpgsqlCommand(await File.ReadAllTextAsync(Path.Combine(root!.FullName, "database", "schema.sql")), sql).ExecuteNonQueryAsync();
        app = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
        {
            ["Tests:PostgresConnectionString"] = connection,
            ["Tests:LocalRecipeStore"] = "true",
            ["Recovery:BackupRoot"] = backup,
            ["Recovery:WaitSeconds"] = "1"
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
    }

    [PostgresFact]
    public async Task OnlineCapture_PublishesIndependentFactsAndActualMedia()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Saved soup", ImageCount = 1, AddedBy = app.DefaultFamilyMemberId };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var store = scope.ServiceProvider.GetRequiredService<IRecipeStore>();
        await store.SaveOriginalImageAsync(recipe.Id, 0, "image/png", new MemoryStream([1, 2, 3]));
        await store.SaveHeroImageAsync(recipe.Id, new MemoryStream([4, 5, 6]));
        using var client = app.CreateAuthenticatedClient();
        var response = await client.PostAsync("/api/management/recovery/snapshots", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var result = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var id = result.RootElement.GetProperty("snapshotId").GetGuid();
        var folder = Path.Combine(backup, id.ToString("N"));
        Assert.True(File.Exists(Path.Combine(folder, "manifest.json")));
        Assert.Equal(new byte[] { 1, 2, 3 }, await File.ReadAllBytesAsync(Path.Combine(folder, "recipes", recipe.Id.ToString(), "original", "0.png")));
        Assert.Equal(new byte[] { 4, 5, 6 }, await File.ReadAllBytesAsync(Path.Combine(folder, "recipes", recipe.Id.ToString(), "hero.webp")));
        Assert.Contains("Saved soup", await File.ReadAllTextAsync(Path.Combine(folder, "tables", "recipes.json")));
    }
    [PostgresFact]
    public async Task ExactRestore_ValidatesBeforeReplacingNonemptyDestination_AndRetriesWithoutDuplicates()
    {
        using var client = app.CreateAuthenticatedClient();
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Snapshot soup", IsReady = true, ImageCount = 1 };
        db.Recipes.Add(recipe);
        db.WeeklyHouseholdInterests.Add(new WeeklyHouseholdInterest { RecipeId = recipe.Id, WeekStartDate = new(2026, 5, 4), PositiveCount = 2, CapturedAt = DateTimeOffset.UtcNow, CloseId = Guid.NewGuid() });
        await db.SaveChangesAsync();
        var store = scope.ServiceProvider.GetRequiredService<IRecipeStore>();
        await store.SaveOriginalImageAsync(recipe.Id, 0, "image/png", new MemoryStream([1, 2, 3]));
        var capture = await client.PostAsync("/api/management/recovery/snapshots", null);
        Assert.Equal(HttpStatusCode.OK, capture.StatusCode);
        using var result = JsonDocument.Parse(await capture.Content.ReadAsStringAsync());
        var id = result.RootElement.GetProperty("snapshotId").GetGuid();
        recipe.Name = "Changed later";
        db.Recipes.Add(new Recipe { Name = "Not in snapshot" });
        await db.SaveChangesAsync();
        var media = Path.Combine(backup, id.ToString("N"), "recipes", recipe.Id.ToString(), "original", "0.png");
        await File.WriteAllBytesAsync(media, [9]);
        var invalid = await client.PostAsync($"/api/management/recovery/restore/{id}", null);
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        db.ChangeTracker.Clear();
        Assert.Equal(2, await db.Recipes.CountAsync());
        Assert.Equal("Changed later", (await db.Recipes.SingleAsync(r => r.Id == recipe.Id)).Name);
        await File.WriteAllBytesAsync(media, [1, 2, 3]);
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var restored = await client.PostAsync($"/api/management/recovery/restore/{id}", null);
            Assert.Equal(HttpStatusCode.OK, restored.StatusCode);
            db.ChangeTracker.Clear();
            Assert.Equal("Snapshot soup", (await db.Recipes.SingleAsync()).Name);
            Assert.Equal(2, (await db.WeeklyHouseholdInterests.SingleAsync()).PositiveCount);
            var actual = await store.ReadOriginalImageAsync(recipe.Id, 0);
            await using var stream = actual!.Value.Stream;
            using var bytes = new MemoryStream();
            await stream.CopyToAsync(bytes);
            Assert.Equal(new byte[] { 1, 2, 3 }, bytes.ToArray());
        }
    }

    [PostgresFact]
    public async Task SnapshotBoundary_KeepsReadsOnline_AndRejectsTimedOutWritesWithoutMutation()
    {
        using var scope = app.Services.CreateScope();
        var gate = scope.ServiceProvider.GetRequiredService<RecoveryBoundary>();
        await using var snapshot = await gate.EnterAsync(RecoveryAccess.Snapshot, CancellationToken.None);
        using var client = app.CreateAuthenticatedClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/family")).StatusCode);
        var response = await client.PostAsJsonAsync("/api/family", new { name = "Blocked member" });
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.False(await db.FamilyMembers.AnyAsync(m => m.Name == "Blocked member"));
    }

    [PostgresTheory]
    [InlineData("staged", false)]
    [InlineData("journal", false)]
    [InlineData("pointer", false)]
    [InlineData("committed", true)]
    public async Task InterruptedPublication_ReconcilesBeforeResuming_AndRetryIsIdempotent(string point, bool committed)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var baseline = services.GetRequiredService<RecoverySnapshotService>();
        var captured = await baseline.CaptureAsync(CancellationToken.None);
        var member = await db.FamilyMembers.SingleAsync();
        var originalName = member.Name;
        member.Name = "Before restore";
        await db.SaveChangesAsync();
        var interrupted = new RecoverySnapshotService(db, services.GetRequiredService<RecipesRootResolver>(),
            services.GetRequiredService<DataRootResolver>(), services.GetRequiredService<IConfiguration>(),
            services.GetRequiredService<RecipeApi.Services.IClock>(), services.GetRequiredService<RecoveryBoundary>(), new InterruptAt(point));
        await Assert.ThrowsAsync<IOException>(() => interrupted.RestoreExactAsync(captured.SnapshotId!.Value, CancellationToken.None));
        db.ChangeTracker.Clear();
        Assert.Equal(committed ? originalName : "Before restore", (await db.FamilyMembers.SingleAsync()).Name);
        await baseline.ResumeAsync(CancellationToken.None);
        await baseline.RestoreExactAsync(captured.SnapshotId!.Value, CancellationToken.None);
        db.ChangeTracker.Clear();
        Assert.Equal(originalName, (await db.FamilyMembers.SingleAsync()).Name);
    }

    private sealed class InterruptAt(string point) : IRecoveryCheckpoint
    {
        public Task ReachedAsync(string name, CancellationToken ct) => name == point
            ? Task.FromException(new IOException("Injected interruption at " + name)) : Task.CompletedTask;
    }

}
