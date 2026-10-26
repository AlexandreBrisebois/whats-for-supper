using System.Net;
using System.Net.Http.Json;
using RecipeApi.Services;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using PostgresTheory = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresTheoryAttribute;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using RecipeApi.Services.Ai;
using RecipeApi.Services.Processors;
using RecipeApi.Workflow;
using Microsoft.Extensions.AI;
using Moq;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;

namespace RecipeApi.Tests.Integration;

public class DemoShowcaseLoopPostgresTests : IAsyncLifetime
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
            ["Tests:RealWorkflowOrchestrator"] = "true",
            ["Recovery:WaitSeconds"] = "1"
        }, configureServices: RegisterManagement);
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

    private string SelectedBaseline(IServiceScope scope)
    {
        var root = Path.Combine(scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root, "demo");
        var selected = File.ReadAllText(Path.Combine(root, "current")).Trim();
        Assert.True(Guid.TryParseExact(selected, "N", out _));
        return Path.Combine(root, selected);
    }

    [PostgresFact]
    public async Task Capture_publishes_complete_selected_baseline_and_keeps_prior_on_missing_asset()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        var recipe = new Recipe { Name = "Synthetic soup", ImageCount = 1, AddedBy = app.DefaultFamilyMemberId };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var store = scope.ServiceProvider.GetRequiredService<IRecipeStore>();
        await store.SaveOriginalImageAsync(recipe.Id, 0, "image/png", new MemoryStream([1, 2, 3]));
        await store.SaveHeroImageAsync(recipe.Id, new MemoryStream([4, 5, 6]));
        await service.CaptureDemoStateAsync();
        var selected = SelectedBaseline(scope);
        Assert.True(File.Exists(Path.Combine(selected, "manifest.json")));
        File.Delete(Path.Combine(scope.ServiceProvider.GetRequiredService<RecipesRootResolver>().Root, recipe.Id.ToString(), "original", "0.png"));
        await Assert.ThrowsAsync<InvalidDataException>(() => service.CaptureDemoStateAsync());
        Assert.Equal(selected, SelectedBaseline(scope));
        Assert.Equal(new byte[] { 1, 2, 3 }, await File.ReadAllBytesAsync(Path.Combine(selected, "recipes", recipe.Id.ToString(), "original", "0.png")));
    }

    [PostgresFact]
    public async Task Round_trip_clears_activity_and_restores_recipe_assets_and_preferences()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        var recipe = new Recipe { Name = "Synthetic soup", ImageCount = 0, IsReady = true, Category = "Supper", CookedSuppressed = true, IsDiscoverable = false, AddedBy = app.DefaultFamilyMemberId, LastCookedDate = DateTimeOffset.UtcNow.AddDays(-7) };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        db.FamilySettings.Add(new FamilySetting { Key = "family_goto", Value = JsonSerializer.SerializeToElement(new { items = new[] { new { recipeId = recipe.Id, description = "Synthetic soup" } } }) });
        db.FeatureFlagOverrides.Add(new FeatureFlagOverride { MemberId = app.DefaultFamilyMemberId, FlagKey = "synthetic-fixture", Enabled = false });
        db.IngredientCategories.Add(new IngredientCategory { NormalizedKey = "lentils", GrocerySection = "Pantry", Source = "manual" });
        await db.SaveChangesAsync();
        var store = scope.ServiceProvider.GetRequiredService<IRecipeStore>();
        await store.SaveSourcePdfAsync(recipe.Id, new MemoryStream([1, 2, 3]));
        await store.SaveHeroImageAsync(recipe.Id, new MemoryStream([4, 5, 6]));
        await service.CaptureDemoStateAsync();
        _ = SelectedBaseline(scope);
        recipe.Name = "Visitor edit";
        (await db.FeatureFlagOverrides.SingleAsync()).Enabled = true;
        (await db.IngredientCategories.SingleAsync()).GrocerySection = "Grocery";
        db.FamilySettings.RemoveRange(db.FamilySettings);
        db.Recipes.Add(new Recipe { Name = "Visitor-only import" });
        db.WeeklyHouseholdInterests.Add(new WeeklyHouseholdInterest { RecipeId = recipe.Id, WeekStartDate = new(2026, 10, 19), PositiveCount = 2, CapturedAt = DateTimeOffset.UtcNow, CloseId = Guid.NewGuid() });
        db.GroceryExtraOccurrences.Add(GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 19), "Visitor milk", "milk", "Dairy & Eggs", DateTimeOffset.UtcNow));
        await db.SaveChangesAsync();
        await store.SaveHeroImageAsync(recipe.Id, new MemoryStream([9]));
        var resetResult = await service.RestoreDemoStateAsync();
        Assert.Equal(1, resetResult.SearchDocuments);
        Assert.Equal("disabled", (await scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>().StatusAsync(CancellationToken.None)).State);
        db.ChangeTracker.Clear();
        Assert.Equal("Synthetic soup", (await db.Recipes.SingleAsync()).Name);
        Assert.Null((await db.Recipes.SingleAsync()).LastCookedDate);
        Assert.False((await db.Recipes.SingleAsync()).CookedSuppressed);
        Assert.True((await db.Recipes.SingleAsync()).IsDiscoverable);
        Assert.Empty(await db.WeeklyHouseholdInterests.ToListAsync());
        Assert.Empty(await db.GroceryExtraOccurrences.ToListAsync());
        Assert.Equal(WeeklyPlanStatus.VotingOpen, (await db.WeeklyPlans.SingleAsync()).Status);
        Assert.Equal("[]", (await db.WeeklyPlans.SingleAsync()).GroceryItems);
        Assert.Equal("{}", (await db.WeeklyPlans.SingleAsync()).GroceryState);
        Assert.Empty(await db.CalendarEvents.ToListAsync());
        Assert.Empty(await db.RecipeVotes.ToListAsync());
        Assert.Empty(await db.RecipeImportReports.ToListAsync());
        Assert.False((await db.FeatureFlagOverrides.SingleAsync()).Enabled);
        Assert.Equal("Pantry", (await db.IngredientCategories.SingleAsync()).GrocerySection);
        Assert.Equal("family_goto", (await db.FamilySettings.SingleAsync()).Key);
        Assert.Equal("ready", (await db.RecipeSearchDocuments.SingleAsync()).IndexStatus);
        var active = scope.ServiceProvider.GetRequiredService<RecipesRootResolver>().Root;
        Assert.Equal(new byte[] { 4, 5, 6 }, await File.ReadAllBytesAsync(Path.Combine(active, recipe.Id.ToString(), "hero.webp")));
        await using var pdf = await store.ReadSourcePdfAsync(recipe.Id);
        Assert.NotNull(pdf);
        Assert.Equal(1, pdf.ReadByte());
        var firstRound = (await db.VotingRoundStates.SingleAsync()).RoundId;
        await service.RestoreDemoStateAsync();
        db.ChangeTracker.Clear();
        Assert.NotEqual(firstRound, (await db.VotingRoundStates.SingleAsync()).RoundId);
    }
    [PostgresFact]
    public async Task First_capture_drains_writes_started_before_baseline_activation()
    {
        using var scope = app.Services.CreateScope();
        await using var write = await scope.ServiceProvider.GetRequiredService<RecoveryBoundary>()
            .EnterAsync(RecoveryAccess.Write, CancellationToken.None);
        using var captureScope = app.Services.CreateScope();
        await Assert.ThrowsAsync<RecoveryBusyException>(() => captureScope.ServiceProvider.GetRequiredService<ManagementService>().CaptureDemoStateAsync());
    }

    [PostgresTheory]
    [InlineData("pointer", false)]
    [InlineData("committed", true)]
    public async Task Interrupted_publication_recovers_prior_or_committed_complete_generation(string point, bool committed)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Baseline soup" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await service.CaptureDemoStateAsync();
        recipe.Name = "Visitor edit";
        await db.SaveChangesAsync();
        var recovery = new RecoverySnapshotService(db,
            scope.ServiceProvider.GetRequiredService<RecipesRootResolver>(),
            scope.ServiceProvider.GetRequiredService<DataRootResolver>(),
            scope.ServiceProvider.GetRequiredService<IConfiguration>(),
            scope.ServiceProvider.GetRequiredService<IClock>(),
            scope.ServiceProvider.GetRequiredService<RecoveryBoundary>(), new InterruptAt(point));
        await Assert.ThrowsAsync<IOException>(() => recovery.RestoreDemoAsync(null, CancellationToken.None));
        db.ChangeTracker.Clear();
        Assert.Equal(committed ? "Baseline soup" : "Visitor edit", (await db.Recipes.SingleAsync()).Name);
        Assert.False(File.Exists(Path.Combine(scope.ServiceProvider.GetRequiredService<RecipesRootResolver>().BaseRoot, ".recovery-journal.json")));
        await recovery.ResumeAsync(CancellationToken.None);
    }

    [PostgresFact]
    public async Task Corrupt_assets_fail_before_mutating_live_recipe()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Baseline soup" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        await scope.ServiceProvider.GetRequiredService<IRecipeStore>().SaveHeroImageAsync(recipe.Id, new MemoryStream([1, 2, 3]));
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await service.CaptureDemoStateAsync();
        var selected = SelectedBaseline(scope);
        await File.WriteAllBytesAsync(Path.Combine(selected, "recipes", recipe.Id.ToString(), "hero.webp"), [9]);
        recipe.Name = "Visitor edit";
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidDataException>(() => service.RestoreDemoStateAsync());
        db.ChangeTracker.Clear();
        Assert.Equal("Visitor edit", (await db.Recipes.SingleAsync()).Name);
        Assert.Equal(selected, SelectedBaseline(scope));
    }

    [PostgresFact]
    public async Task Explicit_empty_assets_are_valid_but_missing_directory_is_not()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await service.CaptureDemoStateAsync();
        await service.RestoreDemoStateAsync();
        Assert.Empty(await db.Recipes.ToListAsync());
        Directory.Delete(Path.Combine(SelectedBaseline(scope), "recipes"));
        db.Recipes.Add(new Recipe { Name = "Keep visitor facts on failed preflight" });
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidDataException>(() => service.RestoreDemoStateAsync());
        Assert.Single(await db.Recipes.ToListAsync());
    }

    [PostgresFact]
    public async Task Legacy_snapshot_requires_recapture_without_deleting_live_facts()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.Recipes.Add(new Recipe { Name = "Keep visitor facts" });
        await db.SaveChangesAsync();
        var root = Path.Combine(scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root, "demo");
        Directory.CreateDirectory(root);
        await File.WriteAllTextAsync(Path.Combine(root, "manifest.json"), "{\"schemaVersion\":1}");
        var error = await Assert.ThrowsAsync<InvalidDataException>(() => scope.ServiceProvider.GetRequiredService<ManagementService>().RestoreDemoStateAsync());
        Assert.Contains("recapture", error.Message);
        Assert.Single(await db.Recipes.ToListAsync());
    }

    [PostgresFact]
    public async Task Persisted_management_workflows_execute_through_worker_and_ordinary_reads()
    {
        using var scope = app.Services.CreateScope();
        WriteDefinitions(scope);
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Prepared worker soup", IsReady = true };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var clock = scope.ServiceProvider.GetRequiredService<IClock>();
        using var worker = new WorkflowWorker(clock, app.Services.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<WorkflowWorker>.Instance, new AiExceptionHandler(clock, NullLogger<AiExceptionHandler>.Instance), Options.Create(new WorkflowRetryOptions()));
        using var client = app.CreateAuthenticatedClient();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        foreach (var action in new[] { "demo-capture", "demo-restore" })
        {
            var accepted = await client.PostAsync("/api/management/" + action, null);
            Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
            using var body = JsonDocument.Parse(await accepted.Content.ReadAsStringAsync());
            var id = body.RootElement.GetProperty("taskId").GetGuid();
            Assert.True(await db.WorkflowTasks.AnyAsync(t => t.InstanceId == id));
            await worker.ProcessPendingTasksAsync(timeout.Token);
            db.ChangeTracker.Clear();
            Assert.True(await db.WorkflowTasks.AnyAsync(t => t.InstanceId == id && t.Status == RecipeApi.Models.TaskStatus.Completed));
            if (action == "demo-capture")
            {
                var current = await db.Recipes.SingleAsync();
                current.Name = "Visitor edit";
                await db.SaveChangesAsync();
            }
        }
        var response = await client.GetAsync($"/api/recipes/{recipe.Id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var result = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var value = result.RootElement.TryGetProperty("data", out var wrapped) ? wrapped : result.RootElement;
        Assert.Equal("Prepared worker soup", value.GetProperty("recipe").GetProperty("name").GetString());
    }

    [PostgresFact]
    public async Task Capture_rejects_unknown_recipe_reference_in_declared_household_setting()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.FamilySettings.Add(new FamilySetting
        {
            Key = "family_goto", Value = JsonSerializer.SerializeToElement(new { items = new[] { new { recipeId = Guid.NewGuid(), description = "Missing synthetic recipe" } } })
        });
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidDataException>(() => scope.ServiceProvider.GetRequiredService<ManagementService>().CaptureDemoStateAsync());
    }

    [PostgresFact]
    public async Task Reset_rejects_unclassified_live_setting_without_erasing_operator_data()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await service.CaptureDemoStateAsync();
        db.FamilySettings.Add(new FamilySetting { Key = "unclassified_operator_setting", Value = JsonSerializer.SerializeToElement(new { value = "synthetic-value" }) });
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidDataException>(() => service.RestoreDemoStateAsync());
        Assert.Equal("unclassified_operator_setting", (await db.FamilySettings.SingleAsync()).Key);
    }

    [PostgresFact]
    public async Task Concurrent_scheduler_acceptance_confirms_one_effective_future_restore()
    {
        using var first = app.Services.CreateScope();
        using var second = app.Services.CreateScope();
        WriteDefinitions(first);
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["DEMO_MODE"] = "true" }).Build();
        DemoWorkflowSeeder Seeder(IServiceScope scope) => new(
            scope.ServiceProvider.GetRequiredService<RecipeDbContext>(), scope.ServiceProvider.GetRequiredService<IWorkflowOrchestrator>(),
            new DemoModeOptions(config), new CronScheduleCalculator(config), scope.ServiceProvider.GetRequiredService<IClock>(), NullLogger<DemoWorkflowSeeder>.Instance);
        await Task.WhenAll(Seeder(first).SeedAsync(CancellationToken.None), Seeder(second).SeedAsync(CancellationToken.None));
        await Seeder(first).SeedAsync(CancellationToken.None);
        var db = first.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var instance = Assert.Single(await db.WorkflowInstances.Where(i => i.WorkflowId == "demo-restore").ToListAsync());
        Assert.True(DemoWorkflowSeeder.IsAutomatic(instance.Parameters));
        Assert.True((await db.WorkflowTasks.SingleAsync(t => t.InstanceId == instance.Id && t.ProcessorName == "RestoreDemoState")).ScheduledAt > DateTimeOffset.UtcNow);
    }

    [PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Scheduled_demo_worker_preserves_future_recurrence_after_success_or_failure_without_models(bool corrupt)
    {
        using var preparation = app.Services.CreateScope();
        WriteDefinitions(preparation);
        var db = preparation.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Authored scheduled soup", IsReady = true };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        await preparation.ServiceProvider.GetRequiredService<ManagementService>().CaptureDemoStateAsync();
        if (corrupt) await File.WriteAllTextAsync(Path.Combine(SelectedBaseline(preparation), "manifest.json"), "{}");
        recipe.Name = "Visitor experiment";
        await db.SaveChangesAsync();
        var chat = new Mock<IChatClient>(MockBehavior.Strict);
        chat.Setup(c => c.Dispose());
        var embedding = new Mock<IEmbeddingProvider>(MockBehavior.Strict);
        var clock = new MutableClock();
        await using var visitor = await TestWebApplicationFactory.CreateWithAuthAsync(clock, new()
        {
            ["Tests:PostgresConnectionString"] = connection, ["Tests:LocalRecipeStore"] = "true", ["Tests:RealWorkflowOrchestrator"] = "true",
            ["DataRoot"] = preparation.ServiceProvider.GetRequiredService<DataRootResolver>().Root,
            ["RecipesRoot"] = preparation.ServiceProvider.GetRequiredService<RecipesRootResolver>().BaseRoot,
            ["WorkflowsRoot"] = preparation.ServiceProvider.GetRequiredService<WorkflowRootResolver>().Root,
            ["DEMO_MODE"] = "true", ["DEMO_RESTORE_CRON_UTC"] = "0 3 * * *"
        }, configureServices: services =>
        {
            RegisterManagement(services);
            services.AddSingleton<IChatClient>(chat.Object);
            services.AddSingleton<IEmbeddingProvider>(embedding.Object);
        });
        using var scope = visitor.Services.CreateScope();
        var seeder = scope.ServiceProvider.GetRequiredService<DemoWorkflowSeeder>();
        await seeder.SeedAsync(CancellationToken.None);
        var facts = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var first = await facts.WorkflowInstances.SingleAsync(i => i.WorkflowId == "demo-restore");
        clock.UtcNow = new(2026, 10, 26, 3, 0, 0, TimeSpan.Zero);
        using var worker = new WorkflowWorker(clock, visitor.Services.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<WorkflowWorker>.Instance, new AiExceptionHandler(clock, NullLogger<AiExceptionHandler>.Instance), Options.Create(new WorkflowRetryOptions()));
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        await worker.ProcessPendingTasksAsync(timeout.Token);
        facts.ChangeTracker.Clear();
        var reset = await facts.WorkflowTasks.SingleAsync(t => t.InstanceId == first.Id && t.ProcessorName == "RestoreDemoState");
        Assert.Equal(corrupt ? RecipeApi.Models.TaskStatus.Failed : RecipeApi.Models.TaskStatus.Completed, reset.Status);
        Assert.Equal(corrupt ? "Visitor experiment" : "Authored scheduled soup", (await facts.Recipes.SingleAsync()).Name);
        clock.UtcNow = clock.UtcNow.AddSeconds(1);
        if (corrupt) await seeder.SeedAsync(CancellationToken.None);
        else await worker.ProcessPendingTasksAsync(timeout.Token);
        facts.ChangeTracker.Clear();
        var next = Assert.Single(await facts.WorkflowTasks.Where(t => t.InstanceId != first.Id && t.ProcessorName == "RestoreDemoState" && t.Status == RecipeApi.Models.TaskStatus.Pending).ToListAsync());
        Assert.Equal(new DateTimeOffset(2026, 10, 27, 3, 0, 0, TimeSpan.Zero), next.ScheduledAt);
        using var client = visitor.CreateAuthenticatedClient();
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsync("/api/management/demo-restore", null)).StatusCode);
        var response = await client.GetAsync("/api/management/status");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var status = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(!corrupt, status.RootElement.GetProperty("demoSnapshotReady").GetBoolean());
        Assert.Equal(reset.TaskId, status.RootElement.GetProperty("demoLastResetTaskId").GetGuid());
        Assert.True(status.RootElement.GetProperty("demoRestoreSeederHealthy").GetBoolean());
        Assert.NotEqual(JsonValueKind.Null, status.RootElement.GetProperty("demoNextRestoreAt").ValueKind);
        chat.Verify(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()), Times.Never);
        embedding.VerifyNoOtherCalls();
    }

    [PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Reset_rejects_missing_or_stale_recipe_generation_and_accepts_fresh_edit(bool missing)
    {
        using var preparation = app.Services.CreateScope();
        var db = preparation.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Prepared versioned soup", IsReady = true, Category = "Supper" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var service = preparation.ServiceProvider.GetRequiredService<ManagementService>();
        await service.CaptureDemoStateAsync();
        await service.RestoreDemoStateAsync();
        var old = (await db.RecoveryPublications.SingleAsync()).OperationId;
        await using var visitor = await CreateVisitorAsync(preparation);
        using var client = visitor.CreateAuthenticatedClient();
        await service.RestoreDemoStateAsync();
        db.ChangeTracker.Clear();
        var current = (await db.RecoveryPublications.SingleAsync()).OperationId;
        using var stale = new HttpRequestMessage(HttpMethod.Patch, $"/api/recipes/{recipe.Id}") { Content = JsonContent.Create(new { name = "Obsolete edit" }) };
        if (!missing) stale.Headers.Add("X-Demo-Generation", old.ToString());
        var rejected = await client.SendAsync(stale);
        Assert.Equal(HttpStatusCode.PreconditionFailed, rejected.StatusCode);
        using var error = JsonDocument.Parse(await rejected.Content.ReadAsStringAsync());
        Assert.Equal("DEMO_RESET_REQUIRED", error.RootElement.GetProperty("code").GetString());
        Assert.Equal(current, error.RootElement.GetProperty("generation").GetGuid());
        db.ChangeTracker.Clear();
        Assert.Equal("Prepared versioned soup", (await db.Recipes.SingleAsync()).Name);
        using var fresh = new HttpRequestMessage(HttpMethod.Patch, $"/api/recipes/{recipe.Id}") { Content = JsonContent.Create(new { name = "Current visitor edit" }) };
        fresh.Headers.Add("X-Demo-Generation", current.ToString());
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(fresh)).StatusCode);
        db.ChangeTracker.Clear();
        Assert.Equal("Current visitor edit", (await db.Recipes.SingleAsync()).Name);
    }

    [PostgresFact]
    public async Task Reset_rejects_stale_grocery_check_and_cache_keyed_media_and_health_reports_current_generation()
    {
        using var preparation = app.Services.CreateScope();
        var db = preparation.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Versioned asset soup", IsReady = true };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        await preparation.ServiceProvider.GetRequiredService<IRecipeStore>().SaveHeroImageAsync(recipe.Id, new MemoryStream([1, 2, 3]));
        var service = preparation.ServiceProvider.GetRequiredService<ManagementService>();
        await service.CaptureDemoStateAsync();
        await service.RestoreDemoStateAsync();
        var old = (await db.RecoveryPublications.SingleAsync()).OperationId;
        await using var visitor = await CreateVisitorAsync(preparation);
        using var client = visitor.CreateAuthenticatedClient();
        await service.RestoreDemoStateAsync();
        db.ChangeTracker.Clear();
        var current = (await db.RecoveryPublications.SingleAsync()).OperationId;
        (await db.WeeklyPlans.SingleAsync()).GroceryState = "{\"Current item\":true}";
        await db.SaveChangesAsync();
        using var stale = new HttpRequestMessage(HttpMethod.Patch, "/api/schedule/0/grocery/item") { Content = JsonContent.Create(new { ingredientName = "Current item", @checked = false }) };
        stale.Headers.Add("X-Demo-Generation", old.ToString());
        Assert.Equal(HttpStatusCode.PreconditionFailed, (await client.SendAsync(stale)).StatusCode);
        db.ChangeTracker.Clear();
        Assert.Contains("true", (await db.WeeklyPlans.SingleAsync()).GroceryState);
        Assert.Equal(HttpStatusCode.PreconditionFailed, (await client.GetAsync($"/api/recipes/{recipe.Id}/hero?demoGeneration={old}")).StatusCode);
        var image = await client.GetAsync($"/api/recipes/{recipe.Id}/hero?demoGeneration={current}");
        Assert.Equal(HttpStatusCode.OK, image.StatusCode);
        Assert.Equal(new byte[] { 1, 2, 3 }, await image.Content.ReadAsByteArrayAsync());
        var health = await client.GetAsync("/api/health");
        Assert.Equal(current.ToString(), Assert.Single(health.Headers.GetValues("X-Demo-Generation")));
    }

    private Task<TestWebApplicationFactory> CreateVisitorAsync(IServiceScope preparation)
        => TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
        {
            ["Tests:PostgresConnectionString"] = connection, ["Tests:LocalRecipeStore"] = "true", ["DEMO_MODE"] = "true",
            ["DataRoot"] = preparation.ServiceProvider.GetRequiredService<DataRootResolver>().Root,
            ["RecipesRoot"] = preparation.ServiceProvider.GetRequiredService<RecipesRootResolver>().BaseRoot,
            ["WorkflowsRoot"] = preparation.ServiceProvider.GetRequiredService<WorkflowRootResolver>().Root
        });

    [PostgresFact]
    public async Task Reaper_cannot_reopen_an_old_task_across_demo_publication()
    {
        using var preparation = app.Services.CreateScope();
        var db = preparation.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var service = preparation.ServiceProvider.GetRequiredService<ManagementService>();
        await service.CaptureDemoStateAsync();
        var now = preparation.ServiceProvider.GetRequiredService<IClock>().UtcNow;
        var instance = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "obsolete-import", Status = WorkflowStatus.Processing };
        var task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = instance.Id, Instance = instance,
            ProcessorName = "SyncRecipe", TaskName = "sync", Status = RecipeApi.Models.TaskStatus.Processing, UpdatedAt = now.AddMinutes(-30) };
        db.WorkflowTasks.Add(task);
        await db.SaveChangesAsync();
        var gate = new ReaperGate();
        var services = new ServiceCollection();
        services.AddSingleton(preparation.ServiceProvider.GetRequiredService<IConfiguration>());
        services.AddSingleton(preparation.ServiceProvider.GetRequiredService<RecipesRootResolver>());
        services.AddDbContext<RecipeDbContext>(o => o.UseNpgsql(connection).AddInterceptors(gate));
        services.AddScoped<RecoveryBoundary>();
        using var provider = services.BuildServiceProvider();
        var clock = preparation.ServiceProvider.GetRequiredService<IClock>();
        using var worker = new WorkflowWorker(clock, provider.GetRequiredService<IServiceScopeFactory>(), NullLogger<WorkflowWorker>.Instance,
            new AiExceptionHandler(clock, NullLogger<AiExceptionHandler>.Instance), Options.Create(new WorkflowRetryOptions()));
        var method = typeof(WorkflowWorker).GetMethod("ReapStaleTasksAsync", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        var reaping = (Task)method.Invoke(worker, [CancellationToken.None])!;
        try
        {
            await gate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            await Assert.ThrowsAsync<RecoveryBusyException>(() => service.RestoreDemoStateAsync());
        }
        finally { gate.Release.TrySetResult(); await reaping; }
        await service.RestoreDemoStateAsync();
        db.ChangeTracker.Clear();
        Assert.Equal(RecipeApi.Models.TaskStatus.Failed, (await db.WorkflowTasks.SingleAsync(t => t.TaskId == task.TaskId)).Status);
    }

    private sealed class ReaperGate : SaveChangesInterceptor
    {
        public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
        {
            if (eventData.Context!.ChangeTracker.Entries<WorkflowTask>().Any(e => e.Entity.Status == RecipeApi.Models.TaskStatus.Pending
                && e.OriginalValues.GetValue<RecipeApi.Models.TaskStatus>(nameof(WorkflowTask.Status)) == RecipeApi.Models.TaskStatus.Processing))
            {
                Entered.TrySetResult();
                await Release.Task.WaitAsync(ct);
            }
            return result;
        }
    }

    [PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Reset_preserves_only_reviewed_unclaimed_future_maintenance(bool unreviewed)
    {
        using var scope = app.Services.CreateScope();
        WriteDefinitions(scope);
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await service.CaptureDemoStateAsync();
        var future = DateTimeOffset.UtcNow.AddHours(1);
        var scheduled = await scope.ServiceProvider.GetRequiredService<IWorkflowOrchestrator>().TriggerAsync("dreaming", [], future);
        if (unreviewed)
            db.WorkflowTasks.Add(new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = scheduled.Id, TaskName = "unreviewed", ProcessorName = "GenerateHero", Status = RecipeApi.Models.TaskStatus.Pending, ScheduledAt = future });
        db.MaintenanceCommands.Add(new MaintenanceCommand { CommandType = "synthetic-command", Status = "pending" });
        await db.SaveChangesAsync();
        await service.RestoreDemoStateAsync();
        db.ChangeTracker.Clear();
        Assert.Equal(unreviewed ? WorkflowStatus.Failed : WorkflowStatus.Pending, (await db.WorkflowInstances.SingleAsync(i => i.Id == scheduled.Id)).Status);
        var roots = await db.WorkflowTasks.Where(t => t.InstanceId == scheduled.Id && t.ScheduledAt != null).ToListAsync();
        Assert.All(roots, t => Assert.Equal(unreviewed ? RecipeApi.Models.TaskStatus.Failed : RecipeApi.Models.TaskStatus.Pending, t.Status));
        Assert.Equal("skipped", (await db.MaintenanceCommands.SingleAsync()).Status);
    }

    [PostgresFact]
    public async Task Old_claimed_reset_cannot_publish_after_another_reset_invalidates_it()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.Recipes.Add(new Recipe { Name = "Prepared soup" });
        await db.SaveChangesAsync();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await service.CaptureDemoStateAsync();
        WorkflowInstance Reset() => new() { Id = Guid.NewGuid(), WorkflowId = "demo-restore", Status = WorkflowStatus.Processing,
            Tasks = [new() { TaskId = Guid.NewGuid(), TaskName = "restore", ProcessorName = "RestoreDemoState", Status = RecipeApi.Models.TaskStatus.Processing }] };
        var first = Reset();
        var obsolete = Reset();
        db.WorkflowInstances.AddRange(first, obsolete);
        await db.SaveChangesAsync();
        await service.RestoreDemoStateAsync(CancellationToken.None, first.Id);
        var current = await db.Recipes.SingleAsync();
        current.Name = "New-generation experiment";
        await db.SaveChangesAsync();
        var generation = (await db.RecoveryPublications.SingleAsync()).OperationId;
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.RestoreDemoStateAsync(CancellationToken.None, obsolete.Id));
        db.ChangeTracker.Clear();
        Assert.Equal(generation, (await db.RecoveryPublications.SingleAsync()).OperationId);
        Assert.Equal("New-generation experiment", (await db.Recipes.SingleAsync()).Name);
    }

    [PostgresFact]
    public async Task Synthetic_household_can_vote_save_shop_cook_and_reset_without_replaying_activity()
    {
        using var preparation = app.Services.CreateScope();
        var db = preparation.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var firstMember = await db.FamilyMembers.SingleAsync();
        firstMember.Name = "Maple";
        var second = new FamilyMember { Id = Guid.Parse("b2a00000-0000-4000-8000-000000000002"), Name = "Cedar" };
        db.FamilyMembers.Add(second);
        string[] names = ["Lentil soup", "Bean rice", "Tomato pasta", "Chickpea stew", "Vegetable curry", "Potato bake", "Garden noodles"];
        var recipes = names.Select((name, index) => new Recipe
        {
            Id = Guid.Parse($"b2a00000-0000-4000-8000-{index + 10:000000000000}"), Name = name,
            IsReady = true, IsDiscoverable = true, SupperSuitable = true, Category = "Supper",
            Ingredients = "[\"1 cup lentils\"]", AddedBy = firstMember.Id
        }).ToArray();
        db.Recipes.AddRange(recipes);
        await db.SaveChangesAsync();
        var management = preparation.ServiceProvider.GetRequiredService<ManagementService>();
        await management.CaptureDemoStateAsync();
        await management.RestoreDemoStateAsync();
        await using var visitor = await CreateVisitorAsync(preparation);
        using var client = visitor.CreateAuthenticatedClient();
        var health = await client.GetAsync("/api/health");
        client.DefaultRequestHeaders.Add("X-Demo-Generation", Assert.Single(health.Headers.GetValues("X-Demo-Generation")));
        foreach (var member in new[] { firstMember.Id, second.Id })
        {
            client.DefaultRequestHeaders.Remove("X-Family-Member-Id");
            client.DefaultRequestHeaders.Add("X-Family-Member-Id", member.ToString());
            foreach (var recipe in recipes)
                (await client.PostAsJsonAsync($"/api/discovery/{recipe.Id}/vote", new { vote = 1 })).EnsureSuccessStatusCode();
        }
        var session = await client.GetFromJsonAsync<JsonElement>("/api/discovery/session");
        Assert.Equal("converged", session.GetProperty("data").GetProperty("phase").GetString());
        db.ChangeTracker.Clear();
        Assert.Empty(await db.CalendarEvents.ToListAsync());
        var calendar = new DeploymentCalendar(preparation.ServiceProvider.GetRequiredService<IConfiguration>()).Capture(preparation.ServiceProvider.GetRequiredService<IClock>().UtcNow);
        var today = calendar.Today;
        var dayIndex = today.DayNumber - calendar.CurrentWeekStartDate.DayNumber;
        (await client.PostAsJsonAsync("/api/schedule/assign", new { weekOffset = 0, dayIndex, recipeId = recipes[0].Id })).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/grocery-extras", new { clientId = Guid.NewGuid(), weekStartDate = calendar.CurrentWeekStartDate.ToString("yyyy-MM-dd"), name = "Synthetic picnic napkins" })).EnsureSuccessStatusCode();
        (await client.GetAsync("/api/schedule?weekOffset=0")).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync($"/api/schedule/day/{today:yyyy-MM-dd}/validate", new { status = 2, recipeId = recipes[0].Id })).EnsureSuccessStatusCode();
        db.ChangeTracker.Clear();
        Assert.NotNull((await db.Recipes.SingleAsync(r => r.Id == recipes[0].Id)).LastCookedDate);
        Assert.Single(await db.GroceryExtraOccurrences.ToListAsync());
        await management.RestoreDemoStateAsync();
        db.ChangeTracker.Clear();
        Assert.Equal(7, await db.Recipes.CountAsync());
        Assert.All(await db.Recipes.ToListAsync(), recipe => Assert.Null(recipe.LastCookedDate));
        Assert.Empty(await db.CalendarEvents.ToListAsync());
        Assert.Equal(WeeklyPlanStatus.VotingOpen, (await db.WeeklyPlans.SingleAsync()).Status);
        Assert.Equal("[]", (await db.WeeklyPlans.SingleAsync()).GroceryItems);
        Assert.Equal("{}", (await db.WeeklyPlans.SingleAsync()).GroceryState);
        Assert.Empty(await db.RecipeVotes.ToListAsync());
        Assert.Empty(await db.GroceryExtraOccurrences.ToListAsync());
        Assert.Equal(HttpStatusCode.PreconditionFailed, (await client.PostAsJsonAsync($"/api/discovery/{recipes[0].Id}/vote", new { vote = 1 })).StatusCode);
    }

    private static void RegisterManagement(IServiceCollection services)
    {
        services.AddScoped<DemoWorkflowSeeder>();
        services.AddScoped<IWorkflowProcessor, WorkflowProcessor>();
        foreach (var processor in new[] { "CaptureDemoState", "RestoreDemoState" })
            services.AddScoped<IWorkflowProcessor>(sp => new ManagementProcessor(sp.GetRequiredService<ManagementService>(), sp.GetRequiredService<RecipeDbContext>(), processor));
    }

    private static void WriteDefinitions(IServiceScope scope)
    {
        var data = scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root;
        var definitions = scope.ServiceProvider.GetRequiredService<WorkflowRootResolver>().Root;
        Assert.StartsWith(Path.GetFullPath(data) + Path.DirectorySeparatorChar, Path.GetFullPath(definitions));
        Directory.CreateDirectory(definitions);
        var source = new DirectoryInfo(AppContext.BaseDirectory);
        while (source is not null && !Directory.Exists(Path.Combine(source.FullName, "src", "RecipeApi", "Workflows"))) source = source.Parent;
        foreach (var name in new[] { "demo-capture", "demo-restore", "dreaming" })
            File.Copy(Path.Combine(source!.FullName, "src", "RecipeApi", "Workflows", name + ".yaml"), Path.Combine(definitions, name + ".yaml"));
    }

    private sealed class MutableClock : IClock
    {
        public DateTimeOffset UtcNow { get; set; } = new(2026, 10, 25, 12, 0, 0, TimeSpan.Zero);
    }

    private sealed class InterruptAt(string point) : IRecoveryCheckpoint
    {
        public Task ReachedAsync(string name, CancellationToken ct)
            => name == point ? Task.FromException(new IOException("Synthetic interruption")) : Task.CompletedTask;
    }

}
