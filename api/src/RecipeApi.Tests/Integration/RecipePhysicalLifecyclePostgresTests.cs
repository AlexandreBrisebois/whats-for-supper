using System.Data.Common;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

[Collection("ElevatedActionsPin")]
public sealed class RecipePhysicalLifecyclePostgresTests(ITestOutputHelper output) : IDisposable
{
    private readonly string? initialPin = Environment.GetEnvironmentVariable("ELEVATED_ACTIONS_PIN");

    public void Dispose() => Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", initialPin);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Purge_RetainsIndependentOriginalJournalsAndPhysicalReceiptBeforeCascade() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var root = scope.ServiceProvider.GetRequiredService<RecipesRootResolver>();
            var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Disposable retired recipe", Notes = "private original",
                Rating = RecipeRating.Love, DeletedAt = DateTimeOffset.UtcNow, CreatedAt = DateTimeOffset.UtcNow };
            var publication = new RecipeFilePublication { RecipeId = recipe.Id, OperationId = Guid.NewGuid(),
                Payload = "{\"original\":\"pending, not a receipt\"}", InputHash = "original-input", ResultHash = "original-result", Delivered = false };
            var canonical = new CanonicalRecipeOperation { RecipeId = recipe.Id, OperationId = Guid.NewGuid(),
                InputHash = "original-canonical", Result = "{\"humanClear\":null}" };
            db.Recipes.Add(recipe); db.RecipeFilePublications.Add(publication); db.CanonicalRecipeOperations.Add(canonical);
            await db.SaveChangesAsync();
            var directory = Path.Combine(root.Root, recipe.Id.ToString());
            Directory.CreateDirectory(directory); await File.WriteAllTextAsync(Path.Combine(directory, "recipe.json"), "original files");
            Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", "physical-test");
            try { Assert.Equal(PurgeResult.Success, await scope.ServiceProvider.GetRequiredService<RecipePurgeService>().PurgeAsync(recipe.Id, "physical-test")); }
            finally { Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", null); }
            Assert.False(Directory.Exists(directory));
            db.ChangeTracker.Clear();
            Assert.False(await db.Recipes.IgnoreQueryFilters().AnyAsync(x => x.Id == recipe.Id));
            Assert.Empty(await db.RecipeFilePublications.ToArrayAsync());
            Assert.Empty(await db.CanonicalRecipeOperations.ToArrayAsync());
            var connection = db.Database.GetDbConnection(); await connection.OpenAsync();
            await using var exists = connection.CreateCommand();
            exists.CommandText = "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='recipe_physical_deletions'";
            Assert.Equal(1L, await exists.ExecuteScalarAsync());
            await using var read = connection.CreateCommand();
            read.CommandText = "SELECT row_to_json(t)::text FROM recipe_physical_deletions t";
            using var saved = JsonDocument.Parse((string)(await read.ExecuteScalarAsync())!);
            Assert.Equal(recipe.Id, saved.RootElement.GetProperty("recipe_id").GetGuid());
            Assert.Equal("purge", saved.RootElement.GetProperty("kind").GetString());
            Assert.NotEqual(JsonValueKind.Null, saved.RootElement.GetProperty("completed_at").ValueKind);
            var payload = saved.RootElement.GetProperty("payload");
            Assert.Equal("private original", payload.GetProperty("recipe").GetProperty("notes").GetString());
            Assert.Equal("love", payload.GetProperty("recipe").GetProperty("rating").GetString());
            var retainedPublication = Assert.Single(payload.GetProperty("publications").EnumerateArray());
            Assert.Equal(publication.OperationId, retainedPublication.GetProperty("operationId").GetGuid());
            Assert.False(retainedPublication.GetProperty("delivered").GetBoolean());
            JsonEqual(publication.Payload, retainedPublication.GetProperty("payload").GetString()!);
            var retainedCanonical = Assert.Single(payload.GetProperty("canonicalOperations").EnumerateArray());
            Assert.Equal(canonical.OperationId, retainedCanonical.GetProperty("operationId").GetGuid());
            JsonEqual(canonical.Result, retainedCanonical.GetProperty("result").GetString()!);
            Assert.Equal("inert", payload.GetProperty("historyDisposition").GetString());
            await using var duplicate = connection.CreateCommand();
            duplicate.CommandText = "INSERT INTO recipe_physical_deletions SELECT gen_random_uuid(), operation_id, kind, payload, payload_hash, recipe_hash, files_removed, created_at, files_delivered_at, completed_at FROM recipe_physical_deletions";
            Assert.Equal("23505", (await Assert.ThrowsAsync<Npgsql.PostgresException>(() => duplicate.ExecuteNonQueryAsync())).SqlState);
        });
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task FailedDatabaseRemoval_RetainsPendingIntentAndRejectsNewFilesOnOriginalRetry() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await RecipeApi.Tests.Infrastructure.TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
            {
                ["Tests:PostgresConnectionString"] = settings.ConnectionString, ["Tests:LocalRecipeStore"] = "true"
            });
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Disposable retry" };
            db.Recipes.Add(recipe); await db.SaveChangesAsync();
            var root = scope.ServiceProvider.GetRequiredService<RecipesRootResolver>();
            var directory = Path.Combine(root.Root, recipe.Id.ToString()); Directory.CreateDirectory(directory);
            await File.WriteAllTextAsync(Path.Combine(directory, "original.txt"), "captured original");
            await db.Database.ExecuteSqlRawAsync("CREATE FUNCTION fail_physical_intent() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic intent failure'; END $$; CREATE TRIGGER fail_physical_intent BEFORE INSERT ON recipe_physical_deletions FOR EACH ROW EXECUTE FUNCTION fail_physical_intent()");
            await Assert.ThrowsAsync<DbUpdateException>(() => scope.ServiceProvider.GetRequiredService<RecipeService>().DeleteRecipe(recipe.Id));
            Assert.Equal("captured original", await File.ReadAllTextAsync(Path.Combine(directory, "original.txt")));
            Assert.Empty(await db.RecipePhysicalDeletions.AsNoTracking().ToArrayAsync());
            await db.Database.ExecuteSqlRawAsync("DROP TRIGGER fail_physical_intent ON recipe_physical_deletions");
            await db.Database.ExecuteSqlRawAsync("CREATE FUNCTION fail_physical_removal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic removal failure'; END $$; CREATE TRIGGER fail_physical_removal BEFORE DELETE ON recipes FOR EACH ROW EXECUTE FUNCTION fail_physical_removal()");
            var service = scope.ServiceProvider.GetRequiredService<RecipeService>();
            await Assert.ThrowsAsync<DbUpdateException>(() => service.DeleteRecipe(recipe.Id));
            var pending = await db.RecipePhysicalDeletions.AsNoTracking().SingleAsync();
            Assert.Null(pending.CompletedAt); Assert.NotNull(pending.FilesDeliveredAt); Assert.Null(pending.FilesRemoved);
            Assert.False(Directory.Exists(directory));
            db.FamilySettings.Add(new FamilySetting { Key = "unrelated", Value = JsonSerializer.SerializeToElement("preserved") });
            await db.SaveChangesAsync();
            Assert.True(await db.Recipes.AsNoTracking().AnyAsync(x => x.Id == recipe.Id));
            Assert.Null((await db.RecipePhysicalDeletions.AsNoTracking().SingleAsync()).CompletedAt);
            await Assert.ThrowsAsync<RecoveryBusyException>(() => scope.ServiceProvider.GetRequiredService<RecipeFilePublicationStore>().CaptureAsync(recipe.Id));
            await Assert.ThrowsAsync<RecoveryBusyException>(() => scope.ServiceProvider.GetRequiredService<ManagementService>().BackupAsync());
            await db.Database.ExecuteSqlRawAsync("DROP TRIGGER fail_physical_removal ON recipes");
            Directory.CreateDirectory(directory);
            await File.WriteAllTextAsync(Path.Combine(directory, "new-human-file.txt"), "must survive");
            await Assert.ThrowsAsync<InvalidDataException>(() => service.DeleteRecipe(recipe.Id));
            Assert.Equal("must survive", await File.ReadAllTextAsync(Path.Combine(directory, "new-human-file.txt")));
            Assert.Null((await db.RecipePhysicalDeletions.AsNoTracking().SingleAsync()).CompletedAt);
            // Only this test's introduced file is removed to exercise a valid absent retry.
            File.Delete(Path.Combine(directory, "new-human-file.txt")); Directory.Delete(directory);
            await service.DeleteRecipe(recipe.Id);
            db.ChangeTracker.Clear();
            var receipt = await db.RecipePhysicalDeletions.SingleAsync();
            Assert.Equal(pending.OperationId, receipt.OperationId); Assert.Equal(pending.PayloadHash, receipt.PayloadHash);
            Assert.NotNull(receipt.CompletedAt);
            Assert.False(await db.Recipes.IgnoreQueryFilters().AnyAsync(x => x.Id == recipe.Id));
            await Assert.ThrowsAsync<RecoveryBusyException>(() => scope.ServiceProvider.GetRequiredService<RecipeFilePublicationStore>().CaptureNewAsync(recipe.Id));
            Assert.False(Directory.Exists(directory));
        });



    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task LostCommitAcknowledgements_ReconcileOriginalIntentDeliveryAndRemovalIndependently()
    {
        foreach (var phase in new[] { 1, 2, 3 })
            await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
            {
                await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
                var lost = new LostCommit { FailAt = phase };
                var options = new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).AddInterceptors(lost).Options;
                await using var db = new RecipeDbContext(options);
                var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Disposable lost acknowledgement", DeletedAt = DateTimeOffset.UtcNow };
                db.Recipes.Add(recipe); await db.SaveChangesAsync();
                var root = factory.Services.GetRequiredService<RecipesRootResolver>();
                var directory = Path.Combine(root.Root, recipe.Id.ToString()); Directory.CreateDirectory(directory);
                await File.WriteAllTextAsync(Path.Combine(directory, "retained.txt"), "original");
                var service = new RecipePurgeService(db, root, NullLogger<RecipePurgeService>.Instance);
                Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", "physical-test");
                try
                {
                    await Assert.ThrowsAsync<IOException>(() => service.PurgeAsync(recipe.Id, "physical-test"));
                    await using var read = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).Options);
                    var observed = await read.RecipePhysicalDeletions.SingleAsync();
                    Assert.Equal(phase < 3, await read.Recipes.IgnoreQueryFilters().AnyAsync(x => x.Id == recipe.Id));
                    Assert.Equal(phase == 1, Directory.Exists(directory));
                    Assert.Equal(phase >= 2, observed.FilesDeliveredAt.HasValue);
                    Assert.Equal(phase == 3, observed.CompletedAt.HasValue);
                    db.FamilySettings.Add(new FamilySetting { Key = "unrelated", Value = JsonSerializer.SerializeToElement("preserved") });
                    await db.SaveChangesAsync();
                    Assert.Equal(phase < 3, await read.Recipes.IgnoreQueryFilters().AnyAsync(x => x.Id == recipe.Id));
                    Assert.Equal(phase == 3 ? PurgeResult.NotFound : PurgeResult.Success, await service.PurgeAsync(recipe.Id, "physical-test"));
                    read.ChangeTracker.Clear(); var receipt = await read.RecipePhysicalDeletions.SingleAsync();
                    Assert.Equal(observed.OperationId, receipt.OperationId); Assert.Equal(observed.PayloadHash, receipt.PayloadHash);
                    Assert.NotNull(receipt.CompletedAt); Assert.False(Directory.Exists(directory));
                    Assert.True(receipt.FilesRemoved);
                }
                finally { Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", null); }
            });
    }


    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task OriginalIntent_RejectsLaterHumanReportWithoutRecapturingOrDeletingFiles() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            var lost = new LostCommit { FailAt = 1 };
            await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).AddInterceptors(lost).Options);
            var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Disposable protected history", DeletedAt = DateTimeOffset.UtcNow };
            db.Recipes.Add(recipe); await db.SaveChangesAsync();
            // Seed independently so arming the acknowledgement loss covers only the retirement transaction.
            await using (var seed = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).Options))
            {
                seed.RecipeImportReports.Add(new RecipeImportReport { RecipeId = recipe.Id, Reasons = ["steps"], Note = "original", CreatedAt = DateTimeOffset.UtcNow });
                await seed.SaveChangesAsync();
            }
            var root = factory.Services.GetRequiredService<RecipesRootResolver>();
            var directory = Path.Combine(root.Root, recipe.Id.ToString()); Directory.CreateDirectory(directory);
            await File.WriteAllTextAsync(Path.Combine(directory, "original.txt"), "must survive");
            var service = new RecipePurgeService(db, root, NullLogger<RecipePurgeService>.Instance);
            Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", "physical-test");
            try
            {
                await Assert.ThrowsAsync<IOException>(() => service.PurgeAsync(recipe.Id, "physical-test"));
                var original = await db.RecipePhysicalDeletions.AsNoTracking().SingleAsync();
                var report = await db.RecipeImportReports.SingleAsync(); report.Note = "new human report"; await db.SaveChangesAsync();
                // A concurrent test's process-wide PIN change returns before history
                // validation. Prove that path separately on the same pending intent.
                Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", "pdf-qualification-pin");
                var denied = await service.PurgeAsync(recipe.Id, "physical-test");
                Assert.Equal(PurgeResult.Forbidden, denied);
                Assert.Equal("must survive", await File.ReadAllTextAsync(Path.Combine(directory, "original.txt")));
                var deniedIntent = await db.RecipePhysicalDeletions.AsNoTracking().SingleAsync();
                Assert.Equal(original.PayloadHash, deniedIntent.PayloadHash);
                Assert.Null(deniedIntent.FilesDeliveredAt);
                Assert.Null(deniedIntent.CompletedAt);
                output.WriteLine("Foreign PIN control returned Forbidden with the pending intent and source intact.");
                Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", "physical-test");
                await Assert.ThrowsAsync<InvalidDataException>(() => service.PurgeAsync(recipe.Id, "physical-test"));
                output.WriteLine("Restored PIN control reached InvalidDataException for the later human report.");
                Assert.Equal("must survive", await File.ReadAllTextAsync(Path.Combine(directory, "original.txt")));
                var pending = await db.RecipePhysicalDeletions.AsNoTracking().SingleAsync();
                Assert.Equal(original.PayloadHash, pending.PayloadHash); Assert.Null(pending.FilesDeliveredAt); Assert.Null(pending.CompletedAt);
                Assert.Equal("new human report", (await db.RecipeImportReports.AsNoTracking().SingleAsync()).Note);
            }
            finally { Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", null); }
        });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PendingPhysicalIntent_BlocksSnapshotAndExactStoragePublication() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var backup = Path.Combine(Path.GetTempPath(), "wfs-physical-backup-" + Guid.NewGuid().ToString("N"));
            try
            {
                await using var factory = await RecipeApi.Tests.Infrastructure.TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
                {
                    ["Tests:PostgresConnectionString"] = settings.ConnectionString, ["Tests:LocalRecipeStore"] = "true", ["Recovery:BackupRoot"] = backup
                });
                using var scope = factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Disposable snapshot", IsSynthesized = true, DeletedAt = DateTimeOffset.UtcNow };
                db.Recipes.Add(recipe); await db.SaveChangesAsync();
                var recovery = scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>();
                var snapshot = await recovery.CaptureAsync(default);
                var root = scope.ServiceProvider.GetRequiredService<RecipesRootResolver>();
                var lost = new LostCommit { FailAt = 1 };
                await using var deleting = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).AddInterceptors(lost).Options);
                Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", "physical-test");
                try { await Assert.ThrowsAsync<IOException>(() => new RecipePurgeService(deleting, root, NullLogger<RecipePurgeService>.Instance).PurgeAsync(recipe.Id, "physical-test")); }
                finally { Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", null); }
                await Assert.ThrowsAsync<RecoveryBusyException>(() => recovery.CaptureAsync(default));
                await Assert.ThrowsAsync<RecoveryBusyException>(() => recovery.RestoreExactAsync(snapshot.SnapshotId!.Value, default));
                Assert.Null(root.Generation);
                Assert.True(await db.Recipes.IgnoreQueryFilters().AnyAsync(x => x.Id == recipe.Id));
                Assert.Null((await db.RecipePhysicalDeletions.AsNoTracking().SingleAsync()).FilesDeliveredAt);
            }
            finally { if (Directory.Exists(backup)) Directory.Delete(backup, true); }
        });


    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task FinalRollbackAfterSave_ReloadsDetachedRecipeAndDependenciesBeforeUnrelatedSave() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            var fail = new BeforeCommit();
            await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).AddInterceptors(fail).Options);
            var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Disposable final rollback", DeletedAt = DateTimeOffset.UtcNow };
            db.Recipes.Add(recipe);
            var calendar = new CalendarEvent { Id = Guid.NewGuid(), RecipeId = recipe.Id, Date = new DateOnly(2026, 11, 1), MealSlot = 0, Status = CalendarEventStatus.Cooked };
            db.CalendarEvents.Add(calendar); await db.SaveChangesAsync();
            var root = factory.Services.GetRequiredService<RecipesRootResolver>();
            var directory = Path.Combine(root.Root, recipe.Id.ToString()); Directory.CreateDirectory(directory);
            await File.WriteAllTextAsync(Path.Combine(directory, "original.txt"), "captured");
            var service = new RecipePurgeService(db, root, NullLogger<RecipePurgeService>.Instance);
            fail.Armed = true;
            Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", "physical-test");
            try
            {
                await Assert.ThrowsAsync<IOException>(() => service.PurgeAsync(recipe.Id, "physical-test"));
                db.FamilySettings.Add(new FamilySetting { Key = "unrelated", Value = JsonSerializer.SerializeToElement("preserved") });
                await db.SaveChangesAsync();
                await using var read = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).Options);
                Assert.True(await read.Recipes.IgnoreQueryFilters().AnyAsync(x => x.Id == recipe.Id));
                Assert.True(await read.CalendarEvents.AnyAsync(x => x.Id == calendar.Id));
                var pending = await read.RecipePhysicalDeletions.SingleAsync();
                Assert.NotNull(pending.FilesDeliveredAt); Assert.Null(pending.CompletedAt); Assert.False(Directory.Exists(directory));
                Assert.Equal(PurgeResult.Success, await service.PurgeAsync(recipe.Id, "physical-test"));
                read.ChangeTracker.Clear(); var receipt = await read.RecipePhysicalDeletions.SingleAsync();
                Assert.Equal(pending.OperationId, receipt.OperationId); Assert.Equal(pending.FilesDeliveredAt, receipt.FilesDeliveredAt);
                Assert.NotNull(receipt.CompletedAt); Assert.Empty(await read.CalendarEvents.ToArrayAsync());
            }
            finally { Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", null); }
        });

    private sealed class BeforeCommit : DbTransactionInterceptor
    {
        internal bool Armed;
        private int commits;
        public override ValueTask<InterceptionResult> TransactionCommittingAsync(DbTransaction transaction, TransactionEventData eventData,
            InterceptionResult result, CancellationToken cancellationToken = default)
        {
            if (Armed && ++commits == 3) { Armed = false; throw new IOException("Synthetic final commit rollback after SaveChanges"); }
            return ValueTask.FromResult(result);
        }
    }

    private sealed class LostCommit : DbTransactionInterceptor
    {
        internal int FailAt;
        private int commits;
        public override Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
        {
            if (++commits == FailAt) throw new IOException("Synthetic lost physical commit acknowledgement");
            return Task.CompletedTask;
        }
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PublicationStage_DrainsBeforeRetirementAndLateCandidatesCannotRecreateFiles() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await RecipeApi.Tests.Infrastructure.TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
            {
                ["Tests:PostgresConnectionString"] = settings.ConnectionString, ["Tests:LocalRecipeStore"] = "true"
            });
            using var publishing = factory.Services.CreateScope(); using var deleting = factory.Services.CreateScope();
            var db = publishing.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Original" };
            db.Recipes.Add(recipe); await db.SaveChangesAsync();
            var storage = new StageBarrier(publishing.ServiceProvider.GetRequiredService<IStorageProvider>());
            var repository = new RecipeRepository(storage);
            await repository.SaveInfoAsync(new RecipeInfo { Id = recipe.Id, Name = "Original" }, default);
            var store = new RecipeFilePublicationStore(db, repository, publishing.ServiceProvider.GetRequiredService<IClock>(), publishing.ServiceProvider.GetRequiredService<SupperProjectionInvalidation>());
            var capture = await store.CaptureAsync(recipe.Id);
            var operation = Guid.NewGuid();
            var candidate = new RecipePublicationCandidate("{\"name\":\"Published\",\"recipeIngredient\":[\"salt\"]}", new RecipeInfo { Id = recipe.Id, Name = "Published" });
            var publish = store.PublishAsync(capture, candidate, operation);
            await storage.Reached.Task.WaitAsync(TimeSpan.FromSeconds(10));
            var remove = deleting.ServiceProvider.GetRequiredService<RecipeService>().DeleteRecipe(recipe.Id);
            try { Assert.NotSame(remove, await Task.WhenAny(remove, Task.Delay(150))); }
            finally
            {
                storage.Release.TrySetResult();
                try { await publish.WaitAsync(TimeSpan.FromSeconds(15)); }
                catch (RecoveryBusyException) { /* Retirement may win the subsequent delivery lock. */ }
                await remove.WaitAsync(TimeSpan.FromSeconds(15));
            }
            var root = factory.Services.GetRequiredService<RecipesRootResolver>();
            var directory = Path.Combine(root.Root, recipe.Id.ToString());
            Assert.False(Directory.Exists(directory));
            var receipt = await db.RecipePhysicalDeletions.AsNoTracking().SingleAsync();
            using var saved = JsonDocument.Parse(receipt.Payload);
            Assert.Equal(operation, Assert.Single(saved.RootElement.GetProperty("publications").EnumerateArray()).GetProperty("operationId").GetGuid());
            Assert.NotEmpty(saved.RootElement.GetProperty("physicalCapture").GetProperty("stagedJournals").EnumerateObject());
            await Assert.ThrowsAsync<RecoveryBusyException>(() => store.PublishAsync(capture, candidate, Guid.NewGuid()));
            Assert.False(Directory.Exists(directory));
        });

    private sealed class StageBarrier(IStorageProvider inner) : IStorageProvider
    {
        internal readonly TaskCompletionSource Reached = new(TaskCreationOptions.RunContinuationsAsynchronously);
        internal readonly TaskCompletionSource Release = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public async Task SaveAtomicallyAsync(string partition, string key, byte[] value)
        {
            await inner.SaveAtomicallyAsync(partition, key, value);
            if (key.Contains("/.publications/", StringComparison.Ordinal)) { Reached.TrySetResult(); await Release.Task; }
        }
        public Task SaveAsync(string partition, string key, string value) => inner.SaveAsync(partition, key, value);
        public Task SaveAsync(string partition, string key, byte[] value) => inner.SaveAsync(partition, key, value);
        public Task<byte[]?> LoadAsync(string partition, string key) => inner.LoadAsync(partition, key);
        public Task DeleteAtomicallyAsync(string partition, string key) => inner.DeleteAtomicallyAsync(partition, key);
        public Task<List<KeyValuePair<string, string>>> FindAsync(string partition, string key) => inner.FindAsync(partition, key);
        public List<string> List(string partition) => inner.List(partition);
    }

    private static void JsonEqual(string expected, string actual)
    {
        using var a = JsonDocument.Parse(expected); using var b = JsonDocument.Parse(actual);
        Assert.True(JsonElement.DeepEquals(a.RootElement, b.RootElement));
    }
}
