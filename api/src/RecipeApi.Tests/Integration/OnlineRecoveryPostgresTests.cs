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
            Assert.True(await db.WorkflowTasks.AnyAsync(t => t.ProcessorName == "ReconcileRecipeSearch" && t.Status == RecipeApi.Models.TaskStatus.Pending));
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


    [PostgresFact]
    public async Task IndependentCopy_RestoresFreshDatabaseAndRoot_WithOriginalRootUnavailable()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "PDF soup", ImageCount = 1, Notes = "Keep notes", RawMetadata = "{\"name\":\"Soup\"}", Ingredients = "[\"water\"]", DeletedAt = DateTimeOffset.UtcNow };
        db.Recipes.Add(recipe);
        db.WeeklyHouseholdInterests.Add(new WeeklyHouseholdInterest { RecipeId = recipe.Id, WeekStartDate = new(2026, 5, 4), PositiveCount = 3, CapturedAt = DateTimeOffset.UtcNow, CloseId = Guid.NewGuid() });
        await db.SaveChangesAsync();
        var store = scope.ServiceProvider.GetRequiredService<IRecipeStore>();
        await store.SaveOriginalImageAsync(recipe.Id, 0, "image/png", new MemoryStream([1, 3, 5]));
        await store.SaveSourcePdfAsync(recipe.Id, new MemoryStream([37, 80, 68, 70]));
        await store.SaveHeroImageAsync(recipe.Id, new MemoryStream([7, 9]));
        var snapshot = await scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>().CaptureAsync(CancellationToken.None);
        var originalRoot = scope.ServiceProvider.GetRequiredService<RecipesRootResolver>().Root;
        Directory.Delete(originalRoot, true);
        var targetDatabase = database + "_target";
        await new NpgsqlCommand($"CREATE DATABASE {targetDatabase}", admin).ExecuteNonQueryAsync();
        try
        {
            var targetConnection = new NpgsqlConnectionStringBuilder(connection) { Database = targetDatabase }.ConnectionString;
            await using (var sql = new NpgsqlConnection(targetConnection))
            {
                await sql.OpenAsync();
                var root = new DirectoryInfo(AppContext.BaseDirectory);
                while (root is not null && !File.Exists(Path.Combine(root.FullName, "database", "schema.sql"))) root = root.Parent;
                await new NpgsqlCommand(await File.ReadAllTextAsync(Path.Combine(root!.FullName, "database", "schema.sql")), sql).ExecuteNonQueryAsync();
            }
            await using var target = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
            {
                ["Tests:PostgresConnectionString"] = targetConnection, ["Tests:LocalRecipeStore"] = "true", ["Recovery:BackupRoot"] = backup
            });
            using var client = target.CreateAuthenticatedClient();
            var response = await client.PostAsync($"/api/management/recovery/restore/{snapshot.SnapshotId}", null);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var targetScope = target.Services.CreateScope();
            var restoredDb = targetScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            Assert.Empty(await restoredDb.Recipes.ToListAsync());
            var restored = await restoredDb.Recipes.IgnoreQueryFilters().SingleAsync();
            Assert.Equal(recipe.Id, restored.Id);
            Assert.Equal(recipe.Notes, restored.Notes);
            Assert.Equal(recipe.RawMetadata, restored.RawMetadata!.Replace(": ", ":"));
            Assert.Equal(recipe.Ingredients, restored.Ingredients);
            Assert.Equal(3, (await restoredDb.WeeklyHouseholdInterests.SingleAsync()).PositiveCount);
            Assert.Empty(await restoredDb.WeeklyPlans.ToListAsync());
            var rootPath = targetScope.ServiceProvider.GetRequiredService<RecipesRootResolver>().Root;
            Assert.Equal(new byte[] { 37, 80, 68, 70 }, await File.ReadAllBytesAsync(Path.Combine(rootPath, recipe.Id.ToString(), "original", "source.pdf")));
            Assert.Equal(new byte[] { 7, 9 }, await File.ReadAllBytesAsync(Path.Combine(rootPath, recipe.Id.ToString(), "hero.webp")));
            Assert.NotNull(await targetScope.ServiceProvider.GetRequiredService<IStorageProvider>().LoadAsync("recipes", recipe.Id + "/recipe.json"));
            Assert.False(Directory.Exists(originalRoot));
        }
        finally { await new NpgsqlCommand($"DROP DATABASE IF EXISTS {targetDatabase} WITH (FORCE)", admin).ExecuteNonQueryAsync(); }
    }

    [PostgresTheory]
    [InlineData("version")]
    [InlineData("history")]
    [InlineData("unlisted")]
    [InlineData("missing-media")]
    public async Task Preflight_RejectsIncompleteOrIncompatibleSetsWithoutLiveMutation(string corruption)
    {
        using var scope = app.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>();
        var capture = await service.CaptureAsync(CancellationToken.None);
        var folder = Path.Combine(backup, capture.SnapshotId!.Value.ToString("N"));
        var manifestPath = Path.Combine(folder, "manifest.json");
        if (corruption == "version")
        {
            var manifest = System.Text.Json.Nodes.JsonNode.Parse(await File.ReadAllTextAsync(manifestPath))!;
            manifest["version"] = 999;
            await File.WriteAllTextAsync(manifestPath, manifest.ToJsonString());
        }
        else if (corruption == "history") File.Delete(Path.Combine(folder, "weekly-household-interest.json"));
        else if (corruption == "unlisted") await File.WriteAllTextAsync(Path.Combine(folder, "unexpected.txt"), "extra");
        else File.Delete(Path.Combine(folder, "tables/family_members.json"));
        using var client = app.CreateAuthenticatedClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync($"/api/management/recovery/restore/{capture.SnapshotId}", null)).StatusCode);
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.Equal(app.DefaultFamilyMemberId, (await db.FamilyMembers.SingleAsync()).Id);
        Assert.Null(scope.ServiceProvider.GetRequiredService<RecipesRootResolver>().Generation);
    }


    [PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task RestartReconciliation_UsesDatabaseCommitIdentity(bool committed)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var root = services.GetRequiredService<RecipesRootResolver>();
        Directory.CreateDirectory(root.BaseRoot);
        var operation = Guid.NewGuid();
        var snapshot = Guid.NewGuid();
        var generation = operation.ToString("N");
        Directory.CreateDirectory(Path.Combine(root.BaseRoot, ".recovery-generations", generation));
        await File.WriteAllTextAsync(Path.Combine(root.BaseRoot, ".recovery-active"), generation);
        await File.WriteAllTextAsync(Path.Combine(root.BaseRoot, ".recovery-journal.json"), JsonSerializer.Serialize(new { operation, snapshot, previous = (string?)null, next = generation }));
        var db = services.GetRequiredService<RecipeDbContext>();
        if (committed)
        {
            db.RecoveryPublications.Add(new RecoveryPublication { OperationId = operation, SnapshotId = snapshot });
            await db.SaveChangesAsync();
        }
        using var client = app.CreateAuthenticatedClient();
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.GetAsync("/api/family")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/management/recovery/status")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync("/api/management/recovery/resume", null)).StatusCode);
        Assert.Equal(committed ? generation : null, root.Generation);
        Assert.False(File.Exists(Path.Combine(root.BaseRoot, ".recovery-journal.json")));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/family")).StatusCode);
    }

    [PostgresFact]
    public async Task CaptureFailure_KeepsPriorSnapshot_AndPurgedMembershipCannotReturn()
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Permanently removed", ImageCount = 1 };
        db.Recipes.Add(recipe);
        db.WeeklyHouseholdInterests.Add(new WeeklyHouseholdInterest { RecipeId = recipe.Id, WeekStartDate = new(2026, 5, 4), PositiveCount = 1, CapturedAt = DateTimeOffset.UtcNow, CloseId = Guid.NewGuid() });
        await db.SaveChangesAsync();
        var store = services.GetRequiredService<IRecipeStore>();
        await store.SaveOriginalImageAsync(recipe.Id, 0, "image/png", new MemoryStream([5]));
        var service = services.GetRequiredService<RecoverySnapshotService>();
        var previous = await service.CaptureAsync(CancellationToken.None);
        await store.DeleteAsync(recipe.Id);
        await Assert.ThrowsAsync<InvalidDataException>(() => service.CaptureAsync(CancellationToken.None));
        Assert.True(File.Exists(Path.Combine(backup, previous.SnapshotId!.Value.ToString("N"), "manifest.json")));
        Assert.Single(Directory.GetDirectories(backup));
        db.Recipes.Remove(recipe);
        await db.SaveChangesAsync();
        Assert.Empty(await db.WeeklyHouseholdInterests.ToListAsync());
        var current = await service.CaptureAsync(CancellationToken.None);
        var folder = Path.Combine(backup, current.SnapshotId!.Value.ToString("N"));
        Assert.Equal("[]", await File.ReadAllTextAsync(Path.Combine(folder, "tables/recipes.json")));
        Assert.False(Directory.Exists(Path.Combine(folder, "recipes", recipe.Id.ToString())));
        await service.RestoreExactAsync(current.SnapshotId.Value, CancellationToken.None);
        db.ChangeTracker.Clear();
        Assert.Empty(await db.Recipes.IgnoreQueryFilters().ToListAsync());
        Assert.Empty(await db.WeeklyHouseholdInterests.ToListAsync());
    }

    [PostgresFact]
    public async Task ActiveWriter_DrainsBeforeCapture_AndInterruptedExportNeverPublishes()
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var gate = services.GetRequiredService<RecoveryBoundary>();
        var service = services.GetRequiredService<RecoverySnapshotService>();
        await using (var writer = await gate.EnterAsync(RecoveryAccess.Write, CancellationToken.None))
            await Assert.ThrowsAsync<RecoveryBusyException>(() => service.CaptureAsync(CancellationToken.None));
        Assert.Empty(Directory.Exists(backup) ? Directory.GetDirectories(backup) : []);
        var previous = await service.CaptureAsync(CancellationToken.None);
        var interrupted = new RecoverySnapshotService(services.GetRequiredService<RecipeDbContext>(), services.GetRequiredService<RecipesRootResolver>(),
            services.GetRequiredService<DataRootResolver>(), services.GetRequiredService<IConfiguration>(), services.GetRequiredService<RecipeApi.Services.IClock>(), gate, new InterruptAt("export-staged"));
        await Assert.ThrowsAsync<IOException>(() => interrupted.CaptureAsync(CancellationToken.None));
        Assert.Single(Directory.GetDirectories(backup));
        Assert.True(File.Exists(Path.Combine(backup, previous.SnapshotId!.Value.ToString("N"), "manifest.json")));
    }


    [PostgresTheory]
    [InlineData("foreign-key")]
    [InlineData("duplicate-key")]
    public async Task NativePreflight_RejectsRelationalCorruptionEvenWhenHashesMatch(string corruption)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.Recipes.Add(new Recipe { Name = "References member", AddedBy = app.DefaultFamilyMemberId });
        await db.SaveChangesAsync();
        var snapshot = await scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>().CaptureAsync(CancellationToken.None);
        var folder = Path.Combine(backup, snapshot.SnapshotId!.Value.ToString("N"));
        var path = Path.Combine(folder, "tables/family_members.json");
        var rows = System.Text.Json.Nodes.JsonNode.Parse(await File.ReadAllTextAsync(path))!.AsArray();
        if (corruption == "foreign-key") rows.Clear(); else rows.Add(rows[0]!.DeepClone());
        await File.WriteAllTextAsync(path, rows.ToJsonString());
        var manifestPath = Path.Combine(folder, "manifest.json");
        var manifest = System.Text.Json.Nodes.JsonNode.Parse(await File.ReadAllTextAsync(manifestPath))!;
        var entry = manifest["files"]!.AsArray().Single(f => f!["path"]!.GetValue<string>() == "tables/family_members.json")!;
        var bytes = await File.ReadAllBytesAsync(path);
        entry["length"] = bytes.Length;
        entry["sha256"] = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(bytes));
        await File.WriteAllTextAsync(manifestPath, manifest.ToJsonString());
        using var client = app.CreateAuthenticatedClient();
        var response = await client.PostAsync($"/api/management/recovery/restore/{snapshot.SnapshotId}", null);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        db.ChangeTracker.Clear();
        Assert.Equal(app.DefaultFamilyMemberId, (await db.FamilyMembers.SingleAsync()).Id);
        Assert.Equal("References member", (await db.Recipes.SingleAsync()).Name);
        Assert.Null(scope.ServiceProvider.GetRequiredService<RecipesRootResolver>().Generation);
    }

    [PostgresFact]
    public async Task RecoveryRoutes_RequireAuthentication()
    {
        using var client = app.CreateClient();
        foreach (var suffix in new[] { "snapshots", "restore/" + Guid.NewGuid(), "resume" })
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsync("/api/management/recovery/" + suffix, null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/management/recovery/status")).StatusCode);
    }


    [PostgresFact]
    public async Task HouseholdFacts_RoundTripPreferencesGroceriesCalendarReports_AndInvalidateTransientIdentities()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var member = await db.FamilyMembers.SingleAsync();
        member.PreferredLanguage = "fr";
        member.BrowseViewMode = "list";
        var recipe = new Recipe { Name = "Facts soup", IsReady = true, CuisineType = "French", Notes = "Family note", Ingredients = "[\"water\"]" };
        var oldRound = Guid.NewGuid();
        db.Recipes.Add(recipe);
        db.WeeklyPlans.Add(new WeeklyPlan { WeekStartDate = new(2026, 5, 4), Status = WeeklyPlanStatus.VotingOpen, VotingRoundId = oldRound, GroceryState = "{\"water\":true}", GroceryItems = "[]" });
        db.VotingRoundStates.Add(new VotingRoundState { RoundId = oldRound, HistoryGeneration = Guid.NewGuid(), WeekStartDate = new(2026, 5, 4) });
        db.RecipeVotes.Add(new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = member.Id, Vote = VoteType.Like });
        db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), RecipeId = recipe.Id, Date = new(2026, 5, 4), Status = CalendarEventStatus.Cooked });
        db.IngredientCategories.Add(new IngredientCategory { NormalizedKey = "pepper,\nred", GrocerySection = "Produce", Confidence = 0.875, Source = "manual" });
        db.FamilySettings.Add(new FamilySetting { Key = "recovery-fixture", Value = JsonSerializer.SerializeToElement(new { preference = "family" }) });
        db.FeatureFlagOverrides.Add(new FeatureFlagOverride { MemberId = member.Id, FlagKey = "fixture", Enabled = true });
        db.RecipeImportReports.Add(new RecipeImportReport { RecipeId = recipe.Id, Reasons = ["ingredients"], Note = "Review", Status = RecipeImportReportStatus.Reimporting, ReportedBy = member.Id, LastWorkflowInstanceId = Guid.NewGuid() });
        await db.SaveChangesAsync();
        var service = scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>();
        var snapshot = await service.CaptureAsync(CancellationToken.None);
        await service.RestoreExactAsync(snapshot.SnapshotId!.Value, CancellationToken.None);
        db.ChangeTracker.Clear();
        var restoredMember = await db.FamilyMembers.SingleAsync();
        Assert.Equal("fr", restoredMember.PreferredLanguage);
        Assert.Equal("list", restoredMember.BrowseViewMode);
        Assert.True((await db.FeatureFlagOverrides.SingleAsync()).Enabled);
        Assert.Equal("family", (await db.FamilySettings.SingleAsync()).Value.GetProperty("preference").GetString());
        Assert.Equal("pepper,\nred", (await db.IngredientCategories.SingleAsync()).NormalizedKey);
        Assert.Equal(0.875, (await db.IngredientCategories.SingleAsync()).Confidence);
        var plan = await db.WeeklyPlans.SingleAsync();
        Assert.True(JsonDocument.Parse(plan.GroceryState).RootElement.GetProperty("water").GetBoolean());
        Assert.True(plan.RequiresRoundIdentity);
        Assert.NotEqual(oldRound, plan.VotingRoundId);
        Assert.Null(plan.LastClosedRoundId);
        Assert.Empty(await db.RecipeVotes.ToListAsync());
        Assert.Equal(CalendarEventStatus.Cooked, (await db.CalendarEvents.SingleAsync()).Status);
        Assert.Equal(1, (await db.RecipeSearchAffinityFacts.SingleAsync()).Affinity);
        var report = await db.RecipeImportReports.SingleAsync();
        Assert.Equal("Review", report.Note);
        Assert.Null(report.LastWorkflowInstanceId);
        Assert.Equal(RecipeImportReportStatus.ReimportFailed, report.Status);
    }

    [PostgresFact]
    public async Task QueuedWorker_RechecksInvalidationAfterPublicationLease()
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        services.GetRequiredService<IConfiguration>()["Recovery:WaitSeconds"] = "10";
        var db = services.GetRequiredService<RecipeDbContext>();
        var instance = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "capture", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var task = new WorkflowTask { TaskId = Guid.NewGuid(), Instance = instance, TaskName = "stale", ProcessorName = "MustNeverExecute", Status = RecipeApi.Models.TaskStatus.Pending, CreatedAt = instance.CreatedAt, UpdatedAt = instance.UpdatedAt };
        db.WorkflowTasks.Add(task);
        await db.SaveChangesAsync();
        var lease = await services.GetRequiredService<RecoveryBoundary>().EnterAsync(RecoveryAccess.Publish, CancellationToken.None);
        using var worker = new WorkflowWorker(app.Services.GetRequiredService<IServiceScopeFactory>(),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<WorkflowWorker>.Instance,
            new RecipeApi.Services.Ai.AiExceptionHandler(Microsoft.Extensions.Logging.Abstractions.NullLogger<RecipeApi.Services.Ai.AiExceptionHandler>.Instance),
            Microsoft.Extensions.Options.Options.Create(new WorkflowRetryOptions()));
        var processing = worker.ProcessPendingTasksAsync(CancellationToken.None);
        try
        {
            using var wait = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            while (true)
            {
                await using var query = new NpgsqlCommand("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=@database AND wait_event='advisory')", admin);
                query.Parameters.AddWithValue("database", database);
                if ((bool)(await query.ExecuteScalarAsync(wait.Token))!) break;
                await Task.Delay(10, wait.Token);
            }
            Assert.False(processing.IsCompleted);
            task.Status = RecipeApi.Models.TaskStatus.Failed;
            task.ErrorMessage = "Invalidated by exact recovery";
            await db.SaveChangesAsync();
        }
        finally { await lease.DisposeAsync(); }
        await processing;
        db.ChangeTracker.Clear();
        var retained = await db.WorkflowTasks.SingleAsync(t => t.TaskId == task.TaskId);
        Assert.Equal(RecipeApi.Models.TaskStatus.Failed, retained.Status);
        Assert.Equal("Invalidated by exact recovery", retained.ErrorMessage);
    }

    [PostgresTheory]
    [InlineData("capture-locked")]
    [InlineData("export-staged")]
    [InlineData("pointer")]
    public async Task Cancellation_DiscardsIncompleteWork_AndAllowsRetry(string point)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var baseline = services.GetRequiredService<RecoverySnapshotService>();
        var snapshot = await baseline.CaptureAsync(CancellationToken.None);
        var member = await db.FamilyMembers.SingleAsync();
        member.Name = "Before cancellation";
        await db.SaveChangesAsync();
        using var cancellation = new CancellationTokenSource();
        var interrupted = new RecoverySnapshotService(db, services.GetRequiredService<RecipesRootResolver>(),
            services.GetRequiredService<DataRootResolver>(), services.GetRequiredService<IConfiguration>(),
            services.GetRequiredService<IClock>(), services.GetRequiredService<RecoveryBoundary>(), new CancelAt(point, cancellation));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => point == "pointer"
            ? interrupted.RestoreExactAsync(snapshot.SnapshotId!.Value, cancellation.Token)
            : interrupted.CaptureAsync(cancellation.Token));
        Assert.Single(Directory.GetDirectories(backup));
        db.ChangeTracker.Clear();
        Assert.Equal("Before cancellation", (await db.FamilyMembers.SingleAsync()).Name);
        await baseline.RestoreExactAsync(snapshot.SnapshotId!.Value, CancellationToken.None);
        Assert.False(File.Exists(Path.Combine(services.GetRequiredService<RecipesRootResolver>().BaseRoot, ".recovery-journal.json")));
    }

    private sealed class CancelAt(string point, CancellationTokenSource cancellation) : IRecoveryCheckpoint
    {
        public Task ReachedAsync(string name, CancellationToken ct)
        {
            if (name == point) { cancellation.Cancel(); ct.ThrowIfCancellationRequested(); }
            return Task.CompletedTask;
        }
    }

    private sealed class InterruptAt(string point) : IRecoveryCheckpoint
    {
        public Task ReachedAsync(string name, CancellationToken ct) => name == point
            ? Task.FromException(new IOException("Injected interruption at " + name)) : Task.CompletedTask;
    }

}
