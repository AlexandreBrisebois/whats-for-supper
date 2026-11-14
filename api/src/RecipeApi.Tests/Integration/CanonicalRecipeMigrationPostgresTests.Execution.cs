using System.Reflection;
using System.Runtime.ExceptionServices;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalRecipeMigrationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Executor_RebuildsEveryWeekAndCompletedReplayPreservesLaterHumanChecks() => WithExecution(async (services, inventory, commit, hash) =>
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        var before = await Capture(services, inventory.Request);
        await Execute(services, inventory, commit, hash);
        db.ChangeTracker.Clear();
        var convertedId = inventory.Recipes.Single(x => x.Status == "requires-forward-assessment").RecipeId;
        var converted = CanonicalRecipeContentStore.Read(await db.Recipes.SingleAsync(x => x.Id == convertedId))!;
        Assert.Equal(4, converted.Servings);
        Assert.Equal("⅓", converted.IngredientLines[0].AmountText);
        Assert.Equal("1", converted.IngredientLines[0].Amount!.Value!.N);
        Assert.Equal("3", converted.IngredientLines[0].Amount!.Value!.D);
        var plans = await db.WeeklyPlans.OrderBy(x => x.WeekStartDate).ToArrayAsync();
        Assert.Equal(inventory.Weeks.Select(x => x.WeekStart), plans.Select(x => x.WeekStartDate));
        Assert.All(plans, plan =>
        {
            Assert.Equal(inventory.Request.OperationId.ToString("N"), plan.GroceryResetSummaryVersion);
            Assert.Equal("current", plan.ServingRefreshStatus);
            Assert.Equal("{}", plan.GroceryCheckedDemandBaselines);
            Assert.DoesNotContain(JsonDocument.Parse(plan.GroceryState).RootElement.EnumerateObject(), x => x.Value.GetBoolean());
        });
        Assert.Equal(inventory.Weeks.Count + 1, await db.MaintenanceCommands.CountAsync(x => x.CommandType == "canonical-recipe-migration-receipt-v1"));
        var after = await Capture(services, inventory.Request);
        AssertProtectedTables(before, after);
        var planWithRows = plans.First(x => x.GroceryItems != "[]");
        await CheckThroughOwner(services, planWithRows);
        var preserved = await DatabaseDigest(services);
        await Execute(services, inventory, commit, hash);
        Assert.Equal(preserved, await DatabaseDigest(services));
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Executor_BeforeCommitRollsBackResetAndReceipt_ThenPartialResumeSkipsCompletedWeek() => WithExecution(async (services, inventory, commit, hash) =>
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        await Assert.ThrowsAsync<IOException>(() => Execute(services, inventory, commit, hash, new MigrationInterrupt("migration-week-before-commit")));
        db.ChangeTracker.Clear();
        Assert.Equal(1, await db.MaintenanceCommands.CountAsync(x => x.CommandType == "canonical-recipe-migration-receipt-v1"));
        Assert.DoesNotContain(await db.WeeklyPlans.ToArrayAsync(), x => x.GroceryResetSummaryVersion == inventory.Request.OperationId.ToString("N"));
        await Assert.ThrowsAsync<IOException>(() => Execute(services, inventory, commit, hash, new MigrationInterrupt("migration-week-committed")));
        db.ChangeTracker.Clear();
        var first = await db.WeeklyPlans.SingleAsync(x => x.GroceryResetSummaryVersion == inventory.Request.OperationId.ToString("N"));
        await CheckThroughOwner(services, first);
        var laterChecks = (await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.Id == first.Id)).GroceryState;
        await Execute(services, inventory, commit, hash);
        db.ChangeTracker.Clear();
        Assert.Equal(laterChecks, (await db.WeeklyPlans.SingleAsync(x => x.Id == first.Id)).GroceryState);
        Assert.Equal(inventory.Weeks.Count, await db.WeeklyPlans.CountAsync(x => x.GroceryResetSummaryVersion == inventory.Request.OperationId.ToString("N")));
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Executor_PruneThenRealHumanCheckThenResumeRetainsExactReceiptsAndBaselines() => WithExecution(async (services, inventory, commit, hash) =>
    {
        await Execute(services, inventory, commit, hash);
        var db = services.GetRequiredService<RecipeDbContext>();
        db.ChangeTracker.Clear();
        var plan = (await db.WeeklyPlans.ToArrayAsync()).First(x => x.GroceryItems != "[]");
        var roots = services.GetRequiredService<RecipesRootResolver>();
        var marker = Path.Combine(roots.BaseRoot, ".maintenance-hold.json");
        var bytes = await File.ReadAllBytesAsync(marker);
        File.Delete(marker);
        var row = JsonDocument.Parse(plan.GroceryItems).RootElement[0];
        var decorated = await services.GetRequiredService<GroceryPresentationService>().DecorateAsync(new RecipeApi.Dto.GroceryMutationResult(
            services.GetRequiredService<IClock>().UtcNow, plan.WeekStartDate, plan.GroceryListVersion,
            JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)!, JsonSerializer.Deserialize<List<RecipeApi.Dto.GroceryLineItemDto>>(plan.GroceryItems)!));
        await services.GetRequiredService<ScheduleService>().MutateGroceryItemAsync(0,
            new RecipeApi.Dto.GroceryItemMutationDto(row.GetProperty("rowId").GetGuid(), plan.WeekStartDate,
                row.GetProperty("rowVersion").GetString(), true, Guid.NewGuid(), decorated.PresentationEpoch), reference: plan.WeekStartDate);
        await File.WriteAllBytesAsync(marker, bytes);
        ((MigrationClock)services.GetRequiredService<IClock>()).UtcNow = DateTimeOffset.Parse("2027-01-01T16:00:00Z");
        await services.GetRequiredService<ManagementService>().PruneMaintenanceCommandsAsync();
        db.ChangeTracker.Clear();
        Assert.False(await db.MaintenanceCommands.AnyAsync(x => x.CommandType == "canonical-recipe-migration-receipt-v1"));
        Assert.Equal(inventory.Weeks.Count + 1, (await db.MaintenanceCommandLifecycleRecords.ToArrayAsync()).Count(x => x.Payload.Contains("canonical-recipe-migration-receipt-v1", StringComparison.Ordinal)));
        var before = await DatabaseDigest(services);
        await Execute(services, inventory, commit, hash);
        Assert.Equal(before, await DatabaseDigest(services));
        var current = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.Id == plan.Id);
        Assert.True(JsonDocument.Parse(current.GroceryState).RootElement.GetProperty(row.GetProperty("rowId").GetString()!).GetBoolean());
        Assert.NotEqual("{}", current.GroceryCheckedDemandBaselines);
    });

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData("model")]
    [InlineData("artifact")]
    [InlineData("schema")]
    [InlineData("recipe-operation")]
    [InlineData("weeks")]
    [InlineData("source-content")]
    public Task Executor_RejectsChangedBindingsOrProtectedFactsBeforeFirstWrite(string kind) => WithExecution(async (services, inventory, commit, hash) =>
    {
        var changed = kind switch
        {
            "model" => inventory with { Request = inventory.Request with { ModelRevision = "foreign-model" } },
            "artifact" => inventory with { Request = inventory.Request with { CandidateSha256 = new string('f', 64) } },
            "schema" => inventory with { Request = inventory.Request with { SchemaSha256 = new string('f', 64) } },
            "recipe-operation" => inventory with { Recipes = inventory.Recipes.Select((x, i) => i == 0 ? x with { OperationId = Guid.NewGuid() } : x).ToArray() },
            "weeks" => inventory with { Weeks = inventory.Weeks.Skip(1).ToArray() },
            _ => inventory
        };
        if (kind == "source-content")
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            (await db.GroceryExtraOccurrences.FirstAsync()).Name = "New protected fact";
            await db.SaveChangesAsync();
        }
        var before = await DatabaseDigest(services);
        await Assert.ThrowsAnyAsync<Exception>(() => Execute(services, Rehash(changed), commit, hash));
        Assert.Equal(before, await DatabaseDigest(services));
    });

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData("plan")]
    [InlineData("protected-digest")]
    [InlineData("pruned-result")]
    public Task Executor_RejectsForeignCompletedProofWithoutReset(string kind) => WithExecution(async (services, inventory, commit, hash) =>
    {
        await Execute(services, inventory, commit, hash);
        var db = services.GetRequiredService<RecipeDbContext>(); db.ChangeTracker.Clear();
        var command = (await db.MaintenanceCommands.Where(x => x.CommandType == "canonical-recipe-migration-receipt-v1").ToArrayAsync())
            .First(x => JsonDocument.Parse(x.Payload).RootElement.GetProperty("phase").GetString() == "week");
        var result = System.Text.Json.Nodes.JsonNode.Parse(command.Result!)!;
        result[kind == "plan" ? "planId" : "protectedWeekSha256"] = kind == "plan" ? Guid.NewGuid().ToString("D") : new string('f', 64);
        command.Result = result.ToJsonString(); await db.SaveChangesAsync();
        if (kind == "pruned-result")
        {
            ((MigrationClock)services.GetRequiredService<IClock>()).UtcNow = DateTimeOffset.Parse("2027-01-01T16:00:00Z");
            await services.GetRequiredService<ManagementService>().PruneMaintenanceCommandsAsync();
        }
        var before = await DatabaseDigest(services);
        await Assert.ThrowsAsync<InvalidDataException>(() => Execute(services, inventory, commit, hash));
        Assert.Equal(before, await DatabaseDigest(services));
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Executor_RejectsForgedLaterHumanMutationOutcome() => WithExecution(async (services, inventory, commit, hash) =>
    {
        await Assert.ThrowsAsync<IOException>(() => Execute(services, inventory, commit, hash, new MigrationInterrupt("migration-week-committed")));
        var db = services.GetRequiredService<RecipeDbContext>();
        db.GroceryMutationOutcomes.Add(new GroceryMutationOutcome { Id = Guid.NewGuid(), InputHash = "forged", WeekStartDate = inventory.Weeks[0].WeekStart, Outcome = "{}" });
        await db.SaveChangesAsync();
        var before = await DatabaseDigest(services);
        await Assert.ThrowsAsync<InvalidDataException>(() => Execute(services, inventory, commit, hash));
        Assert.Equal(before, await DatabaseDigest(services));
    });

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData("quantity")]
    [InlineData("evidence")]
    [InlineData("reset-summary")]
    public Task Executor_CompletedWeekRejectsUnprovedDerivedDrift(string kind) => WithExecution(async (services, inventory, commit, hash) =>
    {
        await Execute(services, inventory, commit, hash);
        var db = services.GetRequiredService<RecipeDbContext>(); db.ChangeTracker.Clear();
        var plan = (await db.WeeklyPlans.ToArrayAsync()).First(x => x.GroceryItems != "[]");
        if (kind == "quantity")
        {
            var rows = System.Text.Json.Nodes.JsonNode.Parse(plan.GroceryItems)!;
            rows[0]!["displayName"] = "Forged demand";
            plan.GroceryItems = rows.ToJsonString();
        }
        else if (kind == "evidence") plan.GroceryDemandEvidence = "{}";
        else plan.GroceryResetSummaryVersion = new string('f', 32);
        await db.SaveChangesAsync();
        var before = await DatabaseDigest(services);
        await Assert.ThrowsAsync<InvalidDataException>(() => Execute(services, inventory, commit, hash));
        Assert.Equal(before, await DatabaseDigest(services));
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Executor_RejectsBaselineColumnOmissionAndRevertedConversionOutput() => WithExecution(async (services, inventory, commit, hash) =>
    {
        var table = inventory.Tables.Single(x => x.Name == "grocery_extra_occurrences");
        var row = table.Rows[0];
        var bad = row with { Columns = row.Columns.Select(x => x.Name == "name" ? row.Columns.First(c => c.Name != "name") : x).ToArray() };
        var forged = Rehash(inventory with { Tables = inventory.Tables.Select(x => x.Name == table.Name ? x with { Rows = table.Rows.Select(r => r.Key == row.Key ? bad : r).ToArray() } : x).ToArray() });
        var before = await DatabaseDigest(services);
        await Assert.ThrowsAsync<InvalidDataException>(() => Execute(services, forged, commit, hash));
        Assert.Equal(before, await DatabaseDigest(services));
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Executor_ConvertedOutputCannotBeReplacedWithItsOldBaseline() => WithExecution(async (services, inventory, commit, hash) =>
    {
        // Force the legacy selected operation to be the first committed recipe.
        var legacy = inventory.Recipes.Single(x => x.Status == "requires-forward-assessment");
        var changed = Rehash(inventory with { Recipes = inventory.Recipes.OrderBy(x => x.RecipeId == legacy.RecipeId ? 0 : 1).ToArray() });
        await Assert.ThrowsAsync<IOException>(() => Execute(services, changed, commit, hash, new MigrationInterrupt("migration-recipe-committed")));
        var db = services.GetRequiredService<RecipeDbContext>();
        await using var connection = new Npgsql.NpgsqlConnection(db.Database.GetConnectionString());
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        await new Npgsql.NpgsqlCommand("SET LOCAL session_replication_role=replica", connection, transaction).ExecuteNonQueryAsync();
        await using var revert = new Npgsql.NpgsqlCommand("UPDATE recipes SET canonical_content=NULL,food_mapping_evidence=NULL,ingredients='[\"⅓ cup flour\"]'::jsonb WHERE id=@id", connection, transaction);
        revert.Parameters.AddWithValue("id", legacy.RecipeId); await revert.ExecuteNonQueryAsync(); await transaction.CommitAsync();
        db.ChangeTracker.Clear(); var before = await DatabaseDigest(services);
        await Assert.ThrowsAsync<InvalidDataException>(() => Execute(services, changed, commit, hash));
        Assert.Equal(before, await DatabaseDigest(services));
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Executor_MutationHoldsExistingRecoveryWriteLease() => WithExecution(async (services, inventory, commit, hash) =>
    {
        var pause = new PauseMigration();
        var execution = Execute(services, inventory, commit, hash, pause);
        await pause.Entered.Task.WaitAsync(TimeSpan.FromSeconds(20));
        using var other = services.CreateScope();
        var waiting = other.ServiceProvider.GetRequiredService<RecoveryBoundary>().EnterAsync(RecoveryAccess.Snapshot, default);
        IAsyncDisposable? acquired = null;
        try
        {
            await Task.WhenAny(waiting, Task.Delay(250));
            Assert.False(waiting.IsCompleted, "Snapshot entered while migration mutation was in progress.");
        }
        finally
        {
            pause.Release.TrySetResult();
            if (waiting.IsCompletedSuccessfully) { acquired = await waiting; await acquired.DisposeAsync(); }
            await execution;
            if (acquired is null) await (await waiting).DisposeAsync();
        }
    });

    private sealed class PauseMigration : IRecoveryCheckpoint
    {
        public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public async Task ReachedAsync(string point, CancellationToken ct)
        { if (point == "migration-recipe-committed") { Entered.TrySetResult(); await Release.Task.WaitAsync(ct); } }
    }

    private static async Task CheckThroughOwner(IServiceProvider services, WeeklyPlan plan)
    {
        var marker = Path.Combine(services.GetRequiredService<RecipesRootResolver>().BaseRoot, ".maintenance-hold.json");
        var bytes = await File.ReadAllBytesAsync(marker);
        File.Delete(marker);
        try
        {
            var row = JsonDocument.Parse(plan.GroceryItems).RootElement[0];
            var presented = await services.GetRequiredService<GroceryPresentationService>().DecorateAsync(new RecipeApi.Dto.GroceryMutationResult(
                services.GetRequiredService<IClock>().UtcNow, plan.WeekStartDate, plan.GroceryListVersion,
                JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)!, JsonSerializer.Deserialize<List<RecipeApi.Dto.GroceryLineItemDto>>(plan.GroceryItems)!));
            await services.GetRequiredService<ScheduleService>().MutateGroceryItemAsync(0, new RecipeApi.Dto.GroceryItemMutationDto(
                row.GetProperty("rowId").GetGuid(), plan.WeekStartDate, row.GetProperty("rowVersion").GetString(), true, Guid.NewGuid(), presented.PresentationEpoch), reference: plan.WeekStartDate);
        }
        finally { await File.WriteAllBytesAsync(marker, bytes); }
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Executor_UnsupportedSelectionReturnsHonestReportWithZeroWrites() => WithExecution(async (services, inventory, commit, hash) =>
    {
        var before = await DatabaseDigest(services);
        var report = await Execute(services, inventory, commit, hash);
        Assert.False(report.Completed);
        Assert.Contains(report.Recipes, x => x.Outcome == "missing");
        Assert.Contains(report.Recipes, x => x.Outcome == "defer");
        Assert.Equal(before, await DatabaseDigest(services));
    }, includeUnsupported: true);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Executor_UnrepresentableInputDefersBeforeAnyRecipeOrReceiptWrite() => WithExecution(async (services, inventory, commit, hash) =>
    {
        var before = await DatabaseDigest(services);
        var report = await Execute(services, inventory, commit, hash);
        Assert.False(report.Completed);
        Assert.Contains(report.Recipes, x => x.Outcome == "deferred");
        Assert.Equal(before, await DatabaseDigest(services));
    }, unrepresentable: true);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Executor_DisposableOperatorCaptureExecuteAndArtifactRetryStayBoundToActualTarget() => WithExecution(async (services, inventory, commit, hash) =>
    {
        var roots = services.GetRequiredService<RecipesRootResolver>();
        var directory = Path.GetDirectoryName(roots.BaseRoot)!;
        var request = Path.Combine(directory, "operator-request.json");
        var captured = Path.Combine(directory, "operator-inventory.json");
        var report = Path.Combine(directory, "operator-result.json");
        await File.WriteAllTextAsync(request, JsonSerializer.Serialize(inventory.Request, new JsonSerializerOptions(JsonSerializerDefaults.Web)));
        string[] Args(string action, string input, string output) => ["--canonical-migration", action, "--input", input, "--output", output,
            "--candidate-commit", commit, "--marker-sha256", hash, "--disposable-database",
            new Npgsql.NpgsqlConnectionStringBuilder(services.GetRequiredService<RecipeDbContext>().Database.GetConnectionString()).Database!, "--recipes-root", roots.BaseRoot];
        Task<int> Run(string[] args) => (Task<int>)typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.CanonicalRecipeMigrationOperator")!
            .GetMethod("RunAsync", BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, [services, args, CancellationToken.None])!;
        var before = await DatabaseDigest(services);
        var bad = Args("capture", request, captured); bad[11] = "wfs_foreign_copy";
        Assert.Equal(2, await Run(bad)); Assert.Equal(before, await DatabaseDigest(services));
        Assert.Equal(0, await Run(Args("capture", request, captured)));
        Assert.Equal(before, await DatabaseDigest(services));
        Assert.Equal(0, await Run(Args("execute", captured, report)));
        Assert.True(JsonDocument.Parse(await File.ReadAllTextAsync(report)).RootElement.GetProperty("completed").GetBoolean());
        var final = await DatabaseDigest(services);
        Assert.Equal(2, await Run(Args("execute", captured, report)));
        Assert.Equal(final, await DatabaseDigest(services));
        Assert.Equal(0, await Run(Args("execute", captured, report + ".retry")));
        Assert.Equal(final, await DatabaseDigest(services));
        var command = new System.Diagnostics.ProcessStartInfo("dotnet") { RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false };
        command.ArgumentList.Add(typeof(RecoveryBoundary).Assembly.Location);
        foreach (var arg in Args("execute", captured, report + ".process")) command.ArgumentList.Add(arg);
        command.Environment["POSTGRES_CONNECTION_STRING"] = services.GetRequiredService<RecipeDbContext>().Database.GetConnectionString();
        command.Environment["RECIPES_ROOT"] = roots.BaseRoot;
        command.Environment["DataRoot"] = services.GetRequiredService<DataRootResolver>().Root;
        command.Environment["Recovery__BackupRoot"] = services.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>()["Recovery:BackupRoot"];
        command.Environment["WorkflowRoot"] = Path.Combine(directory, "must-not-bootstrap-workflows");
        command.Environment["Calendar__TimeZone"] = services.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>()["Calendar:TimeZone"];
        using var process = System.Diagnostics.Process.Start(command)!;
        var stdout = process.StandardOutput.ReadToEndAsync(); var stderr = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(60));
        Assert.True(process.ExitCode == 0, "Operator process failed: " + await stderr + await stdout);
        Assert.False(Directory.Exists(command.Environment["WorkflowRoot"]));
        Assert.Equal(final, await DatabaseDigest(services));
    });

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public Task Executor_FencesPreMigrationItemRequestEvenWhenDemandAndRowIdentityContinue(bool replay) => WithExecution(async (services, inventory, commit, hash) =>
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == new DateOnly(2026, 11, 9));
        var row = JsonDocument.Parse(plan.GroceryItems).RootElement[0];
        var view = await services.GetRequiredService<GroceryPresentationService>().DecorateAsync(new RecipeApi.Dto.GroceryMutationResult(
            services.GetRequiredService<IClock>().UtcNow, plan.WeekStartDate, plan.GroceryListVersion,
            JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)!, JsonSerializer.Deserialize<List<RecipeApi.Dto.GroceryLineItemDto>>(plan.GroceryItems)!));
        var acknowledged = await db.GroceryMutationOutcomes.AsNoTracking().SingleAsync(x => x.WeekStartDate == plan.WeekStartDate);
        var expectedVersion = replay ? (ulong.Parse(row.GetProperty("rowVersion").GetString()!) - 1).ToString(System.Globalization.CultureInfo.InvariantCulture) : row.GetProperty("rowVersion").GetString();
        var oldRequest = new RecipeApi.Dto.GroceryItemMutationDto(row.GetProperty("rowId").GetGuid(), plan.WeekStartDate,
            expectedVersion, true, replay ? acknowledged.Id : Guid.NewGuid(), view.PresentationEpoch);
        await Execute(services, inventory, commit, hash);
        var marker = Path.Combine(services.GetRequiredService<RecipesRootResolver>().BaseRoot, ".maintenance-hold.json");
        var bytes = await File.ReadAllBytesAsync(marker); File.Delete(marker);
        try
        {
            var before = await DatabaseDigest(services);
            var server = (Microsoft.AspNetCore.TestHost.TestServer)services.GetRequiredService<Microsoft.AspNetCore.Hosting.Server.IServer>();
            using var client = server.CreateClient(); client.DefaultRequestHeaders.Add("X-Hearth-Secret", RecipeApi.Tests.Infrastructure.TestWebApplicationFactory.TestSecret);
            using var response = await System.Net.Http.Json.HttpClientJsonExtensions.PatchAsJsonAsync(client,
                "/api/schedule/0/grocery/item?referenceWeekStartDate=" + plan.WeekStartDate.ToString("yyyy-MM-dd"), oldRequest);
            Assert.Equal(System.Net.HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal("epoch_conflict", JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("code").GetString());
            Assert.Equal(before, await DatabaseDigest(services));
        }
        finally { await File.WriteAllBytesAsync(marker, bytes); }
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Executor_RevokedMarkerWhileWaitingForWeekLockCannotResetOrRecordWeek() => WithExecution(async (services, inventory, commit, hash) =>
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        var monday = inventory.Weeks[0].WeekStart;
        await using var control = new Npgsql.NpgsqlConnection(db.Database.GetConnectionString()); await control.OpenAsync();
        await using var transaction = await control.BeginTransactionAsync();
        await new Npgsql.NpgsqlCommand($"SELECT pg_advisory_xact_lock(1464226631,{monday.DayNumber})", control, transaction).ExecuteNonQueryAsync();
        var execution = Execute(services, inventory, commit, hash);
        var marker = Path.Combine(services.GetRequiredService<RecipesRootResolver>().BaseRoot, ".maintenance-hold.json");
        var bytes = await File.ReadAllBytesAsync(marker);
        try
        {
            var deadline = DateTimeOffset.UtcNow.AddSeconds(15);
            while (!(bool)(await new Npgsql.NpgsqlCommand($"SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND classid=1464226631 AND objid={monday.DayNumber} AND NOT granted)", control, transaction).ExecuteScalarAsync())!)
            { Assert.True(DateTimeOffset.UtcNow < deadline, "Migration never waited for the owned week lock."); await Task.Delay(25); }
            await File.AppendAllTextAsync(marker, " "); await transaction.CommitAsync();
            await Assert.ThrowsAsync<RecoveryBusyException>(() => execution);
            Assert.Equal(1, await db.MaintenanceCommands.CountAsync(x => x.CommandType == "canonical-recipe-migration-receipt-v1"));
            Assert.DoesNotContain(await db.WeeklyPlans.AsNoTracking().ToArrayAsync(), x => x.GroceryResetSummaryVersion == inventory.Request.OperationId.ToString("N"));
        }
        finally { await File.WriteAllBytesAsync(marker, bytes); }
    });

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public Task Executor_LaterPartialOrEmptyBulkCheckMapSurvivesRetry(bool empty) => WithExecution(async (services, inventory, commit, hash) =>
    {
        await Execute(services, inventory, commit, hash);
        var db = services.GetRequiredService<RecipeDbContext>(); db.ChangeTracker.Clear();
        var plan = await db.WeeklyPlans.SingleAsync(x => x.WeekStartDate == new DateOnly(2026, 11, 9));
        var rows = JsonSerializer.Deserialize<List<RecipeApi.Dto.GroceryLineItemDto>>(plan.GroceryItems)!;
        Assert.True(rows.Count > 1);
        var view = await services.GetRequiredService<GroceryPresentationService>().DecorateAsync(new RecipeApi.Dto.GroceryMutationResult(
            services.GetRequiredService<IClock>().UtcNow, plan.WeekStartDate, plan.GroceryListVersion,
            JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)!, rows));
        var marker = Path.Combine(services.GetRequiredService<RecipesRootResolver>().BaseRoot, ".maintenance-hold.json");
        var bytes = await File.ReadAllBytesAsync(marker); File.Delete(marker);
        try { await services.GetRequiredService<ScheduleService>().MutateGroceryBulkAsync(0, new RecipeApi.Dto.GroceryBulkMutationDto(
            plan.WeekStartDate, plan.GroceryListVersion, empty ? [] : new() { [rows[0].RowId!] = true }, Guid.NewGuid(), view.PresentationEpoch), reference: plan.WeekStartDate); }
        finally { await File.WriteAllBytesAsync(marker, bytes); }
        var before = await DatabaseDigest(services);
        await Execute(services, inventory, commit, hash);
        Assert.Equal(before, await DatabaseDigest(services));
    });

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData("content")]
    [InlineData("source")]
    [InlineData("original-fields")]
    public Task Executor_SelectedFactMismatchStopsBeforePlanOrEpochWrite(string field) => WithExecution(async (services, inventory, commit, hash) =>
    {
        var changed = Rehash(inventory with { Recipes = inventory.Recipes.Select((x, i) => i != 0 ? x : field switch
        {
            "content" => x with { ContentRevision = "foreign-revision" },
            "source" => x with { SourceRevision = "foreign-source" },
            _ => x with { OriginalFieldsSha256 = new string('f', 64) }
        }).ToArray() });
        var before = await DatabaseDigest(services);
        await Assert.ThrowsAnyAsync<Exception>(() => Execute(services, changed, commit, hash));
        Assert.Equal(before, await DatabaseDigest(services));
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Executor_NormalizesActualPersistedTimestampPrecision() => WithExecution(async (services, inventory, commit, hash) =>
    {
        ((MigrationClock)services.GetRequiredService<IClock>()).UtcNow += TimeSpan.FromTicks(1);
        Assert.True((await Execute(services, inventory, commit, hash)).Completed);
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Executor_CanonicalNoOpPreservesRetainedLegacyShadow() => WithExecution(async (services, inventory, commit, hash) =>
    {
        Assert.True((await Execute(services, inventory, commit, hash)).Completed);
        var id = inventory.Recipes.Single(x => x.Status == "observed-canonical").RecipeId;
        Assert.Null((await services.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).Ingredients);
    }, canonicalShadowMismatch: true);

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public Task Executor_ResumesUsingTheCapturedBusinessDate(bool partial) => WithExecution(async (services, inventory, commit, hash) =>
    {
        if (partial) await Assert.ThrowsAsync<IOException>(() => Execute(services, inventory, commit, hash, new MigrationInterrupt("migration-week-committed")));
        ((MigrationClock)services.GetRequiredService<IClock>()).UtcNow = DateTimeOffset.Parse("2027-03-01T16:00:00Z");
        await Execute(services, inventory, commit, hash);
        var plan = await services.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == new DateOnly(2027, 2, 8));
        var row = JsonSerializer.Deserialize<List<RecipeApi.Dto.GroceryLineItemDto>>(plan.GroceryItems)!.Single();
        Assert.Equal("1", row.ExactQuantity!.Value!.N); Assert.Equal("12", row.ExactQuantity.Value.D);
        Assert.Equal(await AsOfVersion(services, plan.WeekStartDate, new(2026, 11, 13)), plan.ServingInputVersion);
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Executor_MidnightCannotLabelOldDemandWithNewServingInputs() => WithExecution(async (services, inventory, commit, hash) =>
    {
        await Execute(services, inventory, commit, hash, new AdvanceAfterFourthRecompute((MigrationClock)services.GetRequiredService<IClock>()));
        var plan = await services.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == new DateOnly(2027, 2, 8));
        Assert.Equal(await AsOfVersion(services, plan.WeekStartDate, new(2026, 11, 13)), plan.ServingInputVersion);
        Assert.Equal(plan.ServingInputVersion, plan.ServingAppliedVersion);
    });

    private static async Task<string> AsOfVersion(IServiceProvider services, DateOnly monday, DateOnly today)
    {
        var owner = typeof(ScheduleService).Assembly.GetType("RecipeApi.Services.SupperProjectionInputs")!;
        var task = (Task)owner.GetMethod("ReadWeekAsync", BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null,
            [services.GetRequiredService<RecipeDbContext>(), monday, today, CancellationToken.None])!;
        await task;
        return (string)owner.GetMethod("WeekVersion", BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, [task.GetType().GetProperty("Result")!.GetValue(task)])!;
    }
    private sealed class AdvanceAfterFourthRecompute(MigrationClock clock) : IRecoveryCheckpoint
    {
        private int recomputes;
        public Task ReachedAsync(string point, CancellationToken ct)
        {
            if (point == "migration-week-recomputed" && ++recomputes == 4) clock.UtcNow = DateTimeOffset.Parse("2027-03-01T16:00:00Z");
            return Task.CompletedTask;
        }
    }

    private static CanonicalMigrationInventory Rehash(CanonicalMigrationInventory inventory)
    {
        var json = JsonSerializer.Serialize(inventory with { ObservationSha256 = "" }, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var normalized = (string)typeof(CanonicalRecipeContentStore).GetMethod("NormalizeJson", BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, [json])!;
        return inventory with { ObservationSha256 = Convert.ToHexStringLower(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(normalized))) };
    }

    private sealed class MigrationClock : IClock { public DateTimeOffset UtcNow { get; set; } = DateTimeOffset.Parse("2026-11-13T16:00:00Z"); }

    private async Task WithExecution(Func<IServiceProvider, CanonicalMigrationInventory, string, string, Task> check, bool includeUnsupported = false, bool unrepresentable = false, bool canonicalShadowMismatch = false,
        [System.Runtime.CompilerServices.CallerMemberName] string scenario = "") => await WithFixture(async (services, request, root, backup) =>
    {
        var assembly = Convert.ToHexStringLower(SHA256.HashData(await File.ReadAllBytesAsync(typeof(RecoveryBoundary).Assembly.Location)));
        var commit = new string('a', 40);
        var marker = Path.Combine(services.GetRequiredService<RecipesRootResolver>().BaseRoot, ".maintenance-hold.json");
        await File.WriteAllTextAsync(marker, JsonSerializer.Serialize(new { version = 1, operationId = request.OperationId, candidate = commit,
            createdAt = DateTimeOffset.UtcNow, apiImage = "sha256:" + assembly, databaseContainer = new string('d', 64) }));
        var markerHash = Convert.ToHexStringLower(SHA256.HashData(await File.ReadAllBytesAsync(marker)));
        var observed = await Capture(services, request);
        var supported = observed.Recipes.Where(x => x.Status is "observed-canonical" or "requires-forward-assessment").Select(x => x.RecipeId).ToHashSet();
        request = request with { CandidateSha256 = assembly, Selected = request.Selected.Where(x => includeUnsupported || supported.Contains(x.RecipeId)).ToArray() };
        var inventory = await Capture(services, request, admitted: true);
        await check(services, inventory, commit, markerHash);
        var db = services.GetRequiredService<RecipeDbContext>();
        output.WriteLine("MIGRATION-REHEARSAL " + JsonSerializer.Serialize(new { scenario, candidateCommit = commit, inventory,
            finalDatabaseSha256 = await DatabaseDigest(services), finalSchemaSha256 = await SchemaSha256(services),
            finalFiles = FileDigest(root, backup), liveReceipts = await db.MaintenanceCommands.AsNoTracking().Where(x => x.CommandType == "canonical-recipe-migration-receipt-v1").ToArrayAsync(),
            retainedCommands = await db.MaintenanceCommandLifecycleRecords.AsNoTracking().ToArrayAsync() }, new JsonSerializerOptions(JsonSerializerDefaults.Web)));
    }, unrepresentable, canonicalShadowMismatch);

    private static Task<CanonicalMigrationExecutionReport> Execute(IServiceProvider services, CanonicalMigrationInventory inventory, string commit, string markerHash, IRecoveryCheckpoint? checkpoint = null)
    {
        var boundary = services.GetRequiredService<RecoveryBoundary>();
        return boundary.RunMaintenanceAsync(inventory.Request.OperationId, commit, markerHash, async ct =>
        {
            try
            {
                return await (Task<CanonicalMigrationExecutionReport>)typeof(CanonicalRecipeContentStore).GetMethod("ExecuteMigrationAsync", BindingFlags.Instance | BindingFlags.NonPublic)!
                    .Invoke(services.GetRequiredService<CanonicalRecipeContentStore>(), [inventory, commit, services.GetRequiredService<RecoverySnapshotService>(),
                        boundary, services.GetRequiredService<RecipesRootResolver>(), services.GetRequiredService<GroceryRecomputeService>(), checkpoint, ct])!;
            }
            catch (TargetInvocationException error) when (error.InnerException is not null) { ExceptionDispatchInfo.Capture(error.InnerException).Throw(); }
            throw new InvalidOperationException("Unreachable invocation result.");
        });
    }

    private static void AssertProtectedTables(CanonicalMigrationInventory before, CanonicalMigrationInventory after)
    {
        foreach (var table in new[] { "calendar_events", "supper_servings", "grocery_extra_occurrences", "household_food_overrides", "ingredient_categories", "workflow_instances", "workflow_tasks", "recipe_file_publications" })
            Assert.Equal(before.Tables.Single(x => x.Name == table).Sha256, after.Tables.Single(x => x.Name == table).Sha256);
    }

    private sealed class MigrationInterrupt(string point) : IRecoveryCheckpoint
    {
        public Task ReachedAsync(string name, CancellationToken ct)
        { if (name == point) throw new IOException("Controlled migration interruption"); return Task.CompletedTask; }
    }
}
