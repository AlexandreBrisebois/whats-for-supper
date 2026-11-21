using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using RecipeApi.Services.Ai;
using RecipeApi.Workflow;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class WorkflowLaunchIntentTests
{
    [Fact]
    public async Task ManualService_LostReplyCannotCertifyWorkWithoutItsOriginalAcceptanceReceipt()
    {
        var options = new DbContextOptionsBuilder<RecipeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options;
        await using var db = new ReceiptLossContext(options);
        var storage = new InMemoryStorageProvider();
        var recipe = new Recipe { Id = Guid.NewGuid(), SourceUrl = "https://example.invalid/original" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        await storage.SaveAsync("workflows", "url-import.yaml", Definition);
        await new RecipeRepository(storage).SaveInfoAsync(new RecipeInfo { Id = recipe.Id, SourceUrl = recipe.SourceUrl }, default);
        var clock = new SystemClock();
        var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db,
            TestPublicationStore.Create(db, storage, clock));

        await Assert.ThrowsAsync<InvalidDataException>(() => new RecipeImportService(db, orchestrator).TriggerImport(recipe.Id));

        await using var read = new RecipeDbContext(options);
        Assert.Single(await read.WorkflowInstances.ToListAsync());
        Assert.Null((await read.WorkflowLaunchIntents.SingleAsync()).AcceptedAt);
    }

    private sealed class ReceiptLossContext(DbContextOptions<RecipeDbContext> options) : RecipeDbContext(options)
    {
        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var launching = ChangeTracker.Entries<WorkflowInstance>().Any(x => x.State == EntityState.Added);
            var result = await base.SaveChangesAsync(cancellationToken);
            if (launching)
            {
                await using var corrupt = new RecipeDbContext(options);
                (await corrupt.WorkflowLaunchIntents.SingleAsync(cancellationToken)).AcceptedAt = null;
                await corrupt.SaveChangesAsync(cancellationToken);
                throw new IOException("Synthetic lost reply with inconsistent persisted receipt");
            }
            return result;
        }
    }

    [Fact]
    public Task Worker_ReconcilesGenericOriginalBeforeDispatch() => CheckWorkerRecoveryAsync(
        builder => builder.UseInMemoryDatabase(Guid.NewGuid().ToString()));

    internal static async Task CheckWorkerRecoveryAsync(Action<DbContextOptionsBuilder> configure)
    {
        var builder = new DbContextOptionsBuilder<RecipeDbContext>();
        configure(builder);
        var options = builder.ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options;
        var clock = new SystemClock();
        var storage = new InMemoryStorageProvider();
        await storage.SaveAsync("workflows", "generic.yaml", """
            name: generic
            parameters: [original]
            tasks:
              - name: probe
                processor: LaunchProbe
                payload:
                  original: "{{original}}"
            """);
        await using (var rejected = new RejectAcceptanceContext(options))
        {
            var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), rejected,
                TestPublicationStore.Create(rejected, storage, clock));
            await Assert.ThrowsAsync<IOException>(() => orchestrator.TriggerAsync("generic", new() { ["original"] = "retained" }, clock.UtcNow.AddMinutes(-1)));
        }
        await storage.SaveAsync("workflows", "generic.yaml", "invalid: [");
        var invoked = 0;
        var probe = new Mock<IWorkflowProcessor>();
        probe.SetupGet(x => x.ProcessorName).Returns("LaunchProbe");
        probe.Setup(x => x.ExecuteAsync(It.IsAny<WorkflowTask>(), It.IsAny<CancellationToken>()))
            .Returns(async (WorkflowTask task, CancellationToken ct) =>
            {
                await using var read = new RecipeDbContext(options);
                var intent = await read.WorkflowLaunchIntents.AsNoTracking().SingleAsync(ct);
                Assert.NotNull(intent.AcceptedAt);
                Assert.Equal(intent.Id, task.InstanceId);
                Assert.Contains("retained", task.Payload);
                invoked++;
                return new { original = "retained", observed = true };
            });
        var services = new ServiceCollection();
        services.AddScoped(_ => new RecipeDbContext(options));
        services.AddSingleton(probe.Object);
        services.AddScoped<IWorkflowOrchestrator>(sp =>
        {
            var db = sp.GetRequiredService<RecipeDbContext>();
            return new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db, TestPublicationStore.Create(db, storage, clock));
        });
        await using var provider = services.BuildServiceProvider();
        using var worker = new WorkflowWorker(clock, provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<WorkflowWorker>.Instance, new AiExceptionHandler(clock, NullLogger<AiExceptionHandler>.Instance),
            Options.Create(new WorkflowRetryOptions()));

        Assert.Equal(1, await worker.ProcessPendingTasksAsync(default));
        Assert.Equal(0, await worker.ProcessPendingTasksAsync(default));

        Assert.Equal(1, invoked);
        await using var final = new RecipeDbContext(options);
        var saved = await final.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleAsync();
        Assert.Equal(WorkflowStatus.Completed, saved.Status);
        Assert.Contains("observed", Assert.Single(saved.Tasks).Result);
        Assert.Single(await final.WorkflowLaunchIntents.AsNoTracking().ToListAsync());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Restart_ReconcilesPreparedOriginal_WithoutReadingTodaysDefinitionOrSource(bool recoveredHousehold)
    {
        var options = new DbContextOptionsBuilder<RecipeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options;
        var storage = new InMemoryStorageProvider();
        var clock = new SystemClock();
        var recipe = new Recipe { Id = Guid.NewGuid(), SourceUrl = "https://example.invalid/original" };
        var id = Guid.NewGuid();
        string prepared;
        await using (var db = new RejectAcceptanceContext(options))
        {
            db.Recipes.Add(recipe);
            await db.SaveChangesAsync();
            await storage.SaveAsync("workflows", "url-import.yaml", Definition);
            await new RecipeRepository(storage).SaveInfoAsync(new RecipeInfo { Id = recipe.Id, SourceUrl = recipe.SourceUrl }, default);
            var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db,
                TestPublicationStore.Create(db, storage, clock));
            await Assert.ThrowsAsync<IOException>(() => orchestrator.TriggerImportAsync(id, recipe.Id, "url-import",
                new() { ["recipeId"] = recipe.Id.ToString(), ["url"] = recipe.SourceUrl }));
            var intent = await db.WorkflowLaunchIntents.AsNoTracking().SingleAsync();
            prepared = Assert.IsType<string>(intent.Prepared);
            Assert.Null(intent.AcceptedAt);
            // Failed tracked writes cannot leak through a subsequent unrelated save.
            recipe.SourceUrl = "https://example.invalid/new";
            await db.SaveChangesAsync();
            Assert.Empty(await db.WorkflowInstances.AsNoTracking().ToListAsync());
        }
        await storage.SaveAsync("workflows", "url-import.yaml", "invalid: [");
        await using var restarted = new RecipeDbContext(options);
        if (recoveredHousehold)
        {
            restarted.RecoveryPublications.Add(new RecoveryPublication { OperationId = Guid.NewGuid(), SnapshotId = Guid.NewGuid() });
            await restarted.SaveChangesAsync();
        }
        IWorkflowOrchestrator recovery = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), restarted,
            TestPublicationStore.Create(restarted, storage, clock));

        Assert.Equal(recoveredHousehold ? 0 : 1, await recovery.ReconcileLaunchesAsync());
        Assert.Equal(0, await recovery.ReconcileLaunchesAsync());

        var retained = await restarted.WorkflowLaunchIntents.AsNoTracking().SingleAsync();
        Assert.Equal(prepared, retained.Prepared);
        if (recoveredHousehold)
        {
            Assert.Null(retained.AcceptedAt);
            Assert.Empty(await restarted.WorkflowInstances.ToListAsync());
            return;
        }
        Assert.NotNull(retained.AcceptedAt);
        var accepted = await restarted.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleAsync();
        Assert.Contains("https://example.invalid/original", accepted.Parameters);
        Assert.Single(accepted.Tasks);
    }

    private sealed class RejectAcceptanceContext(DbContextOptions<RecipeDbContext> options) : RecipeDbContext(options)
    {
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            if (ChangeTracker.Entries<WorkflowInstance>().Any(x => x.State == EntityState.Added))
                throw new IOException("Synthetic acceptance failure");
            return base.SaveChangesAsync(cancellationToken);
        }
    }

    [Fact]
    public async Task MissingDefinition_RetainsOriginalManualRequest_AndNeverRecapturesOnRetry()
    {
        await using var db = TestDbContextFactory.Create();
        var storage = new InMemoryStorageProvider();
        var recipe = new Recipe { Id = Guid.NewGuid(), SourceUrl = "https://example.invalid/original" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var clock = new SystemClock();
        var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db,
            TestPublicationStore.Create(db, storage, clock));
        var id = Guid.NewGuid();
        var parameters = new Dictionary<string, string> { ["recipeId"] = recipe.Id.ToString(), ["url"] = recipe.SourceUrl };

        Assert.NotNull(await Record.ExceptionAsync(() => orchestrator.TriggerImportAsync(id, recipe.Id, "url-import", parameters)));

        var type = db.Model.FindEntityType("RecipeApi.Models.WorkflowLaunchIntent");
        Assert.NotNull(type);
        var intent = await db.FindAsync(type.ClrType, id);
        Assert.NotNull(intent);
        var entry = db.Entry(intent);
        var request = Assert.IsType<string>(entry.Property("Request").CurrentValue);
        Assert.Contains("https://example.invalid/original", request);
        Assert.Null(entry.Property("Prepared").CurrentValue);
        Assert.Null(entry.Property("AcceptedAt").CurrentValue);
        Assert.Empty(await db.WorkflowInstances.ToListAsync());
        await storage.SaveAsync("workflows", "url-import.yaml", Definition);
        await new RecipeRepository(storage).SaveInfoAsync(new RecipeInfo { Id = recipe.Id, SourceUrl = recipe.SourceUrl }, default);

        await Assert.ThrowsAsync<InvalidDataException>(() => orchestrator.TriggerImportAsync(id, recipe.Id, "url-import", parameters));

        Assert.Empty(await db.WorkflowInstances.ToListAsync());
        Assert.Null(entry.Property("Prepared").CurrentValue);
        Assert.Equal(request, entry.Property("Request").CurrentValue);
    }

    [Fact]
    public async Task AcceptedManualReplay_UsesOriginalGraph_AndRejectsChangedCommand()
    {
        await using var db = TestDbContextFactory.Create();
        var storage = new InMemoryStorageProvider();
        var recipe = new Recipe { Id = Guid.NewGuid(), SourceUrl = "https://example.invalid/original" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        await storage.SaveAsync("workflows", "url-import.yaml", Definition);
        await new RecipeRepository(storage).SaveInfoAsync(new RecipeInfo { Id = recipe.Id, SourceUrl = recipe.SourceUrl }, default);
        var clock = new SystemClock();
        var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db,
            TestPublicationStore.Create(db, storage, clock));
        var id = Guid.NewGuid();
        var parameters = new Dictionary<string, string> { ["recipeId"] = recipe.Id.ToString(), ["url"] = recipe.SourceUrl };
        var accepted = await orchestrator.TriggerImportAsync(id, recipe.Id, "url-import", parameters);
        var originalCapture = accepted.RecipePublicationCapture;
        var originalTask = Assert.Single(accepted.Tasks).TaskId;
        await storage.SaveAsync("workflows", "url-import.yaml", "invalid: [");

        var replay = await orchestrator.TriggerImportAsync(id, recipe.Id, "url-import", parameters);

        Assert.Equal(originalCapture, replay.RecipePublicationCapture);
        Assert.Equal(originalTask, Assert.Single(replay.Tasks).TaskId);
        parameters["url"] = "https://example.invalid/changed";
        await Assert.ThrowsAsync<InvalidDataException>(() => orchestrator.TriggerImportAsync(id, recipe.Id, "url-import", parameters));
        Assert.Single(await db.WorkflowInstances.ToListAsync());
    }

    private const string Definition = """
        name: url-import
        parameters: [recipeId, url]
        tasks:
          - name: fetch
            processor: FetchUrlContent
            payload:
              recipeId: "{{recipeId}}"
        """;
}
