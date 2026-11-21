using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Services.Ai;
using RecipeApi.Workflow;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class RecipeReportRepairIntentTests
{
    [Fact]
    public Task FeedbackCommit_FreezesOriginalDefinitionBeforeLaterDefinitionChanges() => CheckFrozenDefinitionAsync();

    internal static async Task CheckFrozenDefinitionAsync(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        await using var fixture = await Fixture.Create(configure);
        fixture.Db.AfterFeedbackSave = async () =>
        {
            await using var read = fixture.ReadContext();
            var report = await read.RecipeImportReports.AsNoTracking().SingleAsync();
            var intent = await read.RecipeRepairIntents.AsNoTracking().SingleAsync();
            Assert.Equal(intent.Id, report.RepairIntentId);
            Assert.Contains("Original feedback", intent.Payload);
            Assert.Contains("original-extraction", intent.Payload);
            Assert.Empty(await read.WorkflowInstances.ToListAsync());
            await fixture.Storage.SaveAsync("workflows", "url-import.yaml", "invalid: [");
        };
        var response = await fixture.Submit();
        Assert.True(response.ReimportStarted);
        Assert.Equal("original-extraction", (await fixture.Db.WorkflowTasks.SingleAsync()).TaskName);
    }

    [Fact]
    public Task CrashAfterFeedbackCommit_RetryUsesOriginalCommandAndBaseline() => CheckCrashRetryAsync();

    internal static async Task CheckCrashRetryAsync(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        await using var fixture = await Fixture.Create(configure);
        fixture.Db.AfterFeedbackSave = () => throw new IOException("Synthetic process death after feedback commit");
        await Assert.ThrowsAsync<IOException>(() => fixture.Submit());
        fixture.Db.ChangeTracker.Clear();
        await fixture.Storage.SaveAsync("workflows", "url-import.yaml", "invalid: [");
        var recipe = await fixture.Db.Recipes.SingleAsync();
        recipe.SourceUrl = "https://example.invalid/changed";
        await fixture.Db.SaveChangesAsync();
        var response = await fixture.Submit();
        Assert.True(response.ReimportStarted);
        var workflow = await fixture.Db.WorkflowInstances.SingleAsync();
        Assert.Contains("https://example.invalid/original", workflow.Parameters);
        Assert.DoesNotContain("https://example.invalid/changed", workflow.Parameters);
        Assert.Equal("original-extraction", (await fixture.Db.WorkflowTasks.SingleAsync()).TaskName);
    }

    [Fact]
    public Task FailedOriginalCapture_UnchangedRetryCannotAcquireFreshAuthority() => CheckFailedCaptureAsync();

    internal static async Task CheckFailedCaptureAsync(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        await using var fixture = await Fixture.Create(configure);
        await fixture.Storage.SaveAsync("workflows", "url-import.yaml", "invalid: [");
        Assert.True((await fixture.Submit()).ReimportLaunchFailed);
        var original = await fixture.Db.RecipeRepairIntents.AsNoTracking().SingleAsync();
        await fixture.SaveDefinition();
        Assert.Equal(0, await fixture.Pickup());
        var retry = await fixture.Submit();
        Assert.False(retry.ReimportStarted);
        Assert.True(retry.ReimportLaunchFailed);
        Assert.Empty(await fixture.Db.WorkflowInstances.ToListAsync());
        var retained = await fixture.Db.RecipeRepairIntents.AsNoTracking().SingleAsync();
        Assert.Equal(original.Payload, retained.Payload);
        Assert.Equal(original.InputHash, retained.InputHash);
        // Changed feedback is a new request, allowed to capture a new command.
        Assert.True((await fixture.Submit("Changed feedback")).ReimportStarted);
        Assert.Equal(2, await fixture.Db.RecipeRepairIntents.CountAsync());
    }

    [Fact]
    public Task WorkerPickup_ReconcilesCommittedFeedbackWithoutAnotherSubmission() => CheckWorkerReconciliationAsync();

    internal static async Task CheckWorkerReconciliationAsync(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        await using var fixture = await Fixture.Create(configure);
        fixture.Db.AfterFeedbackSave = () => throw new IOException("Synthetic process death");
        await Assert.ThrowsAsync<IOException>(() => fixture.Submit());
        fixture.Db.ChangeTracker.Clear();
        await fixture.Storage.SaveAsync("workflows", "url-import.yaml", "invalid: [");
        Assert.Equal(1, await fixture.Pickup());
        var report = await fixture.Db.RecipeImportReports.AsNoTracking().SingleAsync();
        var workflow = await fixture.Db.WorkflowInstances.AsNoTracking().SingleAsync();
        Assert.Equal(workflow.Id, report.LastWorkflowInstanceId);
        Assert.Equal(RecipeImportReportStatus.Reimporting, report.Status);
        Assert.Equal(RecipeApi.Models.TaskStatus.Completed, (await fixture.Db.WorkflowTasks.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(0, await fixture.Pickup());
        Assert.Single(await fixture.Db.WorkflowInstances.ToListAsync());
    }

    [Fact]
    public Task HistoricalFeedbackWithoutCapture_UnchangedSaveNeverBuildsTodaysCommand() => CheckHistoricalFeedbackAsync();

    internal static async Task CheckHistoricalFeedbackAsync(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        await using var fixture = await Fixture.Create(configure);
        fixture.Db.RecipeImportReports.Add(new RecipeImportReport
        {
            RecipeId = fixture.RecipeId, Reasons = ["ingredients"], Note = "Original feedback",
            CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
        });
        await fixture.Db.SaveChangesAsync();
        Assert.True((await fixture.Submit()).ReimportLaunchFailed);
        Assert.Empty(await fixture.Db.WorkflowInstances.ToListAsync());
    }

    [Fact]
    public async Task LostAcknowledgement_DivergentCommittedTaskIsNotAnAcceptedOriginalCommand()
    {
        await using var fixture = await Fixture.Create();
        fixture.Db.AfterLaunchSave = async () =>
        {
            await using var read = fixture.ReadContext();
            var task = await read.WorkflowTasks.SingleAsync();
            task.Payload = "{\"changed\":true}";
            await read.SaveChangesAsync();
            throw new IOException("Synthetic lost acknowledgement after unrelated task divergence");
        };
        await Assert.ThrowsAsync<InvalidDataException>(() => fixture.Submit());
        await using var observer = fixture.ReadContext();
        Assert.Single(await observer.WorkflowInstances.ToListAsync());
        Assert.Equal("{\"changed\":true}", (await observer.WorkflowTasks.SingleAsync()).Payload);
        Assert.NotNull((await observer.RecipeImportReports.SingleAsync()).LastWorkflowInstanceId);
    }

    [Fact]
    public Task OriginalUrlCommand_CannotCaptureAChangedSourceAsItsBaseline() => CheckChangedSourceAsync();

    internal static async Task CheckChangedSourceAsync(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        await using var fixture = await Fixture.Create(configure);
        var recipe = await fixture.Db.Recipes.SingleAsync();
        recipe.SourceUrl = "https://example.invalid/changed";
        await fixture.Db.SaveChangesAsync();
        var clock = new SystemClock();
        var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(fixture.Storage), fixture.Db,
            TestPublicationStore.Create(fixture.Db, fixture.Storage, clock));
        await Assert.ThrowsAsync<InvalidDataException>(() => orchestrator.PrepareReportAsync(Guid.NewGuid(), "url-import",
            new() { ["recipeId"] = fixture.RecipeId.ToString(), ["url"] = "https://example.invalid/original",
                ["repairReasons"] = "ingredients", ["repairNote"] = "Original feedback" }));
        Assert.Empty(await fixture.Db.WorkflowInstances.ToListAsync());
    }

    [Fact]
    public async Task WorkerPickup_DoesNotRewriteIndependentFailureWithoutAnAttempt()
    {
        await using var fixture = await Fixture.Create();
        fixture.Db.AfterFeedbackSave = () => throw new IOException("Synthetic process death");
        await Assert.ThrowsAsync<IOException>(() => fixture.Submit());
        fixture.Db.ChangeTracker.Clear();
        var report = await fixture.Db.RecipeImportReports.SingleAsync();
        report.Status = RecipeImportReportStatus.ReimportFailed;
        report.LastError = "Independent failure disposition";
        await fixture.Db.SaveChangesAsync();
        Assert.Equal(0, await fixture.Pickup());
        var saved = await fixture.Db.RecipeImportReports.AsNoTracking().SingleAsync();
        Assert.Equal(RecipeImportReportStatus.ReimportFailed, saved.Status);
        Assert.Equal("Independent failure disposition", saved.LastError);
        Assert.Empty(await fixture.Db.WorkflowInstances.ToListAsync());
    }

    private sealed class Fixture : IAsyncDisposable
    {
        public required ObservingContext Db { get; init; }
        public InMemoryStorageProvider Storage { get; } = new();
        private RecipeImportReportService Service = null!;
        public Guid RecipeId;
        private Guid MemberId;
        private DbContextOptions<RecipeDbContext> Options = null!;
        public static async Task<Fixture> Create(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
        {
            var builder = new DbContextOptionsBuilder<RecipeDbContext>();
            if (configure is null) builder.UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning));
            else configure(builder);
            var options = builder.Options;
            var fixture = new Fixture { Db = new ObservingContext(options), Options = options, RecipeId = Guid.NewGuid(), MemberId = Guid.NewGuid() };
            fixture.Db.FamilyMembers.Add(new FamilyMember { Id = fixture.MemberId, Name = "Synthetic member" });
            fixture.Db.Recipes.Add(new Recipe { Id = fixture.RecipeId, Name = "Original", SourceUrl = "https://example.invalid/original" });
            await fixture.Db.SaveChangesAsync();
            await new RecipeRepository(fixture.Storage).SaveInfoAsync(new RecipeInfo { Id = fixture.RecipeId, SourceUrl = "https://example.invalid/original" }, default);
            await fixture.SaveDefinition();
            var clock = new SystemClock();
            fixture.Service = new RecipeImportReportService(clock, fixture.Db,
                new WorkflowOrchestrator(clock, new WorkflowRepository(fixture.Storage), fixture.Db, TestPublicationStore.Create(fixture.Db, fixture.Storage, clock)));
            return fixture;
        }
        public Task SaveDefinition() => Storage.SaveAsync("workflows", "url-import.yaml", """
            name: url-import
            parameters: [recipeId, url, repairReasons?, repairNote?]
            tasks:
              - name: original-extraction
                processor: ExtractRecipe
                payload:
                  recipeId: "{{recipeId}}"
            """);
        public Task<RecipeApi.Dto.RecipeImportReportSubmissionResponseDto> Submit(string note = "Original feedback") =>
            Service.SubmitAsync(RecipeId, MemberId, new() { Reasons = ["ingredients"], Note = note });
        public RecipeDbContext ReadContext() => new(Options);
        public async Task<int> Pickup()
        {
            var clock = new SystemClock();
            var services = new ServiceCollection();
            services.AddScoped(_ => new RecipeDbContext(Options));
            services.AddScoped<IWorkflowOrchestrator>(sp =>
            {
                var db = sp.GetRequiredService<RecipeDbContext>();
                return new WorkflowOrchestrator(clock, new WorkflowRepository(Storage), db, TestPublicationStore.Create(db, Storage, clock));
            });
            services.AddScoped(sp => new RecipeImportReportService(clock, sp.GetRequiredService<RecipeDbContext>(), sp.GetRequiredService<IWorkflowOrchestrator>()));
            services.AddSingleton<IWorkflowProcessor>(new Probe());
            await using var provider = services.BuildServiceProvider();
            using var worker = new WorkflowWorker(clock, provider.GetRequiredService<IServiceScopeFactory>(),
                NullLogger<WorkflowWorker>.Instance, new AiExceptionHandler(clock, NullLogger<AiExceptionHandler>.Instance),
                Microsoft.Extensions.Options.Options.Create(new WorkflowRetryOptions()));
            return await worker.ProcessPendingTasksAsync(default);
        }
        private sealed class Probe : IWorkflowProcessor
        {
            public string ProcessorName => "ExtractRecipe";
            public Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct) => Task.FromResult<object?>(new { Synthetic = true });
        }
        public ValueTask DisposeAsync() => Db.DisposeAsync();
    }

    private sealed class ObservingContext(DbContextOptions<RecipeDbContext> options) : RecipeDbContext(options)
    {
        public Func<Task>? AfterFeedbackSave { get; set; }
        public Func<Task>? AfterLaunchSave { get; set; }
        public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
        {
            var launch = ChangeTracker.Entries<WorkflowInstance>().Any(x => x.State == EntityState.Added);
            var feedback = ChangeTracker.Entries<RecipeImportReport>().Any(x => x.State is EntityState.Added or EntityState.Modified)
                && !ChangeTracker.Entries<WorkflowInstance>().Any(x => x.State == EntityState.Added);
            var result = await base.SaveChangesAsync(ct);
            if (launch && AfterLaunchSave is { } afterLaunch) { AfterLaunchSave = null; await afterLaunch(); }
            if (feedback && AfterFeedbackSave is { } callback) { AfterFeedbackSave = null; await callback(); }
            return result;
        }
    }
}
